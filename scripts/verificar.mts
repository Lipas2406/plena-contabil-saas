// Smoke test temporário. Roda a regra pura, sem LLM e sem chave de API.
import { readFileSync } from "node:fs";
import { consultarVencimentos } from "@/dominio/ia/ferramentas/consultar-vencimentos";
import { classificarDocumento } from "@/dominio/ia/ferramentas/classificar-documento";
import { listarObrigacoes } from "@/dominio/mocks/obrigacoes";
import {
  aplicarEncerramento,
  listarProcessosDoCliente,
} from "@/dominio/armazenamento-processos";
import { listarProcessos as listarProcessosDoEscritorio } from "@/dominio/mocks/processos";
import { progressoDoProcesso } from "@/dominio/tipos";
import { CLIENTES, cadastroIncompleto } from "@/dominio/mocks/clientes";
import { avisosDoCliente } from "@/dominio/avisos";
import {
  fundirCliente,
  proximoId,
  type EdicaoClienteEntrada,
} from "@/dominio/armazenamento-clientes";
import { hojeISO } from "@/kernel/datas";
import { formatarTelefone, formatarCNPJ, formatarBRL, mesmoTextoBR } from "@/kernel/br";


let falhas = 0;
const checar = (nome: string, ok: boolean) => {
  if (!ok) falhas++;
  console.log(`${ok ? "OK  " : "FALHA"} ${nome}`);
};

// A graça do padrão: chamo `.puro` direto, sem tocar no framework.
const r = await consultarVencimentos.puro({ cnpj: "31.845.220/0001-88" });
checar("acha cliente por CNPJ com máscara", r.encontrado === true);
if (r.encontrado) {
  // Cliente sem NENHUMA obrigação cadastrada é o caso normal desta carteira,
  // não uma borda rara: a maioria está em abertura ou regularização. O que a
  // ferramenta não pode fazer é estourar, devolver `undefined` ou somar
  // "R$ NaN". Zero é resposta legítima e precisa sair formatada.
  checar("cliente sem obrigações não quebra", r.resumo.quantidadeEmAberto === 0);
  // `mesmoTextoBR` e não `===`: o Intl em pt-BR separa "R$" do número com
  // espaço NÃO separável (U+00A0), então a comparação literal falha por um
  // caractere invisível. Já queimou tempo antes, não repetir.
  checar("total zerado sai formatado", mesmoTextoBR(r.resumo.totalEmAberto, "R$ 0,00"));
  checar("lista vazia, não undefined", Array.isArray(r.obrigacoes));
  checar("regime não optante chega ao retorno", r.cliente.regime === "Não optante");
  console.log("   resumo:", r.resumo);
}

const inexistente = await consultarVencimentos.puro({ cnpj: "00000000000000" });
checar("CNPJ inexistente devolve objeto, não exceção", inexistente.encontrado === false);

const casos: [string, string, boolean][] = [
  ["Recibo hotel Ibis hospedagem 2 diarias R$ 1.240,00", "Despesa de viagem", false],
  ["NF papelaria resma papel A4 toner impressora R$ 389,90", "Material de escritório", false],
  ["Guia DARF IRPJ competencia 07/2026 R$ 2.184,60", "Imposto e taxa", false],
  ["asdkjh qwe zxc", "Não identificado", true],
];
for (const [texto, esperado, revisao] of casos) {
  const c = classificarDocumento.puro({ texto });
  checar(`classifica "${texto.slice(0, 30)}..." como ${esperado}`, c.categoria === esperado);
  checar(`  revisao humana = ${revisao}`, c.requerRevisaoHumana === revisao);
}

// Acento normalizado nos dois sentidos.
checar(
  "acento não muda o resultado",
  classificarDocumento.puro({ texto: "diária de hotel" }).categoria ===
    classificarDocumento.puro({ texto: "diaria de hotel" }).categoria,
);
checar(
  "dedup de termos na justificativa",
  !classificarDocumento.puro({ texto: "diária diaria hotel" }).justificativa.includes("diaria, diaria"),
);

const hoje = hojeISO();
const incoerentes = listarObrigacoes().filter(
  (o) =>
    (o.status === "atrasado" && o.vencimento >= hoje) ||
    (o.status === "a-vencer" && o.vencimento <= hoje) ||
    (o.status === "vence-hoje" && o.vencimento !== hoje),
);
checar("nenhum status incoerente com a data", incoerentes.length === 0);

