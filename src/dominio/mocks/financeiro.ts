import { mesRelativo } from "@/kernel/mock";
import { geradorDeterministico } from "@/kernel/mock";

/**
 * Série de evolução financeira para o gráfico do dashboard.
 *
 * Segue o padrão de mock do kernel: meses relativos ao atual, então a série
 * nunca "termina no passado". Os valores vêm de PRNG com semente, e não de
 * `Math.random()`, para o gráfico não mudar de forma a cada refresh (o que
 * numa demo parece bug, e num teste visual invalida o snapshot).
 */

export interface PontoFinanceiro {
  /** Rótulo curto do mês, ex: "ago". */
  mes: string;
  /** Competência ISO (YYYY-MM), para ordenar e para tooltip. */
  competencia: string;
  faturamentoCentavos: number;
  impostosCentavos: number;
}

const NOMES_MES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export function serieFinanceira(meses = 6, hoje = new Date()): PontoFinanceiro[] {
  const aleatorio = geradorDeterministico(20260801);

  return Array.from({ length: meses }, (_, i) => {
    const offset = -(meses - 1 - i);
    const competencia = mesRelativo(offset, hoje);
    const indiceMes = Number(competencia.slice(5, 7)) - 1;

    // Base com leve tendência de alta mais ruído, para parecer operação real
    // em vez de linha reta de gerador.
    const base = 38_000_00 + i * 2_400_00;
    const ruido = (aleatorio() - 0.45) * 9_000_00;
    const faturamentoCentavos = Math.round(base + ruido);

    // Carga efetiva entre 8% e 11%, faixa plausível para Simples Nacional.
    const aliquota = 0.08 + aleatorio() * 0.03;

    return {
      mes: NOMES_MES[indiceMes],
      competencia,
      faturamentoCentavos,
      impostosCentavos: Math.round(faturamentoCentavos * aliquota),
    };
  });
}
