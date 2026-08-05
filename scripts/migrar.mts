/**
 * Aplica o esquema no banco.
 *
 * Idempotente: o `schema.sql` inteiro usa `CREATE TABLE IF NOT EXISTS` e
 * `CREATE INDEX IF NOT EXISTS`, então rodar de novo não duplica nem apaga.
 *
 * Uso: `npm run migrar`
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { carregarEnvLocal } from "./_env.mjs";

carregarEnvLocal();

const { neon } = await import("@neondatabase/serverless");

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL não está definida. Coloque no .env.local antes de migrar.",
  );
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const caminho = path.join(process.cwd(), "src/dominio/banco/schema.sql");
const script = readFileSync(caminho, "utf-8");

/*
  O driver HTTP do Neon não aceita várias instruções numa chamada só, então o
  arquivo é dividido por `;` no fim da linha. Isso funciona porque o schema não
  tem função nem bloco `$$ ... $$`, onde o ponto e vírgula é interno — se um dia
  tiver, esta divisão quebra e é aqui que se olha.

  Os comentários saem ANTES da divisão, e não depois. A primeira versão deste
  script descartava qualquer trecho que COMEÇASSE com comentário, e como cada
  tabela do schema é precedida de um bloco explicativo, ele engoliu as tabelas
  junto — `usuarios` e `sessoes` simplesmente não foram criadas, e o erro só
  apareceu no índice que dependia delas.
*/
const semComentarios = script
  .replace(/\/\*[\s\S]*?\*\//g, "") // blocos /* ... */
  .replace(/^\s*--.*$/gm, ""); // linhas iniciadas por --

const instrucoes = semComentarios
  .split(/;\s*$/m)
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

console.log(`Aplicando ${instrucoes.length} instruções...\n`);

let criadas = 0;
for (const instrucao of instrucoes) {
  const nome =
    /CREATE\s+(?:UNIQUE\s+)?(TABLE|INDEX|SEQUENCE)\s+(?:IF NOT EXISTS\s+)?(\S+)/i.exec(
      instrucao,
    );
  try {
    await sql.query(instrucao);
    if (nome) {
      console.log(`  ok  ${nome[1].toLowerCase()} ${nome[2]}`);
      criadas++;
    }
  } catch (erro) {
    console.error(`\nFALHOU: ${nome?.[2] ?? instrucao.slice(0, 60)}`);
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  }
}

// Confere de verdade contra o catálogo do Postgres, em vez de confiar em não
// ter dado erro: `IF NOT EXISTS` não distingue "criou" de "já existia".
const tabelas = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' ORDER BY table_name
`;

console.log(`\n${criadas} instruções de criação executadas.`);
console.log(`\nTabelas no banco (${tabelas.length}):`);
for (const t of tabelas) console.log(`  - ${t.table_name}`);
