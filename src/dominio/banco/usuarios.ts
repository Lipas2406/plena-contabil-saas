import { obterSql, novoId } from "@/dominio/banco/conexao";
import {
  conferirSenha,
  criarHashSenha,
  gerarTokenSessao,
} from "@/dominio/banco/senha";

/**
 * Usuários e sessões.
 *
 * Sessão em TABELA, não em token assinado. A diferença que importa: com tabela
 * dá para revogar de verdade, apagando a linha. Token assinado só expira, e
 * "sair de todos os dispositivos" viraria uma lista de revogação — que é esta
 * tabela, com passos a mais.
 */

/** Quanto tempo a sessão dura sem novo login. */
const DIAS_DE_SESSAO = 30;

export type PapelUsuario = "escritorio" | "cliente";

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  papel: PapelUsuario;
  clienteId: string | null;
  ativo: boolean;
}

interface LinhaUsuario {
  id: string;
  email: string;
  nome: string;
  papel: string;
  cliente_id: string | null;
  ativo: boolean;
  senha_hash?: string;
  senha_salt?: string;
}

function paraDominio(l: LinhaUsuario): Usuario {
  return {
    id: l.id,
    email: l.email,
    nome: l.nome,
    papel: l.papel as PapelUsuario,
    clienteId: l.cliente_id,
    ativo: l.ativo,
  };
}

/** E-mail é identidade: sempre em minúsculas e sem espaço nas pontas. */
function normalizarEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Cria usuário. Usado pelo script de criação da conta, não pela interface —
 * este sistema não tem auto-cadastro, e não deve ter: quem entra é quem a
 * contadora autorizar.
 */
export async function criarUsuario(dados: {
  email: string;
  nome: string;
  senha: string;
  papel?: PapelUsuario;
  clienteId?: string | null;
}): Promise<Usuario> {
  const sql = obterSql();
  const { hash, sal } = await criarHashSenha(dados.senha);

  const linhas = (await sql`
    INSERT INTO usuarios (id, email, nome, senha_hash, senha_salt, papel, cliente_id)
    VALUES (
      ${novoId("usr")}, ${normalizarEmail(dados.email)}, ${dados.nome.trim()},
      ${hash}, ${sal}, ${dados.papel ?? "escritorio"}, ${dados.clienteId ?? null}
    )
    RETURNING id, email, nome, papel, cliente_id, ativo
  `) as LinhaUsuario[];

  return paraDominio(linhas[0]);
}

/** Troca a senha de quem já existe. */
export async function trocarSenha(email: string, senhaNova: string) {
  const sql = obterSql();
  const { hash, sal } = await criarHashSenha(senhaNova);
  const linhas = (await sql`
    UPDATE usuarios SET senha_hash = ${hash}, senha_salt = ${sal}
    WHERE email = ${normalizarEmail(email)}
    RETURNING id
  `) as { id: string }[];
  if (linhas.length === 0) throw new Error(`Usuário ${email} não existe.`);
}

/**
 * Confere e-mail e senha.
 *
 * Devolve `null` tanto para e-mail inexistente quanto para senha errada, de
 * propósito: distinguir os dois na resposta conta a quem tenta adivinhar quais
 * e-mails existem no sistema.
 *
 * O hash é conferido mesmo quando o usuário não existe — com um hash falso —
 * para o tempo de resposta não denunciar a diferença. Sem isso, "e-mail não
 * existe" responde em 1ms e "senha errada" em 140ms, e essa diferença é
 * medível pela rede.
 */
export async function autenticar(
  email: string,
  senha: string,
): Promise<Usuario | null> {
  const sql = obterSql();
  const linhas = (await sql`
    SELECT id, email, nome, papel, cliente_id, ativo, senha_hash, senha_salt
    FROM usuarios WHERE email = ${normalizarEmail(email)} AND ativo = true
  `) as LinhaUsuario[];

  const guardada = linhas[0]
    ? { hash: linhas[0].senha_hash!, sal: linhas[0].senha_salt! }
    : { hash: "00".repeat(64), sal: "00".repeat(16) };

  const confere = await conferirSenha(senha, guardada);
  if (!linhas[0] || !confere) return null;

  await sql`UPDATE usuarios SET ultimo_acesso = now() WHERE id = ${linhas[0].id}`;
  return paraDominio(linhas[0]);
}

/** Abre sessão e devolve o token que vai para o cookie. */
export async function abrirSessao(usuarioId: string): Promise<string> {
  const sql = obterSql();
  const token = gerarTokenSessao();
  const expira = new Date(Date.now() + DIAS_DE_SESSAO * 86_400_000);

  await sql`
    INSERT INTO sessoes (token, usuario_id, expira_em)
    VALUES (${token}, ${usuarioId}, ${expira.toISOString()})
  `;
  return token;
}

/**
 * Quem é o dono deste token, se a sessão ainda vale.
 *
 * A expiração é checada no SQL, não em JavaScript: comparar no banco usa o
 * relógio do banco, que é o mesmo para todas as instâncias da aplicação.
 */
export async function usuarioDaSessao(
  token: string | undefined,
): Promise<Usuario | null> {
  if (!token) return null;
  const sql = obterSql();
  const linhas = (await sql`
    SELECT u.id, u.email, u.nome, u.papel, u.cliente_id, u.ativo
    FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
    WHERE s.token = ${token} AND s.expira_em > now() AND u.ativo = true
  `) as LinhaUsuario[];
  return linhas[0] ? paraDominio(linhas[0]) : null;
}

/** Encerra uma sessão. A linha some, então o token morre de verdade. */
export async function fecharSessao(token: string | undefined): Promise<void> {
  if (!token) return;
  const sql = obterSql();
  await sql`DELETE FROM sessoes WHERE token = ${token}`;
}

/**
 * Remove sessões vencidas.
 *
 * Não é urgente para funcionar — `usuarioDaSessao` já ignora as vencidas — mas
 * sem isso a tabela cresce para sempre.
 */
export async function limparSessoesVencidas(): Promise<number> {
  const sql = obterSql();
  const linhas = (await sql`
    DELETE FROM sessoes WHERE expira_em <= now() RETURNING token
  `) as { token: string }[];
  return linhas.length;
}

/** Existe algum usuário cadastrado? Decide se o sistema precisa ser iniciado. */
export async function existeAlgumUsuario(): Promise<boolean> {
  const sql = obterSql();
  const linhas = (await sql`SELECT 1 FROM usuarios LIMIT 1`) as unknown[];
  return linhas.length > 0;
}
