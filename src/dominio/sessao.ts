import { buscarClientePorId } from "@/dominio/armazenamento-clientes";

/**
 * Sessão simulada.
 *
 * Não existe autenticação ainda. Isolar o "quem está logado" aqui significa
 * que trocar isto por sessão real (NextAuth, Clerk, cookie próprio) é mexer
 * num arquivo, e nenhuma tela precisa saber que a origem mudou.
 */

const ID_CLIENTE_LOGADO = "cli-003";

export async function clienteLogado() {
  const cliente = await buscarClientePorId(ID_CLIENTE_LOGADO);
  if (!cliente) {
    throw new Error(
      `Cliente ${ID_CLIENTE_LOGADO} não existe no mock. Ajuste src/dominio/sessao.ts.`,
    );
  }
  return cliente;
}

/** Primeiro nome do responsável, para saudação no topo do painel. */
export function primeiroNome(nomeCompleto: string) {
  return nomeCompleto.trim().split(/\s+/)[0];
}
