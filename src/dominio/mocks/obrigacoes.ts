import { dataRelativa, mesRelativo } from "@/kernel/mock";
import { diasAte } from "@/kernel/datas";
import type { Obrigacao, StatusObrigacao } from "@/dominio/tipos";

/**
 * Obrigações fiscais fictícias.
 *
 * Segue o padrão de seed do kernel: o seed guarda deslocamento em meses, não
 * data fixa, e `status` é derivado do vencimento em vez de digitado. O único
 * fato que o calendário não sabe é se já foi pago, então só isso é entrada.
 * Ver `src/kernel/mock.ts` para o porquê.
 */

function derivarStatus(vencimento: string, pago: boolean): StatusObrigacao {
  if (pago) return "pago";
  const dias = diasAte(vencimento);
  if (dias < 0) return "atrasado";
  if (dias === 0) return "vence-hoje";
  return "a-vencer";
}

type ObrigacaoSeed = Omit<Obrigacao, "vencimento" | "competencia" | "status"> & {
  /** Deslocamento em meses a partir do mês corrente. */
  offsetMeses: number;
  diaVencimento: number;
  pago: boolean;
};

/**
 * VAZIO DE PROPÓSITO, e isto é a informação mais importante deste arquivo.
 *
 * Até 01/08/2026 havia aqui 16 obrigações de 8 empresas fictícias. Quando a
 * carteira real entrou em `mocks/clientes.ts`, elas saíram, porque:
 *
 * 1. Os clientes fictícios deixaram de existir, e `clienteId` apontaria para
 *    ninguém.
 * 2. Dos 6 clientes reais, NENHUM está em contabilidade mensal recorrente. São
 *    2 aberturas, 1 regularização, 2 suportes e 1 IRPF. Guia mensal não é o
 *    trabalho da carteira dela hoje.
 * 3. Os únicos valores plausíveis seriam as parcelas do parcelamento da PGFN
 *    do cli-001, e a contadora não informou nenhum. Inventar débito fiscal
 *    de um cliente real dela é o erro que estraga a demonstração.
 *
 * A máquina continua aqui inteira e testada. Assim que a contadora passar valores
 * reais, é só voltar a preencher o array. O que a carteira dela usa hoje está
 * em `mocks/processos.ts`.
 */
const SEEDS: ObrigacaoSeed[] = [];

/**
 * Materializa as obrigações contra a data de hoje.
 * É função, e não constante, porque o status depende do dia em que roda.
 */
export function listarObrigacoes(hoje = new Date()): Obrigacao[] {
  return SEEDS.map(({ offsetMeses, diaVencimento, pago, ...base }): Obrigacao => {
    const vencimento = dataRelativa(offsetMeses, diaVencimento, hoje);
    return {
      ...base,
      // Competência é o mês apurado, sempre anterior ao do vencimento.
      competencia: mesRelativo(offsetMeses - 1, hoje),
      vencimento,
      status: derivarStatus(vencimento, pago),
    };
  });
}

export function listarObrigacoesDoCliente(clienteId: string, hoje = new Date()) {
  return listarObrigacoes(hoje).filter((o) => o.clienteId === clienteId);
}

/** Obrigações ainda não quitadas, da mais urgente para a menos. */
export function obrigacoesEmAberto(hoje = new Date()) {
  return listarObrigacoes(hoje)
    .filter((o) => o.status !== "pago")
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}
