/**
 * Tipos do domínio contábil brasileiro.
 *
 * Nada aqui é reaproveitável fora de contabilidade. É por isso que mora em
 * `dominio/` e não em `kernel/`. Ver `src/kernel/README.md`.
 *
 * Nomenclatura em português quando o termo é técnico-fiscal (competência,
 * vencimento, regime): traduzir "DAS" ou "competência" só cria ambiguidade
 * na hora de validar a regra com a contadora.
 */

/**
 * Regime tributário. Define quais obrigações a empresa tem.
 *
 * "Não optante" não é um regime de verdade, é a ausência de opção válida: a
 * empresa foi excluída do Simples ou nunca se enquadrou. Está aqui porque é
 * estado real de carteira (ver cli-001 em `mocks/clientes.ts`) e porque
 * omitir obrigaria a representá-lo como `null`, que já significa outra coisa
 * neste modelo: "ainda não sabemos".
 */
export type RegimeTributario =
  | "MEI"
  | "Simples Nacional"
  | "Lucro Presumido"
  | "Lucro Real"
  | "Não optante";

/** Pessoa jurídica ou física. IRPF é atendimento de PF, e PF não tem regime. */
export type TipoPessoa = "PJ" | "PF";

/** Natureza jurídica, restrita ao que aparece numa carteira de escritório pequeno. */
export type NaturezaJuridica =
  | "Empresário Individual"
  | "SLU"
  | "Ltda"
  | "Sociedade Simples";

export type PorteEmpresa = "MEI" | "ME" | "EPP" | "Demais";

/**
 * O que a Plena faz para aquele cliente HOJE.
 *
 * Diferente de `ServicoPlena`, que é o catálogo comercial da landing page.
 * Este é o trabalho em curso, e é ele que decide qual tela o cliente vê: quem
 * está em abertura não tem guia para pagar, tem etapa para acompanhar.
 */
export type TipoAtendimento =
  | "contabilidade-mensal"
  | "abertura"
  | "regularizacao"
  | "irpf"
  | "suporte"
  // Ver a nota em `ServicoPlena`: o arquivo real tem trabalho de folha rodando
  // mês a mês, com demonstrativo, relatório consolidado e guia por competência.
  | "folha-de-pagamento";

/** Serviços vendidos pela Plena, espelhando a landing page aprovada. */
export type ServicoPlena =
  | "imposto-de-renda"
  | "abertura-de-empresa"
  | "regularizacao-cnpj"
  | "mei"
  | "contabilidade-mensal"
  | "planejamento-tributario"
  // Acrescentados em 04/08/2026 a partir do arquivo real da contadora: existem
  // pastas dedicadas a folha/eSocial e a escritório virtual, com trabalho
  // recorrente. O catálogo da landing page não os previa, e por isso a carteira
  // não conseguia representar clientes que só têm esses dois.
  | "folha-de-pagamento"
  | "escritorio-virtual";

export type StatusObrigacao = "pago" | "a-vencer" | "vence-hoje" | "atrasado";

export type StatusCliente = "ativo" | "pendente" | "inativo";

/**
 * Cliente da carteira.
 *
 * Regra de nulo deste modelo, e ela vale para o arquivo inteiro:
 * `null` significa **"ainda não informado"**, nunca "não se aplica" e nunca
 * zero. Numa carteira real a maior parte dos cadastros nasce incompleta, e a
 * tela precisa saber a diferença entre "sem CNPJ porque a empresa ainda está
 * sendo aberta" e "sem CNPJ porque ninguém digitou". Inventar valor para
 * preencher a tela é o erro que a contadora percebe em dois segundos, porque
 * são os clientes dela.
 */
export interface Cliente {
  id: string;
  /**
   * `null` quando a contadora não informou, ou quando a empresa ainda está em
   * abertura e a razão social não existe. Não usar texto sentinela tipo
   * "Não informado": isso guarda uma mentira no dado, some da lista de lacunas
   * e obriga a tela a comparar string mágica pra esconder.
   */
  razaoSocial: string | null;
  nomeFantasia: string;
  tipoPessoa: TipoPessoa;
  /** Somente dígitos. Formatar na apresentação, nunca no dado. */
  cnpj: string | null;
  /** Somente dígitos. Preenchido quando `tipoPessoa` é "PF". */
  cpf: string | null;
  /** Descrição da atividade, em texto livre ou com o código CNAE quando houver. */
  atividade: string | null;
  naturezaJuridica: NaturezaJuridica | null;
  porte: PorteEmpresa | null;
  regime: RegimeTributario | null;
  status: StatusCliente;
  /** O que a Plena executa hoje para este cliente. */
  atendimentos: TipoAtendimento[];
  /** Catálogo comercial, para cruzar com a landing page. */
  servicos: ServicoPlena[];
  /**
   * Quem a contadora fala no dia a dia. `null` quando ela não informou.
   * A tela cai para o nome do cliente, e o dado NÃO copia o nome: copiar
   * esconderia a lacuna.
   */
  responsavel: string | null;
  email: string | null;
  /** Somente dígitos, com DDD. */
  telefone: string | null;
  /** ISO 8601 (YYYY-MM-DD). */
  clienteDesde: string | null;
}

