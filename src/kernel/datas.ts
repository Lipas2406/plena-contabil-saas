/**
 * Data civil (YYYY-MM-DD), sem armadilha de fuso.
 *
 * Todo o módulo trabalha em UTC de propósito. Vencimento, competência e
 * aniversário são datas do calendário, não instantes no tempo. Usar horário
 * local faz `new Date("2026-08-20")` virar 19/08 às 21h no fuso de São Paulo,
 * e aí o status "vence hoje" muda sozinho no fim da tarde.
 */

/** Data de hoje em ISO (YYYY-MM-DD), pelo calendário UTC. */
export function hojeISO(hoje = new Date()) {
  return hoje.toISOString().slice(0, 10);
}

/**
 * Dias entre hoje e uma data ISO. Negativo significa que já passou.
 * Zero significa hoje.
 */
export function diasAte(iso: string, hoje = new Date()) {
  const alvo = Date.parse(`${iso}T00:00:00Z`);
  const base = Date.UTC(
    hoje.getUTCFullYear(),
    hoje.getUTCMonth(),
    hoje.getUTCDate(),
  );
  return Math.round((alvo - base) / 86_400_000);
}

/** ISO (YYYY-MM-DD) para DD/MM/AAAA, sem passar por Date. */
export function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** ISO (YYYY-MM) para MM/AAAA. Útil para competência mensal. */
export function formatarMes(iso: string) {
  const [ano, mes] = iso.split("-");
  return `${mes}/${ano}`;
}
