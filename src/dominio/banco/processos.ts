import { obterSql } from "@/dominio/banco/conexao";

/**
 * Sobreposição de processo, em Postgres.
 *
 * Guarda **só o que a contadora decidiu** — hoje, quais processos ela encerrou
 * e quando. O processo em si continua derivado da semente em código, com datas
 * relativas ao mês corrente.
 *
 * Isso é deliberado, e não preguiça de migrar: copiar o processo inteiro para o
 * banco congelaria as datas no dia da migração, e a demonstração voltaria a
 * envelhecer — que é exatamente o problema que o desenho atual resolve. Quando
 * processo virar dado real, cadastrado por ela em vez de semeado, as tabelas
 * `processos` e `etapas_processo` do schema entram em uso.
 */

export interface AlteracaoProcesso {
  encerradoEm: string;
}

export type Alteracoes = Record<string, AlteracaoProcesso>;

interface Linha {
  processo_id: string;
  encerrado_em: string | Date;
}

/** `date` do Postgres pode chegar como string ou Date, conforme o driver. */
function dataISO(valor: string | Date): string {
  if (typeof valor === "string") return valor.slice(0, 10);
  return `${valor.getUTCFullYear()}-${String(valor.getUTCMonth() + 1).padStart(2, "0")}-${String(valor.getUTCDate()).padStart(2, "0")}`;
}

export async function lerAlteracoes(): Promise<Alteracoes> {
  const sql = obterSql();
  const linhas = (await sql`
    SELECT processo_id, encerrado_em FROM processos_alteracoes
  `) as Linha[];

  const mapa: Alteracoes = {};
  for (const l of linhas) mapa[l.processo_id] = { encerradoEm: dataISO(l.encerrado_em) };
  return mapa;
}

/**
 * Marca um processo como encerrado.
 *
 * `ON CONFLICT DO UPDATE` em vez de reescrever o mapa inteiro: encerrar dois
 * processos ao mesmo tempo deixa de perder um dos dois, que era o risco do
 * ler-modificar-gravar anterior.
 */
export async function registrarEncerramento(
  id: string,
  encerradoEm: string,
): Promise<void> {
  const sql = obterSql();
  await sql`
    INSERT INTO processos_alteracoes (processo_id, encerrado_em)
    VALUES (${id}, ${encerradoEm})
    ON CONFLICT (processo_id) DO UPDATE SET encerrado_em = EXCLUDED.encerrado_em
  `;
}

/** Desfaz o encerramento. Uma linha some; nada mais é tocado. */
export async function removerEncerramento(id: string): Promise<void> {
  const sql = obterSql();
  await sql`DELETE FROM processos_alteracoes WHERE processo_id = ${id}`;
}