checar("formatarTelefone celular", formatarTelefone("11988776655") === "(11) 98877-6655");
checar("formatarTelefone fixo", formatarTelefone("1133224455") === "(11) 3322-4455");
checar("formatarCNPJ", formatarCNPJ("11222333000181") === "11.222.333/0001-81");
// Comparado com mesmoTextoBR de propósito: o Intl usa U+00A0 e a igualdade
// direta falha por causa de um caractere invisível.
checar("formatarBRL centavos", mesmoTextoBR(formatarBRL(124000), "R$ 1.240,00"));

/* ------------------------------------------------------------------
   Avisos do painel do cliente.

   Cobre o que a tela sozinha não cobre: a sessão é fixa num cliente só
   (`sessao.ts`), então abrir o navegador testa um caminho de cada vez.
   Aqui os três ramos rodam juntos, sem subir servidor.
   ------------------------------------------------------------------ */
const porId = (id: string) => {
  const c = CLIENTES.find((x) => x.id === id);
  if (!c) throw new Error(`cliente ${id} sumiu do mock`);
  return c;
};
const avisosDe = async (id: string) =>
  avisosDoCliente(porId(id), await listarProcessosDoCliente(id));

// cli-001 tem etapa bloqueada (PGFN esperando as declarações em atraso).
const avisosMarcio = await avisosDe("cli-001");
const travada = avisosMarcio.find((a) => a.id.startsWith("travada-"));
checar("etapa bloqueada vira aviso crítico", travada?.tom === "critico");
checar(
  "aviso de etapa travada leva o MOTIVO, não só o rótulo",
  Boolean(travada && travada.descricao.length > 0),
);
checar("aviso de etapa travada aponta para #processos", travada?.href === "#processos");

// cli-003 tem cadastro incompleto e nenhuma etapa bloqueada.
const avisosEdilaine = await avisosDe("cli-003");
const cadastro = avisosEdilaine.find((a) => a.id === "cadastro");
checar("cadastro incompleto vira aviso", cadastro !== undefined);
checar("aviso de cadastro aponta para #cadastro", cadastro?.href === "#cadastro");
checar(
  "cadastro incompleto lista os campos que faltam",
  Boolean(cadastro?.descricao.includes("CNPJ")),
);

// Um aviso de cadastro por cliente, nunca um por campo: o contrário vira ruído
// e esconde o que importa.
checar(
  "no máximo 1 aviso de cadastro por cliente",
  avisosEdilaine.filter((a) => a.id === "cadastro").length === 1,
);

// Nenhum aviso pode nascer sem destino: o painel usa href para navegar.
const todosOsAvisos = (await Promise.all(CLIENTES.map((c) => avisosDe(c.id)))).flat();
checar(
  "todo aviso tem href de âncora",
  todosOsAvisos.every((a) => a.href.startsWith("#")),
);
checar(
  "todo aviso tem título e descrição preenchidos",
  todosOsAvisos.every((a) => a.titulo.length > 0 && a.descricao.length > 0),
);
// Id repetido quebraria a key do React e sumiria com aviso na tela.
// `.every` com callback async devolveria Promise (sempre truthy) e o teste
// passaria sem testar. Resolve tudo antes e verifica em cima do resultado.
const idsPorCliente = await Promise.all(
  CLIENTES.map(async (c) => (await avisosDe(c.id)).map((a) => a.id)),
);
checar(
  "ids de aviso são únicos por cliente",
  idsPorCliente.every((ids) => new Set(ids).size === ids.length),
);
console.log(`   avisos derivados na carteira inteira: ${todosOsAvisos.length}`);

// ---------------------------------------------------------------------------
// Honestidade da demonstração (item 0.5 do Cenário 0, 02/08/2026).
//
// A carteira veio da contadora com quase tudo em branco. Estas checagens
// existem para que o sistema NUNCA preencha lacuna por conta própria: o risco
// não é a tela ficar pobre, é ela afirmar algo errado sobre cliente real e
// derrubar a confiança na demonstração inteira.
// ---------------------------------------------------------------------------

// Ela não informou contato de ninguém. Se aparecer e-mail ou telefone aqui,
// alguém inventou ou vazou dado real, e os dois são problema.
checar(
  "nenhum cliente da carteira tem e-mail ou telefone preenchido",
  CLIENTES.every((c) => c.email === null && c.telefone === null),
);

// Nenhum valor em dinheiro foi informado. Dinheiro é o campo que o cliente
// confere em dois segundos, e errar ali contamina o resto da tela.
checar(
  "nenhum cliente tem data de início inventada",
  CLIENTES.every((c) => c.clienteDesde === null),
);

