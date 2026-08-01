import { z } from "zod";
import { createTool } from "@voltagent/core";

/**
 * O padrão de ferramenta do repositório.
 *
 * ============================================================
 * ESTE É O ÚNICO ARQUIVO QUE IMPORTA DO FRAMEWORK DE AGENTE.
 * ============================================================
 *
 * Motivo: `@voltagent/core` está preso em `ai@6` enquanto o AI SDK já vai no
 * 7. Essa troca provavelmente vai acontecer. Quando acontecer, reescrever
 * `paraFramework()` aqui embaixo resolve o repositório inteiro, e nenhuma
 * regra de negócio precisa ser tocada.
 *
 * O ganho secundário é maior que o primário: como `executar` é função pura,
 * dá para testar toda a regra de negócio sem subir LLM e sem gastar token.
 * Ferramenta escrita direto no framework só é testável com o modelo rodando,
 * o que na prática significa que não é testada.
 *
 * Uso: `npm run verificar` chama `.puro` de cada ferramenta direto.
 * Ver `scripts/verificar.mts`.
 */

/**
 * `TRetorno` é o tipo de retorno EXATO de `executar`, não o valor resolvido.
 *
 * Foi assim de propósito. Se o tipo fosse `TSaida | Promise<TSaida>`, quem
 * chama `.puro` seria obrigado a tratar Promise mesmo quando a regra é
 * síncrona, e isso mata a ergonomia justamente do ponto principal do padrão.
 * Regra síncrona continua síncrona; assíncrona continua assíncrona.
 */
export interface DefinicaoFerramenta<TParams extends z.ZodTypeAny, TRetorno> {
  /** Nome que o modelo usa para chamar. snake_case, sem acento. */
  nome: string;
  /** Quando usar. É isto que o modelo lê para decidir, então seja explícito. */
  descricao: string;
  parametros: TParams;
  /** A regra de negócio. Pura, sem saber que existe LLM. Pode ser async. */
  executar: (entrada: z.infer<TParams>) => TRetorno;
}

/**
 * O tipo do invólucro no framework atual. Apelidado aqui de propósito: é a
 * única referência ao tipo do VoltAgent em todo o repositório, então a troca
 * de framework tem um alvo só.
 */
export type ToolDoFramework = ReturnType<typeof createTool>;

export interface Ferramenta<TParams extends z.ZodTypeAny, TRetorno>
  extends DefinicaoFerramenta<TParams, TRetorno> {
  /**
   * A regra pura, exposta para uso direto: teste, rota de API, render no
   * servidor. Chamar isto não gasta token nem depende de chave de API.
   * É aqui que a tipagem forte importa, e aqui ela é preservada inteira.
   */
  puro: (entrada: z.infer<TParams>) => TRetorno;
  /** O invólucro que o agente consome. Descartável por definição. */
  tool: ToolDoFramework;
}

/**
 * Adapta uma definição neutra para o framework de agente atual.
 *
 * O cast é deliberado e está confinado a esta função. `createTool` devolve
 * um tipo parametrizado pelo schema, e propagar esse genérico para cima
 * infecta todo o repositório com tipos do VoltAgent, que é exatamente o que
 * esta camada existe para evitar. A validação de verdade é em runtime, feita
 * pelo Zod de `parametros`, e essa continua intacta.
 */
function paraFramework<TParams extends z.ZodTypeAny, TRetorno>(
  def: DefinicaoFerramenta<TParams, TRetorno>,
): ToolDoFramework {
  return createTool({
    name: def.nome,
    description: def.descricao,
    parameters: def.parametros,
    // O await aqui é o que uniformiza: regra síncrona e assíncrona chegam
    // no framework do mesmo jeito, sem o chamador de `.puro` pagar por isso.
    execute: async (entrada: unknown) =>
      await def.executar(entrada as z.infer<TParams>),
  }) as unknown as ToolDoFramework;
}

export function definirFerramenta<TParams extends z.ZodTypeAny, TRetorno>(
  def: DefinicaoFerramenta<TParams, TRetorno>,
): Ferramenta<TParams, TRetorno> {
  return { ...def, puro: def.executar, tool: paraFramework(def) };
}

/**
 * Extrai os invólucros de uma lista de ferramentas, para passar ao agente.
 *
 * Aceita qualquer coisa que tenha `tool`, em vez de `Ferramenta<...>`. Motivo:
 * `TParams` aparece como parâmetro e como retorno em `executar`, então o tipo
 * é invariante e uma lista heterogênea de ferramentas nunca casaria com um
 * supertipo comum. Estruturar por campo resolve sem `any`.
 */
export function tools(lista: readonly { tool: ToolDoFramework }[]) {
  return lista.map((f) => f.tool);
}

/**
 * Resultado padrão de "não achei", em vez de lançar exceção.
 *
 * Aprendizado que vale carregar: LLM lida muito melhor com um objeto dizendo
 * "não encontrei, confirme o dado" do que com uma tool que estourou erro.
 * Exceção vira falha opaca e o modelo costuma alucinar para preencher o vazio.
 */
export function naoEncontrado(mensagem: string) {
  return { encontrado: false as const, mensagem };
}
