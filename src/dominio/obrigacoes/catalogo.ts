import {
  ajustarVencimento,
  enesimoDiaUtil,
  ultimoDiaDoMes,
  ultimoDiaUtilDoMes,
  type AjusteDiaNaoUtil,
} from "@/kernel/dias-uteis";
import type { RegimeTributario } from "@/dominio/tipos";

/**
 * Catálogo de obrigações fiscais, por regime.
 *
 * Levantado em 04/08/2026 com fonte oficial por prazo (ver
 * `clientes/plena-contabil/obrigacoes-por-regime-2026-08-04.md` no vault).
 * PRECISA de validação da contadora antes de gerar aviso a cliente: prazo
 * errado aqui vira multa lá.
 *
 * A obrigação é LINHA, não coluna. A planilha que a contadora usava tinha uma
 * coluna por obrigação (`DAS`, `PGDAS-D`, `DCTFWeb`...), e por isso acrescentar
 * obrigação nova exigia mexer na planilha inteira — foi um dos motivos de ela
 * ter ficado vazia.
 */

/** Como a obrigação se repete. `eventual` não tem data prevista. */
export type Periodicidade = "mensal" | "trimestral" | "anual" | "eventual";

/** Guia se paga; declaração se entrega. A mesma competência costuma ter as duas. */
export type NaturezaObrigacao = "guia" | "declaracao";

/**
 * O que faz a obrigação existir para um cliente.
 *
 * Separado do regime de propósito: obrigação de folha é disparada pelo PRIMEIRO
 * VÍNCULO, não pelo regime. Um MEI com empregado deve eSocial, FGTS, INSS e
 * DCTFWeb igual a uma empresa do Lucro Presumido.
 */
export interface Aplicabilidade {
  regimes?: RegimeTributario[];
  /** Só existe se o cliente tem empregado. */
  exigeEmpregado?: boolean;
  /** Só existe para pessoa física. */
  apenasPessoaFisica?: boolean;
  /** Condição que o sistema não consegue decidir sozinho. */
  condicao?: string;
}

export interface ObrigacaoCatalogo {
  sigla: string;
  nome: string;
  natureza: NaturezaObrigacao;
  periodicidade: Periodicidade;
  /** Como calcular o vencimento a partir da competência. */
  regra: RegraVencimento;
  ajuste: AjusteDiaNaoUtil;
  aplicabilidade: Aplicabilidade;
  /** Continua devida mesmo sem faturamento no período? */
  devidaSemMovimento: boolean;
  orgao: string;
  /** O que ainda não foi confirmado em fonte oficial. Vazio = tudo confirmado. */
  pendenteValidacao?: string;
}

export type RegraVencimento =
  /** Dia fixo do mês seguinte à competência. Ex.: dia 20. */
  | { tipo: "dia-do-mes-seguinte"; dia: number }
  /** Dia fixo, N meses após a competência. A DIRBI usa 2. */
  | { tipo: "dia-de-mes-posterior"; dia: number; meses: number }
  /** Último dia útil do mês seguinte. */
  | { tipo: "ultimo-dia-util-mes-seguinte" }
  /** N-ésimo dia útil do 2º mês seguinte. EFD-Contribuições usa 10. */
  | { tipo: "enesimo-dia-util-segundo-mes"; n: number }
  /** Dia e mês fixos do ano seguinte ao ano-calendário. */
  | { tipo: "data-anual"; dia: number; mes: number }
  /** Último dia útil de um mês do ano seguinte. */
  | { tipo: "ultimo-dia-util-de-mes-anual"; mes: number }
  /** Último dia do mês seguinte ao trimestre encerrado. */
  | { tipo: "trimestral-ultimo-dia-util" }
  /** Sem data prevista: nasce de um evento. */
  | { tipo: "sem-data" };

// ════════════════════════════════════════════════════════════════════
//  O CATÁLOGO
// ════════════════════════════════════════════════════════════════════

