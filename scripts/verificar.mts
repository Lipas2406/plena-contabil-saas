// Smoke test temporário. Roda a regra pura, sem LLM e sem chave de API.
import { consultarVencimentos } from "@/dominio/ia/ferramentas/consultar-vencimentos";
import { classificarDocumento } from "@/dominio/ia/ferramentas/classificar-documento";
import { listarObrigacoes } from "@/dominio/mocks/obrigacoes";
import { hojeISO } from "@/kernel/datas";
import { formatarTelefone, formatarCNPJ, formatarBRL, mesmoTextoBR } from "@/kernel/br";

let falhas = 0;
const checar = (nome: string, ok: boolean) => {
  if (!ok) falhas++;
  console.log(`${ok ? "OK  " : "FALHA"} ${nome}`);
};

// A graça do padrão: chamo `.puro` direto, sem tocar no framework.
const r = consultarVencimentos.puro({ cnpj: "31.845.220/0001-88" });
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

const inexistente = consultarVencimentos.puro({ cnpj: "00000000000000" });
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

console.log(falhas === 0 ? "\n== TUDO PASSOU ==" : `\n== ${falhas} FALHA(S) ==`);
process.exit(falhas === 0 ? 0 : 1);
