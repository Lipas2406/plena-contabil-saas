import { redirect } from "next/navigation";
import { buscarClientePorId } from "@/dominio/armazenamento-clientes";
import { exigirSessao } from "@/dominio/auth/sessao";

/**
 * Sessão do cliente logado no /painel.
 *
 * Resolve pelo usuário real da sessão (`exigirSessao`), não por um id fixo.
 * Um usuário com `papel !== "cliente"` (ou sem `clienteId`) não tem o que
 * fazer aqui e volta para o Escritório — sem isso, qualquer sessão válida
 * caía no mesmo cliente hardcoded, vendo dado de outra empresa.
 */

export async function clienteLogado() {
  const usuario = await exigirSessao();
  if (usuario.papel !== "cliente" || !usuario.clienteId) {
    redirect("/escritorio");
  }

  const cliente = await buscarClientePorId(usuario.clienteId);
  if (!cliente) {
    throw new Error(
      `Usuário ${usuario.id} aponta para o cliente ${usuario.clienteId}, que não existe mais.`,
    );
  }
  return cliente;
}

/** Primeiro nome do responsável, para saudação no topo do painel. */
export function primeiroNome(nomeCompleto: string) {
  return nomeCompleto.trim().split(/\s+/)[0];
}