// Só um dos seis tinha CNPJ. Os outros estão em abertura ou não informaram.
const comCNPJ = CLIENTES.filter((c) => c.cnpj !== null);
checar("exatamente 1 cliente tem CNPJ, como na carteira real", comCNPJ.length === 1);

// O CNPJ da demo tem dígito verificador quebrado de propósito: assim ele não
// existe e não colide com empresa nenhuma. Conferido por cálculo, não por fé.
const dvCNPJ = (base: string) => {
  const soma = [...base]
    .reverse()
    .reduce((s, d, i) => s + Number(d) * ((i % 8) + 2), 0);
  const r = soma % 11;
  return r < 2 ? "0" : String(11 - r);
};
checar(
  "o CNPJ da demo é inválido de propósito (não é de ninguém)",
  comCNPJ.every((c) => {
    const n = c.cnpj!.replace(/\D/g, "");
    const d1 = dvCNPJ(n.slice(0, 12));
    return n.slice(12) !== d1 + dvCNPJ(n.slice(0, 12) + d1);
  }),
);

// Lacuna se guarda como `null`, nunca como texto sentinela. "Não informado"
// gravado no campo vira mentira no dado: some da lista de lacunas, obriga a
// tela a comparar string mágica e some do aviso de cadastro incompleto.
const SENTINELAS = ["não informado", "nao informado", "n/a", "-", "--", "a informar"];
checar(
  "nenhum campo de texto guarda sentinela no lugar de null",
  CLIENTES.every((c) =>
    [c.razaoSocial, c.nomeFantasia, c.atividade, c.responsavel].every(
      (v) => v === null || !SENTINELAS.includes(v.trim().toLowerCase()),
    ),
  ),
);

// A razão social que falta tem que aparecer como lacuna, senão a tela deixa de
// ser formulário de coleta justamente onde a carteira mandou puxar dado.
const semRazaoSocial = CLIENTES.filter(
  (c) => c.tipoPessoa === "PJ" && !c.razaoSocial,
);
checar(
  "razão social ausente entra no cadastro incompleto",
  semRazaoSocial.every((c) => cadastroIncompleto(c).includes("razão social")),
);
console.log(`   clientes PJ sem razão social: ${semRazaoSocial.length}`);

// Pessoa física não tem regime tributário. `null` é o único valor honesto.
checar(
  "cliente PF não tem regime tributário",
  CLIENTES.filter((c) => c.tipoPessoa === "PF").every((c) => c.regime === null),
);

// O status das etapas é estimativa: ela passou o escopo, não o ponto de parada.
// Nenhuma pode nascer confirmada, senão o aviso "a confirmar" some da tela e o
// chute passa a se apresentar como fato.
const todasAsEtapas = (
  await Promise.all(
    CLIENTES.map(async (c) =>
      (await listarProcessosDoCliente(c.id)).flatMap((p) => p.etapas),
    ),
  )
).flat();
checar(
  "nenhuma etapa do seed nasce com status confirmado",
  todasAsEtapas.every((e) => e.statusConfirmado !== true),
);
const afirmamAndamento = todasAsEtapas.filter((e) => e.status !== "nao-iniciada");
checar(
  "toda etapa que afirma andamento está marcada como a confirmar",
  afirmamAndamento.every((e) => !e.statusConfirmado),
);
console.log(
  `   etapas: ${todasAsEtapas.length} no total, ${afirmamAndamento.length} afirmam andamento e pedem confirmação`,
);

// ---------------------------------------------------------------------------
// Edição de cadastro (02/08/2026).
//
// A tela aponta o que falta em cada cliente; até hoje não havia onde digitar.
// O risco desta função não é falhar, é APAGAR: a contadora completa uma lacuna
// de cada vez, conforme o cliente responde, e um formulário parcial não pode
// levar embora o que já estava gravado.
// ---------------------------------------------------------------------------
{
  const base = CLIENTES.find((c) => c.id === "cli-001")!;
  const aplicar = (entrada: EdicaoClienteEntrada) =>
    fundirCliente(base, entrada as EdicaoClienteEntrada);

  checar(
    "campo ausente na entrada não mexe no valor gravado",
    aplicar({ email: "novo@exemplo.com" }).atividade === base.atividade,
  );
  checar(
    "campo preenchido substitui o anterior",
    aplicar({ email: "novo@exemplo.com" }).email === "novo@exemplo.com",
  );
  checar(
    "string vazia vira null, não texto vazio",
    aplicar({ atividade: "   " }).atividade === null,
  );
  checar(
    "telefone é gravado só com dígitos",
    aplicar({ telefone: "(11) 98877-6655" }).telefone === "11988776655",
  );
  checar(
    "editar não inventa clienteDesde",
    aplicar({ email: "a@b.com" }).clienteDesde === base.clienteDesde,
  );
  const pf = CLIENTES.find((c) => c.tipoPessoa === "PF")!;
  checar(
    "cliente PF não ganha CNPJ por edição",
    fundirCliente(pf, { cnpj: "11222333000181" }).cnpj === null,
  );
}

