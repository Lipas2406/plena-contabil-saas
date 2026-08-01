import { Agent } from "@voltagent/core";

/**
 * Fábrica de agente com instanciação preguiçosa.
 *
 * Por que preguiçosa: route handler do App Router é avaliado durante o
 * `next build`. Instanciar o agente no topo do módulo quebra o build em
 * qualquer máquina sem a chave de API no ambiente, incluindo o CI. Já
 * aconteceu, por isso virou padrão.
 */
export function criarFabricaDeAgente(construir: () => Agent): () => Agent {
  let instancia: Agent | null = null;
  return () => (instancia ??= construir());
}

/**
 * Erro de configuração de ambiente, para a borda distinguir "faltou variável"
 * de "deu erro no modelo". A UI precisa dizer coisas diferentes nos dois casos.
 */
export class ConfiguracaoAusenteError extends Error {
  constructor(readonly variavel: string) {
    super(
      `${variavel} não configurada. Defina em .env.local para habilitar o recurso.`,
    );
    this.name = "ConfiguracaoAusenteError";
  }
}

/** Retorna a variável de ambiente ou null. A borda decide o que fazer. */
export function variavelOpcional(nome: string): string | null {
  const v = process.env[nome];
  return v && v.length > 0 ? v : null;
}