export type StatusEtapa =
  | "concluida"
  | "em-andamento"
  | "bloqueada"
  | "nao-iniciada";

export interface EtapaProcesso {
  id: string;
  rotulo: string;
  status: StatusEtapa;
  /** Por que está bloqueada, ou o que falta. Aparece na tela como está aqui. */
  observacao?: string;
  /**
   * `true` só quando a contadora confirmou o ponto real do processo.
   *
   * Ela informou o ESCOPO do trabalho, não onde cada frente parou, então todo
   * status semeado é estimativa. Ausente ou `false` significa não confirmado, e
   * a tela avisa isso: chute sem aviso vira dado inventado, que é o que
   * `demo-nao-inventa-dado` proíbe.
   *
   * Não vale marcar como confirmado para calar o aviso. O aviso some sozinho
   * quando o dado real entrar, e `scripts/verificar.mts` garante que nenhuma
   * etapa nasça confirmada no seed.
   */
  statusConfirmado?: boolean;
}

/**
 * Trabalho com começo, meio e fim: abertura de empresa, regularização fiscal,
 * declaração de IRPF, chamado de suporte.
 *
 * É o irmão da `Obrigacao`. A obrigação se repete e tem vencimento legal; o
 * processo acontece uma vez e tem etapa. A carteira da Plena hoje é quase toda
 * processo, então tratar tudo como obrigação deixaria a maioria dos clientes
 * com a tela em branco.
 */
export interface Processo {
  id: string;
  clienteId: string;
  tipo: TipoAtendimento;
  titulo: string;
  etapas: EtapaProcesso[];
  /** ISO 8601 (YYYY-MM-DD). */
  abertoEm: string;
  /** Prazo legal ou combinado, quando existe. */
  prazo: string | null;
  /**
   * ISO 8601. Preenchido quando a contadora deu o trabalho por concluído.
   *
   * Encerrado NÃO some da carteira: sai das contagens de "em aberto" e passa a
   * mostrar a data. Quem concluiu uma abertura de empresa ainda precisa achar
   * aquele trabalho depois.
   */
  encerradoEm: string | null;
}

/** Fração concluída de 0 a 1. Etapa bloqueada não conta como andamento. */
export function progressoDoProcesso(processo: Processo) {
  if (processo.etapas.length === 0) return 0;
  const concluidas = processo.etapas.filter(
    (e) => e.status === "concluida",
  ).length;
  return concluidas / processo.etapas.length;
}

export interface Obrigacao {
  id: string;
  clienteId: string;
  /** Sigla oficial da guia: DAS, DAS-MEI, DARF, GPS, FGTS. */
  sigla: string;
  descricao: string;
  /** Mês de apuração (YYYY-MM). Não confundir com vencimento. */
  competencia: string;
  /** ISO 8601 (YYYY-MM-DD). */
  vencimento: string;
  /** Centavos inteiros. Convenção do repositório, ver kernel/br.ts. */
  valorCentavos: number;
  status: StatusObrigacao;
}

/** Categorias de lançamento usadas na classificação de documentos. */
export type CategoriaDocumento =
  | "Despesa de viagem"
  | "Material de escritório"
  | "Serviço de terceiros"
  | "Folha de pagamento"
  | "Imposto e taxa"
  | "Receita de venda"
  | "Não identificado";

/**
 * O que o documento É, independente de para que ele serve contabilmente.
 *
 * Eixo diferente de `CategoriaDocumento`, e os dois convivem: um informe de
 * rendimentos É um informe (tipo) e SERVE como comprovante de receita
 * (categoria). Classificar só por categoria perde a informação de que aquele
 * papel específico é o que a Receita exige na entrega.
 *
 * Levantado em 04/08/2026 a partir dos nomes de arquivo do arquivo real da
 * contadora, por frequência: recibo (39), declaração (36), DARF (28), DAS (20),
 * informe (16), boleto (11), comprovante (9), guia (8), extrato (8), certidão
 * (7), contrato (6), DCTF (3), procuração (2), holerite (1).
 */