// ---------------------------------------------------------------------------
// Encerramento de processo (03/08/2026).
//
// A carteira é quase toda trabalho com fim (5 dos 6 clientes), então sem
// encerrar ela só cresce. O risco aqui é o oposto do risco da edição: não é
// apagar, é ESCONDER. Encerrado tem que sair do que pede trabalho e continuar
// achável, com a data.
// ---------------------------------------------------------------------------
{
  const hoje = new Date();
  const abertos = listarProcessosDoEscritorio(hoje);

  checar(
    "nenhum processo nasce encerrado na semente",
    abertos.every((p) => p.encerradoEm === null),
  );

  // Chama a função REAL que o armazenamento usa, não uma cópia dela.
  const alvo = abertos.find((p) => p.etapas.some((e) => e.status !== "concluida"))!;
  const encerrado = aplicarEncerramento(alvo, "2026-08-03");

  checar(
    "encerrar zera as etapas em aberto do processo",
    encerrado.etapas.every((e) => e.status === "concluida"),
  );
  checar(
    "encerrar CONFIRMA o andamento, que deixa de ser estimativa",
    encerrado.etapas.every((e) => e.statusConfirmado === true),
  );
  checar(
    "encerrado guarda a data, não some da carteira",
    encerrado.encerradoEm !== null,
  );
  checar(
    "progresso de processo encerrado é 100%",
    progressoDoProcesso(encerrado) === 1,
  );
  console.log(
    `   processos na carteira: ${abertos.length}, todos em aberto na semente`,
  );
}

// ── O guia não pode prometer gravação onde não há ────────────────────────────
// Em 03/08/2026 o /ajuda publicado afirmava "fica salvo de verdade" sobre as
// três funções que a versão hospedada RECUSA, porque o disco é somente leitura.
// A tela não pega isso: o texto era fixo e o build passava limpo. Pior, a
// primeira correção nasceu morta, porque a página era prerenderizada e a
// pergunta sobre o disco era respondida na máquina de build, onde ele grava.
{
  const fonte = readFileSync("src/app/ajuda/page.tsx", "utf-8");
  checar(
    "guia pergunta ao ambiente se o disco grava",
    fonte.includes("carteiraSomenteLeitura()"),
  );
  checar(
    "guia renderiza por requisição, não no build",
    /export const dynamic\s*=\s*"force-dynamic"/.test(fonte),
  );
  // Antes esta checagem era `promessa === -1 || (...)`, e por isso APAGAR a
  // frase fazia o teste passar: ele ficava verde sem verificar nada. Agora a
  // existência da frase é exigida primeiro, e só então a posição dela.
  const promessa = fonte.indexOf("Fica salvo de verdade");
  const condicional = fonte.indexOf("somenteLeitura ?");
  checar("a promessa de gravação existe na página", promessa !== -1);
  checar(
    "a promessa de gravação vive dentro do condicional",
    promessa !== -1 && condicional !== -1 && condicional < promessa,
  );

  /*
    O guia não pode dizer que o sistema não tem login.

    Até 05/08/2026 a seção "O que ainda NÃO existe" listava "Login: o sistema
    abre direto, sem senha". Virou mentira no dia em que o acesso entrou, e
    ninguém teria percebido: é texto estático, nenhuma checagem olhava para ele,
    e a contadora leria aquilo como verdade.

    É a mesma família de defeito de `affordance-falsa`, com o sinal trocado —
    ali o guia prometia um botão que não existia; aqui ele negava uma proteção
    que existe.
  */
  /*
    A primeira versão desta checagem era `/Login:[^&lt;]*(sem senha|abre direto)/i`
    e NÃO pegava nada: no JSX o texto vem como `<N>Login:</N> o sistema abre
    direto`, então `[^<]*` parava no `<` de `</N>` antes de alcançar a frase.
    Ela passou tranquilamente com a mentira reintroduzida no arquivo.

    Era o mesmo defeito que ela existe para impedir — teste verde olhando para
    o lugar errado —, e só apareceu porque a checagem foi testada por mutação.
    Agora procura as frases direto, sem depender de proximidade com "Login:".
  */
  const negaLogin = /sem senha|abre direto/i.test(fonte);
  checar("o guia NÃO afirma que o sistema abre sem senha", !negaLogin);
  checar(
    "o guia explica como entrar",
    /e-mail e senha/i.test(fonte),
  );
  checar(
    "o guia explica como sair",
    /\bSair\b/.test(fonte) && /menu/i.test(fonte),
  );
}

