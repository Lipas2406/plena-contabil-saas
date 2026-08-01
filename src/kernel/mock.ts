/**
 * Geração de dados falsos que não envelhecem.
 *
 * O problema que isto resolve: mock com data fixa no código parece certo hoje
 * e mentiroso em dois meses. A demo abre com tudo vencido e parece bug.
 *
 * Solução: o seed guarda um **deslocamento em meses** em vez de uma data, e a
 * data é materializada na hora de ler. O painel sempre tem algo a vencer.
 *
 * Corolário importante: campo derivável **não vai no seed**. Status de prazo
 * sai do vencimento, não da mão de quem escreveu o mock. Mock com status
 * digitado sempre acaba divergindo da data e gera bug fantasma.
 */

/**
 * Data ISO no mês corrente deslocado por `offsetMeses`, no dia informado.
 *
 * Dia acima do último do mês transborda para o mês seguinte (comportamento
 * nativo de `Date.UTC`), o que é aceitável para seed: dia 31 em fevereiro
 * vira 03/03. Se precisar prender no último dia útil, isso é regra de
 * domínio e não pertence ao kernel.
 */
export function dataRelativa(
  offsetMeses: number,
  dia: number,
  hoje = new Date(),
) {
  return new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + offsetMeses, dia))
    .toISOString()
    .slice(0, 10);
}

/** Mês ISO (YYYY-MM) do mês corrente deslocado por `offsetMeses`. */
export function mesRelativo(offsetMeses: number, hoje = new Date()) {
  return new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + offsetMeses, 1))
    .toISOString()
    .slice(0, 7);
}

/**
 * PRNG determinístico (mulberry32). Para variar mock sem quebrar snapshot:
 * mesma semente, mesma sequência, em qualquer máquina e qualquer dia.
 * `Math.random()` em seed torna teste instável.
 */
export function geradorDeterministico(semente: number) {
  let estado = semente >>> 0;
  return function proximo() {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Escolhe um item de forma determinística a partir de um gerador. */
export function escolher<T>(itens: readonly T[], proximo: () => number): T {
  return itens[Math.floor(proximo() * itens.length)];
}
