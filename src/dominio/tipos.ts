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
  | "suporte";

/** Serviços vendidos pela Plena, espelhando a landing page aprovada. */
export type ServicoPlena =
  | "imposto-de-renda"
  | "abertura-de-empresa"
  | "regularizacao-cnpj"
  | "mei"
  | "contabilidade-mensal"
  | "planejamento-tributario";

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
  razaoSocial: string;
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
  responsavel: string;
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

export interface Documento {
  id: string;
  clienteId: string;
  nomeArquivo: string;
  categoria: CategoriaDocumento;
  valorCentavos: number | null;
  /** ISO 8601 (YYYY-MM-DD). */
  emitidoEm: string;
  /** 0 a 1. Abaixo de 0.6 a UI exige confirmação humana. */
  confianca: number;
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