export const CATALOGO: ObrigacaoCatalogo[] = [
  // ---------- MEI ----------
  {
    sigla: "DAS-SIMEI",
    nome: "DAS do Microempreendedor Individual",
    natureza: "guia",
    periodicidade: "mensal",
    regra: { tipo: "dia-do-mes-seguinte", dia: 20 },
    ajuste: "prorroga",
    aplicabilidade: { regimes: ["MEI"] },
    devidaSemMovimento: true,
    orgao: "Simples Nacional",
  },
  {
    sigla: "DASN-SIMEI",
    nome: "Declaração Anual Simplificada para o MEI",
    natureza: "declaracao",
    periodicidade: "anual",
    regra: { tipo: "data-anual", dia: 31, mes: 5 },
    // Transmissão online não depende de expediente bancário: em 2026 o prazo
    // caiu num domingo e continuou sendo 31/05.
    ajuste: "fixo",
    aplicabilidade: { regimes: ["MEI"] },
    devidaSemMovimento: true,
    orgao: "Simples Nacional",
  },

  // ---------- Simples Nacional (ME/EPP) ----------
  {
    sigla: "DAS",
    nome: "Documento de Arrecadação do Simples Nacional",
    natureza: "guia",
    periodicidade: "mensal",
    regra: { tipo: "dia-do-mes-seguinte", dia: 20 },
    ajuste: "prorroga",
    aplicabilidade: { regimes: ["Simples Nacional"] },
    // Mês sem receita não gera DAS a pagar, mas o PGDAS-D continua devido.
    devidaSemMovimento: false,
    orgao: "Simples Nacional",
  },
  {
    sigla: "PGDAS-D",
    nome: "Apuração mensal do Simples Nacional",
    natureza: "declaracao",
    periodicidade: "mensal",
    regra: { tipo: "dia-do-mes-seguinte", dia: 20 },
    // `fixo`, e não `prorroga`: a Resolução CGSN 140/2018 manda prorrogar o
    // PAGAMENTO do DAS, não a entrega da declaração. Presumir que a declaração
    // segue o mesmo caminho é justamente o erro que a contadora apontou —
    // "não confundir com o DAS".
    ajuste: "fixo",
    aplicabilidade: { regimes: ["Simples Nacional"] },
    devidaSemMovimento: true,
    orgao: "Simples Nacional",
    pendenteValidacao:
      "Prazo de entrega é dia 20, mas a regra de dia não útil da DECLARAÇÃO não está em ato expresso. Conferir a agenda do mês antes de avisar.",
  },
  {
    sigla: "DEFIS",
    nome: "Declaração de Informações Socioeconômicas e Fiscais",
    natureza: "declaracao",
    periodicidade: "anual",
    regra: { tipo: "data-anual", dia: 31, mes: 3 },
    ajuste: "fixo",
    aplicabilidade: { regimes: ["Simples Nacional"] },
    devidaSemMovimento: true,
    orgao: "Simples Nacional",
    pendenteValidacao:
      "31/03 vem da Resolução CGSN 140/2018. Não aplicar próximo dia útil automaticamente: conferir prorrogação específica do ano.",
  },

  // ---------- Lucro Presumido ----------
  {
    sigla: "IRPJ",
    nome: "Imposto de Renda da Pessoa Jurídica (presumido)",
    natureza: "guia",
    periodicidade: "trimestral",
    regra: { tipo: "trimestral-ultimo-dia-util" },
    ajuste: "antecipa",
    aplicabilidade: { regimes: ["Lucro Presumido"] },
    devidaSemMovimento: false,
    orgao: "Receita Federal",
  },
  {
    sigla: "CSLL",
    nome: "Contribuição Social sobre o Lucro Líquido",
    natureza: "guia",
    periodicidade: "trimestral",
    regra: { tipo: "trimestral-ultimo-dia-util" },
    ajuste: "antecipa",
    aplicabilidade: { regimes: ["Lucro Presumido"] },
    devidaSemMovimento: false,
    orgao: "Receita Federal",
  },
  {
    sigla: "PIS/COFINS",
    nome: "PIS/Pasep e COFINS (cumulativos)",
    natureza: "guia",
    periodicidade: "mensal",
    regra: { tipo: "dia-do-mes-seguinte", dia: 25 },
    ajuste: "antecipa",
    aplicabilidade: { regimes: ["Lucro Presumido"] },
    devidaSemMovimento: false,
    orgao: "Receita Federal",
  },
  {
    sigla: "EFD-Contribuicoes",
    nome: "Escrituração Fiscal Digital das Contribuições",
    natureza: "declaracao",
    periodicidade: "mensal",
    regra: { tipo: "enesimo-dia-util-segundo-mes", n: 10 },
    ajuste: "fixo",
    aplicabilidade: { regimes: ["Lucro Presumido"] },
    devidaSemMovimento: true,
    orgao: "Receita Federal / SPED",
  },
  {
    sigla: "ECD",
    nome: "Escrituração Contábil Digital",
    natureza: "declaracao",
    periodicidade: "anual",
    // Mudou de maio para junho pela IN RFB 2.142/2023.
    regra: { tipo: "ultimo-dia-util-de-mes-anual", mes: 6 },
    ajuste: "fixo",
    aplicabilidade: { regimes: ["Lucro Presumido", "Lucro Real"] },
    devidaSemMovimento: true,
    orgao: "Receita Federal / SPED",
  },
  {
    sigla: "ECF",
    nome: "Escrituração Contábil Fiscal",
    natureza: "declaracao",
    periodicidade: "anual",
    regra: { tipo: "ultimo-dia-util-de-mes-anual", mes: 7 },
    ajuste: "fixo",
    aplicabilidade: { regimes: ["Lucro Presumido", "Lucro Real"] },
    devidaSemMovimento: true,
    orgao: "Receita Federal / SPED",
  },
  {
    sigla: "DIRBI",
    nome: "Declaração de Incentivos, Renúncias, Benefícios e Imunidades",
    natureza: "declaracao",
    periodicidade: "mensal",
    // Repare: dia 20 do SEGUNDO mês seguinte. É a armadilha do "dia 20".
    regra: { tipo: "dia-de-mes-posterior", dia: 20, meses: 2 },
    // `fixo`: a contadora orientou não presumir deslocamento para a DIRBI.
    ajuste: "fixo",
    aplicabilidade: {
      regimes: ["Lucro Presumido", "Lucro Real"],
      condicao: "Só se a empresa usufrui benefício fiscal listado na IN RFB 2.198/2024.",
    },
    devidaSemMovimento: false,
    orgao: "Receita Federal",
    pendenteValidacao:
      "Dia 20 do 2º mês seguinte confirmado. Regra de dia não útil: conferir a Agenda Tributária do mês, não presumir.",
  },

  {
    sigla: "EFD-Reinf",
    nome: "Escrituração Fiscal Digital de Retenções e Outras Informações",
    natureza: "declaracao",
    periodicidade: "mensal",
    regra: { tipo: "dia-do-mes-seguinte", dia: 15 },
    // ANTECIPA, e a contadora reforçou o ponto: esta não pode ir para segunda.
    // Ex.: 15/08/2026 cai num sábado, o prazo vira 14/08.
    ajuste: "antecipa",
    aplicabilidade: {
      regimes: ["Lucro Presumido", "Lucro Real"],
      condicao:
        "Disparada por RETENÇÃO, que pode existir sem nenhum empregado. Sem fatos a informar no período, é dispensada — nem 'sem movimento' se envia.",
    },
    devidaSemMovimento: false,
    orgao: "Receita Federal / SPED",
  },

  // ---------- Com empregado: vale para QUALQUER regime ----------
  {
    sigla: "eSocial",
    nome: "Fechamento da folha no eSocial",
    natureza: "declaracao",
    periodicidade: "mensal",
    regra: { tipo: "dia-do-mes-seguinte", dia: 15 },
    ajuste: "antecipa",
    aplicabilidade: { exigeEmpregado: true },
    devidaSemMovimento: false,
    orgao: "eSocial",
    pendenteValidacao:
      "Regra de dia não útil não confirmada: as fontes públicas divergem. Conferir no MOS S-1.3.",
  },
  {
    sigla: "FGTS",
    nome: "FGTS mensal (FGTS Digital)",
    natureza: "guia",
    periodicidade: "mensal",
    // Vencia dia 7; passou para o dia 20 com o FGTS Digital em 2024.
    regra: { tipo: "dia-do-mes-seguinte", dia: 20 },
    ajuste: "antecipa",
    aplicabilidade: { exigeEmpregado: true },
    devidaSemMovimento: false,
    orgao: "Caixa / MTE",
  },
  {
    sigla: "INSS",
    nome: "INSS patronal e terceiros",
    natureza: "guia",
    periodicidade: "mensal",
    regra: { tipo: "dia-do-mes-seguinte", dia: 20 },
    ajuste: "antecipa",
    aplicabilidade: { exigeEmpregado: true },
    devidaSemMovimento: false,
    orgao: "Receita Federal",
  },
  {
    sigla: "IRRF",
    nome: "IRRF sobre trabalho assalariado",
    natureza: "guia",
    periodicidade: "mensal",
    regra: { tipo: "dia-do-mes-seguinte", dia: 20 },
    ajuste: "antecipa",
    aplicabilidade: { exigeEmpregado: true },
    devidaSemMovimento: false,
    orgao: "Receita Federal",
  },
  {
    sigla: "DCTFWeb",
    nome: "Declaração de Débitos e Créditos Tributários Federais (com MIT)",
    natureza: "declaracao",
    periodicidade: "mensal",
    // A declaração vence DEPOIS da guia que ela apura: o DARF de INSS de maio
    // venceu 19/06 e esta declaração, 30/06. Tratar guia e declaração como um
    // registro só faz o aviso sair na data errada.
    regra: { tipo: "ultimo-dia-util-mes-seguinte" },
    ajuste: "fixo",
    aplicabilidade: {
      regimes: ["Lucro Presumido", "Lucro Real"],
      condicao: "Também obrigatória para MEI e Simples que tenham empregado.",
    },
    devidaSemMovimento: false,
    orgao: "Receita Federal",
  },

  // ---------- Pessoa Física ----------
  {
    sigla: "DIRPF",
    nome: "Declaração de Ajuste Anual do IRPF",
    natureza: "declaracao",
    periodicidade: "anual",
    regra: { tipo: "ultimo-dia-util-de-mes-anual", mes: 5 },
    ajuste: "fixo",
    aplicabilidade: { apenasPessoaFisica: true },
    devidaSemMovimento: false,
    orgao: "Receita Federal",
    pendenteValidacao:
      "Limites de obrigatoriedade (valores) não levantados. Estão na IN RFB 2.312/2026.",
  },
  {
    sigla: "GCAP",
    nome: "DARF de ganho de capital",
    natureza: "guia",
    periodicidade: "eventual",
    // Nasce da venda, não do calendário: vence no último dia útil do mês
    // seguinte ao da alienação. A competência a informar é o mês da operação.
    regra: { tipo: "ultimo-dia-util-mes-seguinte" },
    ajuste: "fixo",
    aplicabilidade: {
      apenasPessoaFisica: true,
      condicao:
        "Só quando houve alienação com ganho. O documento sai do programa GCAP da Receita.",
    },
    devidaSemMovimento: false,
    orgao: "Receita Federal",
    pendenteValidacao:
      "Prazo levantado em pesquisa do Filipe, ainda sem transcrição de fonte oficial. Multa informada: 0,33% ao dia, teto de 20%, mais Selic acumulada e 1% no mês do pagamento.",
  },
  {
    sigla: "Carne-Leao",
    nome: "Recolhimento mensal obrigatório (carnê-leão)",
    natureza: "guia",
    periodicidade: "mensal",
    regra: { tipo: "ultimo-dia-util-mes-seguinte" },
    ajuste: "fixo",
    aplicabilidade: {
      apenasPessoaFisica: true,
      condicao: "Só nos meses com rendimento acima da 1ª faixa da tabela.",
    },
    devidaSemMovimento: false,
    orgao: "Receita Federal",
  },
];

