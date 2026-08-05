/**
 * Prova, contra o banco de verdade, as três afirmações que sustentam a decisão
 * de arquivar em vez de excluir:
 *
 *  1. O DELETE é MESMO recusado quando o cliente tem histórico.
 *  2. Arquivar troca só o status e não perde nada.
 *  3. Reativar devolve o cliente como estava.
 *
 * Mais a contraprova de 1: sem ela, um DELETE recusado por PERMISSÃO passaria
 * como se fosse a chave estrangeira fazendo o trabalho, e o teste diria "sim"
 * pelo motivo errado.
 *
 * Descarta tudo que cria e restaura o que altera.
 */
import { carregarEnvLocal } from "./_env.mjs";
carregarEnvLocal();

const { neon } = await import("@neondatabase/serverless");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL nao definida. Confira o .env.local.");
  process.exit(1);
}
const sql = neon(url);
const PROC_TESTE = "proc-teste-arquivar";

function ok(condicao: boolean, texto: string) {
  console.log(`${condicao ? "  PASSOU" : "  FALHOU"}  ${texto}`);
  if (!condicao) process.exitCode = 1;
}

const [alvo] = (await sql`
  SELECT id, nome_fantasia, status FROM clientes ORDER BY id LIMIT 1
`) as { id: string; nome_fantasia: string; status: string }[];

if (!alvo) {
  console.log("Carteira vazia. Nada a testar.");
  process.exit(1);
}
console.log(`Alvo: ${alvo.nome_fantasia} (id ${alvo.id}, status "${alvo.status}")\n`);

try {
  // ---- 1. Com histórico, o banco tem que RECUSAR o DELETE.
  console.log("1. DELETE com histórico");
  await sql`
    INSERT INTO processos (id, cliente_id, tipo, titulo, aberto_em)
    VALUES (${PROC_TESTE}, ${alvo.id}, 'abertura', 'Processo de teste', current_date)
  `;

  let recusou = false;
  let motivo = "";
  try {
    await sql`DELETE FROM clientes WHERE id = ${alvo.id}`;
  } catch (e) {
    recusou = true;
    motivo = (e instanceof Error ? e.message : String(e)).split("\n")[0];
  }
  ok(recusou, "banco recusa apagar cliente que tem processo");
  if (recusou) console.log(`          banco disse: ${motivo}`);

  const [existe] = (await sql`
    SELECT count(*)::int AS n FROM clientes WHERE id = ${alvo.id}
  `) as { n: number }[];
  ok(existe.n === 1, "cliente continua no banco depois da tentativa");

  // ---- Contraprova: SEM histórico, o DELETE tem que FUNCIONAR.
  // É o que separa "a FK barrou" de "o usuário do banco não pode apagar".
  console.log("\n1b. Contraprova: DELETE sem histórico");
  await sql`DELETE FROM processos WHERE id = ${PROC_TESTE}`;

  const salvo = (await sql`SELECT * FROM clientes WHERE id = ${alvo.id}`) as Record<
    string,
    unknown
  >[];
  await sql`DELETE FROM clientes WHERE id = ${alvo.id}`;
  const [sumiu] = (await sql`
    SELECT count(*)::int AS n FROM clientes WHERE id = ${alvo.id}
  `) as { n: number }[];
  ok(sumiu.n === 0, "sem histórico o DELETE passa (logo, quem barrou foi a FK)");

  // Devolve na hora, com todos os campos originais.
  const cols = Object.keys(salvo[0]);
  await sql.query(
    `INSERT INTO clientes (${cols.join(",")}) VALUES (${cols
      .map((_, i) => `$${i + 1}`)
      .join(",")})`,
    cols.map((c) => salvo[0][c]),
  );
  const [voltou] = (await sql`
    SELECT count(*)::int AS n FROM clientes WHERE id = ${alvo.id}
  `) as { n: number }[];
  ok(voltou.n === 1, "cliente devolvido ao banco inteiro");

  // ---- 2. Arquivar mexe SÓ no status.
  console.log("\n2. Arquivar");
  const antes = (await sql`SELECT * FROM clientes WHERE id = ${alvo.id}`) as Record<
    string,
    unknown
  >[];
  await sql`
    UPDATE clientes SET status = 'inativo', atualizado_em = now() WHERE id = ${alvo.id}
  `;
  const depois = (await sql`SELECT * FROM clientes WHERE id = ${alvo.id}`) as Record<
    string,
    unknown
  >[];

  ok(depois[0].status === "inativo", 'status virou "inativo"');

  const ignorar = new Set(["status", "atualizado_em"]);
  const mudaram = Object.keys(antes[0]).filter(
    (k) => !ignorar.has(k) && String(antes[0][k]) !== String(depois[0][k]),
  );
  ok(mudaram.length === 0, "nenhum outro campo do cadastro foi tocado");
  if (mudaram.length) console.log(`          mudaram: ${mudaram.join(", ")}`);

  // ---- 3. Reativar volta ao estado original.
  console.log("\n3. Reativar");
  await sql`
    UPDATE clientes SET status = ${alvo.status}, atualizado_em = now() WHERE id = ${alvo.id}
  `;
  const [fim] = (await sql`
    SELECT status FROM clientes WHERE id = ${alvo.id}
  `) as { status: string }[];
  ok(fim.status === alvo.status, `status de volta em "${alvo.status}"`);
} finally {
  // Rede de segurança: qualquer saída deixa o banco limpo.
  await sql`DELETE FROM processos WHERE id = ${PROC_TESTE}`;
  const [n] = (await sql`SELECT count(*)::int AS n FROM clientes`) as { n: number }[];
  console.log(`\nCarteira ao final: ${n.n} clientes.`);
}