// Kanban e fila de documentos guardam estado só em memória e perdem tudo ao
// recarregar, em QUALQUER ambiente (não é o caso do disco somente leitura da
// hospedagem). A tela, porém, convida a agir: a seção Tarefas diz "Arraste, ou
// use as setas do cartão", e o documento SAI da fila quando decidido, que é a
// cara de uma confirmação. Sem ressalva, a pessoa só descobre ao recarregar, e
// conclui que o sistema perdeu o trabalho dela. Achado em 03/08/2026, quando a
// Marta ia testar pelo celular.
//
// A checagem exige a ressalva ANTES da área interativa: ressalva embaixo do que
// ela já clicou não serve, mesma regra do aviso no topo do guia.
{
  const casos = [
    {
      arquivo: "src/componentes/escritorio/kanban.tsx",
      rotulo: "Kanban",
      interativo: "grid gap-4 md:grid-cols-3",
    },
    {
      arquivo: "src/componentes/escritorio/fila-documentos.tsx",
      rotulo: "fila de documentos",
      interativo: '<ul className="space-y-2.5">',
    },
  ];

  for (const caso of casos) {
    const fonte = readFileSync(caso.arquivo, "utf-8");
    const ressalva = fonte.indexOf("aqui é demonstração");
    const area = fonte.indexOf(caso.interativo);
    checar(
      `${caso.rotulo} avisa que não guarda o que a pessoa fizer`,
      ressalva !== -1,
    );
    checar(
      `${caso.rotulo}: a ressalva vem antes da área que convida a agir`,
      ressalva !== -1 && area !== -1 && ressalva < area,
    );
  }
}

/*
  Geração de id.

  Não havia teste nenhum para isto até 04/08/2026, e é justamente o que a
  migração para banco vai substituir. Sem cobertura, trocar por id do banco
  seria mudança às cegas.
*/
{
  console.log("\n-- geração de id --");
  const c = (id: string) => ({ id }) as Parameters<typeof proximoId>[0][number];

  checar("lista vazia começa em cli-001", proximoId([]) === "cli-001");
  checar(
    "continua a partir do maior, não da quantidade",
    proximoId([c("cli-001"), c("cli-007")]) === "cli-008",
  );
  checar(
    "ignora id fora do padrão em vez de quebrar",
    proximoId([c("cli-003"), c("avulso")]) === "cli-004",
  );
  checar(
    "não reaproveita id de buraco na sequência",
    proximoId([c("cli-001"), c("cli-005")]) === "cli-006",
  );

  // O defeito real, e ele não é sobre o id: duas chamadas com a MESMA lista
  // devolvem o MESMO id, porque a função é pura e não reserva nada. Hoje isso
  // é inofensivo (processo único, escrita rápida), mas com banco e duas
  // instâncias os dois cadastros calculam o mesmo número e a segunda gravação
  // sobrescreve a primeira: o cliente não colide, ele desaparece — e a tela já
  // respondeu que salvou.
  const lista = [c("cli-001")];
  checar(
    "MESMA lista devolve o MESMO id (por isso a sequência tem que sair do banco)",
    proximoId(lista) === proximoId(lista),
  );
}

/*
  Idempotência da semente.

  A garantia hoje é a existência do arquivo, não o conteúdo. Ao migrar, a
  inserção precisa ser por registro (ON CONFLICT DO NOTHING), senão duas
  instâncias frias semeiam as duas.
*/
{
  console.log("\n-- semente --");
  const ids = CLIENTES.map((cl) => cl.id);
  checar("semente não tem id repetido", new Set(ids).size === ids.length);
  checar(
    "todo id da semente segue o padrão cli-NNN",
    ids.every((id) => /^cli-\d{3}$/.test(id)),
  );
  // sessao.ts fixa este id; sem ele no banco, o painel do cliente devolve 500,
  // não uma tela vazia.
  checar(
    "cli-003 existe na semente (sessao.ts depende dele)",
    ids.includes("cli-003"),
  );
  checar(
    "o próximo id não colide com nenhum já semeado",
    !ids.includes(proximoId(CLIENTES)),
  );
}

console.log(falhas === 0 ? "\n== TUDO PASSOU ==" : `\n== ${falhas} FALHA(S) ==`);
process.exit(falhas === 0 ? 0 : 1);