/**
 * Obrigações extintas que ainda aparecem em planilha e sistema antigo.
 *
 * Está aqui para o sistema RECUSAR, não para gerar. A planilha da contadora tem
 * uma coluna `DIRF/outros`, e a DIRF não existe desde 2025 — cobrar o cliente
 * por ela seria pior que não avisar nada.
 */
export const EXTINTAS: Record<string, string> = {
  DIRF: "Extinta para fatos geradores desde 01/01/2025. Substituída por eventos do eSocial e da EFD-Reinf.",
  DCTF: "A DCTF PGD foi extinta em 2025. Os débitos migraram para a DCTFWeb com o módulo MIT.",
  RAIS: "Absorvida pelo eSocial desde o ano-base 2019.",
  CAGED: "Absorvido pelo eSocial desde 01/01/2020.",
  GFIP: "Substituída pelo FGTS Digital em 2024.",
};

// ════════════════════════════════════════════════════════════════════
//  CÁLCULO
// ════════════════════════════════════════════════════════════════════

/** Competência no formato YYYY-MM. */
export function partesDaCompetencia(competencia: string): {
  ano: number;
  mes: number;
} {
  const [ano, mes] = competencia.split("-").map(Number);
  if (!ano || !mes || mes < 1 || mes > 12) {
    throw new Error(`Competência inválida: ${competencia}. Use YYYY-MM.`);
  }
  return { ano, mes };
}

