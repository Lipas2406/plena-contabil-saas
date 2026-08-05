/**
 * Semeia o banco a partir do que existe hoje em disco.
 *
 * **A fonte é `.dados/clientes.json`, não `mocks/clientes.ts`.** O arquivo tem
 * um cliente a mais que a semente — o `cli-007`, cadastrado pela contadora pela
 * própria tela. Semear do mock perderia justamente o único dado real da
 * carteira. Se o arquivo não existir, cai para o mock.
 *
 * Idempotente por REGISTRO, não por "a tabela está vazia": `ON CONFLICT (id) DO
 * NOTHING`. Contar linhas antes de inserir não serve, porque duas instâncias
 * frias veriam zero ao mesmo tempo e as duas inseririam.
 *
 * Uso: `npm run semear`
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { carregarEnvLocal } from "./_env.mjs";

carregarEnvLocal();

const { neon } = await import("@neondatabase/serverless");
const { CLIENTES } = await import("@/dominio/mocks/clientes");
type Cliente = (typeof CLIENTES)[number];

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não está definida.");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

// ---------- de onde vêm os dados ----------
const arquivo = path.join(process.cwd(), ".dados/clientes.json");
let origem: string;
let clientes: Cliente[];

if (existsSync(arquivo)) {
  clientes = JSON.parse(readFileSync(arquivo, "utf-8")) as Cliente[];
  origem = ".dados/clientes.json";
} else {
  clientes = CLIENTES;
  origem = "mocks/clientes.ts (o arquivo em disco não existe)";
}

console.log(`Origem: ${origem}`);
console.log(`Clientes a semear: ${clientes.length}\n`);

// ---------- inserção ----------
let inseridos = 0;
let jaExistiam = 0;

for (const c of clientes) {
  const linhas = await sql`
    INSERT INTO clientes (
      id, razao_social, nome_fantasia, tipo_pessoa, cnpj, cpf, atividade,
      natureza_juridica, porte, regime, status, atendimentos, servicos,
      responsavel, email, telefone, cliente_desde
    ) VALUES (
      ${c.id}, ${c.razaoSocial}, ${c.nomeFantasia}, ${c.tipoPessoa},
      ${c.cnpj}, ${c.cpf}, ${c.atividade}, ${c.naturezaJuridica},
      ${c.porte}, ${c.regime}, ${c.status},
      ${c.atendimentos}, ${c.servicos},
      ${c.responsavel}, ${c.email}, ${c.telefone}, ${c.clienteDesde}
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `;
  if (linhas.length > 0) {
    inseridos++;
    console.log(`  + ${c.id}  ${c.nomeFantasia}`);
  } else {
    jaExistiam++;
  }
}

/*
  Alinha a sequência com o maior id já gravado.

  Sem isto, o próximo cadastro nasceria como `cli-001` e bateria de frente com a
  restrição de chave primária. `setval` com `false` no terceiro argumento faz o
  PRÓXIMO `nextval` devolver exatamente esse número — então o cálculo é
  "maior + 1".
*/
const [{ maior }] = (await sql`
  SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\\D', '', 'g'), '')::bigint), 0) AS maior
  FROM clientes WHERE id ~ '^cli-[0-9]+$'
`) as { maior: number }[];

await sql`SELECT setval('clientes_seq', ${Number(maior) + 1}, false)`;

// ---------- conferência, contra o banco e não contra a memória ----------
const [{ total }] = (await sql`SELECT count(*)::int AS total FROM clientes`) as {
  total: number;
}[];

console.log(`\n${inseridos} inserido(s), ${jaExistiam} já existia(m).`);
console.log(`Total na tabela: ${total}`);
console.log(`Sequência ajustada: o próximo será cli-${String(Number(maior) + 1).padStart(3, "0")}`);

if (total < clientes.length) {
  console.error(
    `\nATENÇÃO: esperava ao menos ${clientes.length} e o banco tem ${total}.`,
  );
  process.exit(1);
}

// cli-003 é referenciado diretamente por sessao.ts. Sem ele, o painel do
// cliente devolve 500 em vez de tela vazia.
const [{ existe }] = (await sql`
  SELECT EXISTS(SELECT 1 FROM clientes WHERE id = 'cli-003') AS existe
`) as { existe: boolean }[];
console.log(`cli-003 presente (sessao.ts depende dele): ${existe}`);
if (!existe) process.exit(1);
