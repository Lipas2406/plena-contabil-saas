/**
 * Cria a conta de acesso ao sistema.
 *
 * Existe como script de linha de comando, e não como tela, de propósito: este
 * sistema **não tem auto-cadastro** e não deve ter. Quem entra é quem a
 * contadora autorizar, e a porta de criação fica fora da internet.
 *
 * Uso:
 *   npm run criar-usuario -- --email marta@exemplo.com --nome "Marta" --senha "..."
 *
 * Por padrão o usuário nasce com papel "escritorio" (acesso interno). Para
 * criar um acesso de cliente, que só vê o próprio painel:
 *   npm run criar-usuario -- --email marta@exemplo.com --nome "Marta" \
 *     --papel cliente --cliente-id cli-003
 *
 * A senha pode ser omitida; nesse caso é pedida no terminal, sem aparecer na
 * tela e sem ficar no histórico do shell — que é o motivo de existir esse modo.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { carregarEnvLocal } from "./_env.mjs";

carregarEnvLocal();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não está definida.");
  process.exit(1);
}

const { criarUsuario, trocarSenha, existeAlgumUsuario } = await import(
  "@/dominio/banco/usuarios"
);
const { SENHA_MINIMA } = await import("@/dominio/banco/senha");

// ---------- argumentos ----------
const args = process.argv.slice(2);
const valor = (nome: string) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const email = valor("email");
const nome = valor("nome");
const trocar = args.includes("--trocar-senha");
let senha = valor("senha");
const papel = valor("papel");
const clienteId = valor("cliente-id");

if (!email || (!nome && !trocar)) {
  console.error(
    'Uso: npm run criar-usuario -- --email <e-mail> --nome "<nome>" [--senha <senha>] [--papel escritorio|cliente] [--cliente-id <id>]\n' +
      "     npm run criar-usuario -- --email <e-mail> --trocar-senha",
  );
  process.exit(1);
}

if (papel && papel !== "escritorio" && papel !== "cliente") {
  console.error('--papel precisa ser "escritorio" ou "cliente".');
  process.exit(1);
}

if (papel === "cliente" && !clienteId) {
  console.error("--papel cliente exige --cliente-id <id>.");
  process.exit(1);
}

// ---------- senha ----------
if (!senha) {
  const rl = createInterface({ input: stdin, output: stdout });
  senha = await rl.question("Senha (será gravada como hash, não em texto): ");
  const repetida = await rl.question("Repita a senha: ");
  rl.close();
  if (senha !== repetida) {
    console.error("\nAs senhas não conferem. Nada foi gravado.");
    process.exit(1);
  }
}

if (senha.length < SENHA_MINIMA) {
  console.error(`\nA senha precisa ter ao menos ${SENHA_MINIMA} caracteres.`);
  process.exit(1);
}

// ---------- ação ----------
try {
  if (trocar) {
    await trocarSenha(email, senha);
    console.log(`\nSenha trocada para ${email}.`);
  } else {
    const primeiro = !(await existeAlgumUsuario());
    const u = await criarUsuario({
      email,
      nome: nome!,
      senha,
      papel: papel as "escritorio" | "cliente" | undefined,
      clienteId,
    });
    console.log(`\nUsuário criado: ${u.nome} <${u.email}>`);
    console.log(`  id:        ${u.id}`);
    console.log(`  papel:     ${u.papel}`);
    if (u.clienteId) console.log(`  clienteId: ${u.clienteId}`);
    if (primeiro) console.log("\n  (é o primeiro usuário do sistema)");
  }
  console.log(
    "\nA senha foi gravada como hash scrypt com sal próprio. Ela não pode ser\n" +
      "lida de volta do banco — se for esquecida, o caminho é --trocar-senha.",
  );
} catch (erro) {
  const msg = erro instanceof Error ? erro.message : String(erro);
  if (msg.includes("usuarios_email_key") || msg.includes("duplicate key")) {
    console.error(
      `\nJá existe usuário com o e-mail ${email}.\n` +
        `Para trocar a senha dele: npm run criar-usuario -- --email ${email} --trocar-senha`,
    );
  } else {
    console.error(`\nFalhou: ${msg}`);
  }
  process.exit(1);
}