/**
 * Vencimento de uma obrigação para uma competência.
 *
 * Devolve a data JÁ ajustada pela regra de dia não útil da obrigação — é aqui
 * que "dia 20" vira 19/06 para o INSS e 22/06 para o DAS, na mesma competência.
 */
export function calcularVencimento(
  obrigacao: ObrigacaoCatalogo,
  competencia: string,
): Date {
  const { ano, mes } = partesDaCompetencia(competencia);
  const r = obrigacao.regra;
  let bruta: Date;

  switch (r.tipo) {
    case "dia-do-mes-seguinte": {
      const d = new Date(Date.UTC(ano, mes, r.dia));
      // Dia 31 em mês de 30 transbordaria para o mês seguinte.
      const ultimo = ultimoDiaDoMes(d.getUTCFullYear(), d.getUTCMonth() + 1);
      bruta = d.getUTCDate() !== r.dia ? ultimo : d;
      break;
    }
    case "dia-de-mes-posterior":
      bruta = new Date(Date.UTC(ano, mes - 1 + r.meses, r.dia));
      break;
    case "ultimo-dia-util-mes-seguinte":
      bruta = ultimoDiaUtilDoMes(mes === 12 ? ano + 1 : ano, mes === 12 ? 1 : mes + 1);
      break;
    case "enesimo-dia-util-segundo-mes": {
      const alvo = new Date(Date.UTC(ano, mes + 1, 1));
      bruta = enesimoDiaUtil(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, r.n);
      break;
    }
    case "data-anual":
      // Anual refere-se ao ano-calendário: competência 2025 vence em 2026.
      bruta = new Date(Date.UTC(ano + 1, r.mes - 1, r.dia));
      break;
    case "ultimo-dia-util-de-mes-anual":
      bruta = ultimoDiaUtilDoMes(ano + 1, r.mes);
      break;
    case "trimestral-ultimo-dia-util": {
      const trimestre = Math.ceil(mes / 3);
      const mesSeguinteAoTrimestre = trimestre * 3 + 1;
      bruta =
        mesSeguinteAoTrimestre > 12
          ? ultimoDiaUtilDoMes(ano + 1, 1)
          : ultimoDiaUtilDoMes(ano, mesSeguinteAoTrimestre);
      break;
    }
    case "sem-data":
      throw new Error(`${obrigacao.sigla} não tem data prevista.`);
  }

  return ajustarVencimento(bruta, obrigacao.ajuste);
}

