/**
 * Dia útil bancário no Brasil.
 *
 * Mora no kernel porque não sabe nada de contabilidade: é calendário
 * brasileiro, serve a qualquer projeto. Ver src/kernel/README.md.
 *
 * Cobre apenas os feriados NACIONAIS. Feriado estadual e municipal não estão
 * aqui de propósito: dependem do município do cliente, e chutar produziria
 * vencimento errado com cara de certo. Quando isso importar, entra como tabela
 * por ente, não como constante.
 */

/**
 * Domingo de Páscoa, pelo algoritmo de Meeus/Jones/Butcher.
 *
 * Existe porque quatro feriados nacionais dependem dele: Carnaval, Sexta-feira
 * Santa e Corpus Christi mudam de data todo ano. Sem isso, uma tabela fixa de
 * feriados fica errada no ano seguinte, em silêncio.
 */
export function domingoDePascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function somarDias(d: Date, dias: number): Date {
  const nova = new Date(d.getTime());
  nova.setUTCDate(nova.getUTCDate() + dias);
  return nova;
}

const cacheFeriados = new Map<number, Set<string>>();

/**
 * Feriados nacionais do ano, em YYYY-MM-DD.
 *
 * Sexta-feira Santa e Corpus Christi são feriados bancários; a terça de
 * Carnaval é ponto facultativo que na prática fecha banco, e a segunda também.
 * Incluímos os dois porque, para efeito de vencimento, o que importa é se há
 * expediente bancário.
 */
export function feriadosNacionais(ano: number): Set<string> {
  const emCache = cacheFeriados.get(ano);
  if (emCache) return emCache;

  const pascoa = domingoDePascoa(ano);
  const datas = [
    `${ano}-01-01`, // Confraternização Universal
    `${ano}-04-21`, // Tiradentes
    `${ano}-05-01`, // Dia do Trabalho
    `${ano}-09-07`, // Independência
    `${ano}-10-12`, // Nossa Senhora Aparecida
    `${ano}-11-02`, // Finados
    `${ano}-11-15`, // Proclamação da República
    `${ano}-11-20`, // Consciência Negra (nacional desde 2024, Lei 14.759/2023)
    `${ano}-12-25`, // Natal
    iso(somarDias(pascoa, -48)), // segunda de Carnaval
    iso(somarDias(pascoa, -47)), // terça de Carnaval
    iso(somarDias(pascoa, -2)), // Sexta-feira Santa
    iso(somarDias(pascoa, 60)), // Corpus Christi
  ];

  const conjunto = new Set(datas);
  cacheFeriados.set(ano, conjunto);
  return conjunto;
}

/** Uma data com expediente bancário? Sábado, domingo e feriado nacional não têm. */
export function ehDiaUtil(data: Date): boolean {
  const diaSemana = data.getUTCDay();
  if (diaSemana === 0 || diaSemana === 6) return false;
  return !feriadosNacionais(data.getUTCFullYear()).has(iso(data));
}

/**
 * Como uma obrigação se comporta quando o vencimento cai em dia sem expediente.
 *
 * São três estados, não um booleano, e essa foi a descoberta mais cara do
 * levantamento de 04/08/2026: na competência maio/2026, o INSS venceu numa
 * sexta (antecipou) e o DAS na segunda (prorrogou). Mesmo dia nominal, sentidos
 * opostos, três dias de diferença.
 *
 * - `antecipa`: vai para o dia útil ANTERIOR. Tributo federal da empresa, FGTS.
 * - `prorroga`: vai para o dia útil SEGUINTE. DAS do Simples e do MEI, GPS de PF.
 * - `fixo`: não desloca. Declaração transmitida online não depende de banco —
 *   31/05/2026 caiu num domingo e continuou sendo 31/05.
 */
export type AjusteDiaNaoUtil = "antecipa" | "prorroga" | "fixo";

/** Aplica a regra de ajuste a uma data de vencimento. */
export function ajustarVencimento(
  data: Date,
  ajuste: AjusteDiaNaoUtil,
): Date {
  if (ajuste === "fixo") return data;
  const passo = ajuste === "antecipa" ? -1 : 1;
  let cursor = data;
  // O laço existe porque feriado emenda com fim de semana: 1º de maio numa
  // sexta joga para quinta; véspera de Natal pode andar mais de um dia.
  let guarda = 0;
  while (!ehDiaUtil(cursor)) {
    cursor = somarDias(cursor, passo);
    if (++guarda > 15) break; // rede de segurança contra laço infinito
  }
  return cursor;
}

/** Último dia do mês (1-12), sem armadilha de fuso. */
export function ultimoDiaDoMes(ano: number, mes: number): Date {
  return new Date(Date.UTC(ano, mes, 0));
}

/** Último dia ÚTIL do mês. Prazo comum em obrigação acessória federal. */
export function ultimoDiaUtilDoMes(ano: number, mes: number): Date {
  return ajustarVencimento(ultimoDiaDoMes(ano, mes), "antecipa");
}

/**
 * N-ésimo dia útil do mês. Usado pela EFD-Contribuições (10º dia útil).
 * `n` começa em 1.
 */
export function enesimoDiaUtil(ano: number, mes: number, n: number): Date {
  let cursor = new Date(Date.UTC(ano, mes - 1, 1));
  let contados = 0;
  for (let i = 0; i < 62; i++) {
    if (ehDiaUtil(cursor)) {
      contados++;
      if (contados === n) return cursor;
    }
    cursor = somarDias(cursor, 1);
  }
  return cursor;
}