export type TipoDocumento =
  | "declaracao"
  | "recibo-de-entrega"
  | "guia-de-pagamento"
  | "comprovante-de-pagamento"
  | "informe-de-rendimentos"
  | "extrato"
  | "certidao"
  | "contrato"
  | "procuracao"
  | "holerite"
  | "outro";

/**
 * De onde o papel veio. Decide de quem é a responsabilidade quando ele falta.
 *
 * A distinção não é burocrática: se o documento é `recebido-do-cliente` e não
 * chegou, quem cobra é a contadora; se é `gerado-pela-plena`, quem deve é ela
 * mesma. Hoje a tela não sabe diferenciar e trata toda falta igual.
 */
export type OrigemDocumento =
  | "gerado-pela-plena"
  | "recebido-do-cliente"
  | "emitido-pelo-orgao";

/**
 * Assinatura como estado, não como pasta.
 *
 * No arquivo real existem pastas chamadas `Assinados`, com 5 e 16 arquivos.
 * Mover arquivo de pasta É o controle de assinatura hoje — o que significa que
 * o estado existe, é rastreado à mão, e some quando alguém esquece de mover.
 */
export type EstadoAssinatura =
  | "nao-requer"
  | "aguardando-assinatura"
  | "assinado";

/**
 * Período a que o documento se refere. NÃO é a data em que ele foi emitido.
 *
 * A declaração de IRPF entregue em 2026 refere-se ao ano-calendário 2025, e é
 * assim que ela nomeia os arquivos e organiza as pastas. Guardar só
 * `emitidoEm` torna impossível responder "o que falta do imposto de renda
 * deste ano", que é a pergunta que ela faz.
 *
 * - `exercicio`: ano da entrega/apuração (o "IR 2026").
 * - `anoCalendario`: ano dos fatos declarados. Ausente quando não se aplica.
 * - `competencia`: mês de apuração (YYYY-MM), para o que é mensal, como folha.
 */
export interface PeriodoReferencia {
  exercicio: number;
  anoCalendario?: number;
  competencia?: string;
}

export interface Documento {
  id: string;
  clienteId: string;
  nomeArquivo: string;
  categoria: CategoriaDocumento;
  valorCentavos: number | null;
  /** ISO 8601 (YYYY-MM-DD). Quando o papel foi emitido, não a que ele se refere. */
  emitidoEm: string;
  /** 0 a 1. Abaixo de 0.6 a UI exige confirmação humana. */
  confianca: number;

  // ── Acrescentado em 04/08/2026, a partir do arquivo real ──────────────
  // Todos opcionais de propósito: o acervo existente não tem essa informação,
  // e exigir agora transformaria cada documento já cadastrado numa lacuna
  // falsa. Ausente significa "ainda não classificado", não "não se aplica" —
  // mesma regra de nulo do resto do arquivo.

  /** O que o papel é. Ver `TipoDocumento`. */
  tipo?: TipoDocumento;
  /** De quem é a responsabilidade quando falta. Ver `OrigemDocumento`. */
  origem?: OrigemDocumento;
  /** Ver `EstadoAssinatura`. Ausente equivale a `nao-requer`. */
  assinatura?: EstadoAssinatura;
  /** A que período o documento se refere. Ver `PeriodoReferencia`. */
  referencia?: PeriodoReferencia;
  /**
   * Processo ao qual este documento pertence, quando houver.
   *
   * No arquivo real os documentos vivem agrupados pelo trabalho que os gerou
   * (uma pasta por pessoa dentro de `IR 2026`), não soltos por cliente. Sem
   * este vínculo, "o que falta para fechar o IRPF do fulano" não é
   * respondível: o sistema só sabe listar tudo o que aquele cliente já mandou.
   */
  processoId?: string;
  /**
   * Caminho de onde o arquivo veio, quando importado do computador dela.
   *
   * **O arquivo em si não sobe.** Decisão de 04/08/2026: o sistema guarda a
   * ficha do documento, e o arquivo continua onde está. Isto é a trilha de
   * volta, para ela achar o original sem depender da memória.
   */
  caminhoOrigem?: string;
}

/** Limite abaixo do qual classificação automática não pode ser aceita sozinha. */
export const CONFIANCA_MINIMA = 0.6;

/**
 * A partir de quantos dias em aberto um processo passa a incomodar.
 *
 * Mora aqui, não em `escritorio.ts`, porque é usada por um componente de
 * CLIENTE (`linha-do-tempo.tsx`). `escritorio.ts` importa
 * `armazenamento-clientes.ts`, que usa `node:fs`, e o bundler do navegador
 * não sabe empacotar `fs`. `tipos.ts` é só tipo e constante, seguro para os
 * dois lados.
 */
export const DIAS_ARRASTANDO = 60;