/**
 * A data que a contadora quer ver para avisar o cliente.
 *
 * ── A regra que ela deu, em 04/08/2026, e o motivo dela ──────────────────
 * "Se o vencimento for dia 20 e cair num sábado, ele tem que pagar dia 19. Se
 * o sistema marcou dia 22 e cair no meu segundo, não vai mudar nada. Mas a
 * regra nunca passa da data de vencimento."
 *
 * Traduzindo: para AVISAR, ela nunca quer uma data depois do dia nominal.
 * Pagar antes nunca é problema; pagar depois é multa do cliente dela.
 *
 * Isso NÃO substitui `calcularVencimento`, que continua devolvendo o prazo
 * legal — inclusive prorrogado, quando a lei prorroga. As duas datas coexistem
 * de propósito:
 *
 * - `calcularVencimento` responde "qual é o prazo legal", e é o que vale para
 *   registro, para conferir multa e para não afirmar coisa errada.
 * - `calcularDataDeAviso` responde "quando eu falo com o cliente", e é o que
 *   vai para a tela dela.
 *
 * Fundir as duas seria escolher entre estar certo e ser útil. O sistema
 * consegue as duas coisas guardando as duas.
 */
export function calcularDataDeAviso(
  obrigacao: ObrigacaoCatalogo,
  competencia: string,
): Date {
  const legal = calcularVencimento(obrigacao, competencia);
  if (obrigacao.ajuste !== "prorroga") return legal;

  // Só a família que PRORROGA precisa de correção: a lei empurra para depois
  // do dia nominal, e ela quer o contrário. Recalcula antecipando.
  const clone: ObrigacaoCatalogo = { ...obrigacao, ajuste: "antecipa" };
  return calcularVencimento(clone, competencia);
}

/**
 * As duas datas de uma obrigação, lado a lado.
 *
 * `divergem` é `true` quando a lei permite pagar depois do dia nominal e a
 * contadora prefere antecipar. A tela usa isso para explicar a diferença em
 * vez de esconder uma das duas.
 */
export function datasDaObrigacao(
  obrigacao: ObrigacaoCatalogo,
  competencia: string,
): { legal: Date; aviso: Date; divergem: boolean } {
  const legal = calcularVencimento(obrigacao, competencia);
  const aviso = calcularDataDeAviso(obrigacao, competencia);
  return { legal, aviso, divergem: legal.getTime() !== aviso.getTime() };
}

/** Contexto mínimo do cliente para decidir o que se aplica a ele. */
export interface PerfilFiscal {
  regime: RegimeTributario | null;
  temEmpregado: boolean;
  pessoaFisica: boolean;
}

/**
 * Quais obrigações se aplicam a um cliente.
 *
 * Obrigação com `condicao` entra na lista MESMO assim: o sistema não tem como
 * decidir sozinho, e omitir silenciosamente é pior que perguntar. Quem consome
 * mostra a condição para a contadora confirmar.
 */
export function obrigacoesDoPerfil(perfil: PerfilFiscal): ObrigacaoCatalogo[] {
  return CATALOGO.filter((o) => {
    const a = o.aplicabilidade;
    if (a.apenasPessoaFisica) return perfil.pessoaFisica;
    if (perfil.pessoaFisica) return false;
    if (a.exigeEmpregado) return perfil.temEmpregado;
    if (a.regimes && a.regimes.length > 0) {
      return perfil.regime !== null && a.regimes.includes(perfil.regime);
    }
    return true;
  });
}
