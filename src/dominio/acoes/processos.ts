"use server";

import { revalidatePath } from "next/cache";
import { ArmazenamentoSomenteLeituraError } from "@/dominio/armazenamento-base";
import {
  encerrarProcesso,
  reabrirProcesso,
} from "@/dominio/armazenamento-processos";

export interface ResultadoProcesso {
  ok: boolean;
  erro?: string;
}

const AVISO_PUBLICADO =
  "Esta demonstração está publicada em modo somente leitura, então a alteração não é salva. Rodando local, ela funciona.";

function tratar(e: unknown): ResultadoProcesso {
  if (e instanceof ArmazenamentoSomenteLeituraError) {
    return { ok: false, erro: AVISO_PUBLICADO };
  }
  return { ok: false, erro: e instanceof Error ? e.message : "Falha ao salvar." };
}

/**
 * Dá um processo por concluído.
 *
 * Não apaga e não esconde: o trabalho continua na carteira com a data, e sai
 * das contagens de "em aberto". Todas as etapas passam a concluídas e
 * CONFIRMADAS, porque se a contadora diz que acabou, o andamento deixou de ser
 * estimativa e o aviso "Andamento a confirmar" some sozinho.
 */
export async function concluirProcesso(id: string): Promise<ResultadoProcesso> {
  if (!id) return { ok: false, erro: "Processo não identificado." };
  try {
    // Sem `await`, esta ação respondia { ok: true } ANTES de a gravação
    // terminar, o revalidatePath rodava em cima do estado velho e o catch
    // abaixo deixava de capturar: a rejeição virava erro solto no servidor e a
    // tela mostrava sucesso. O tsc não aponta isso — quem apontou foi o lint
    // com tipos ligado na fase 0.
    await encerrarProcesso(id);
  } catch (e) {
    return tratar(e);
  }
  revalidatePath("/escritorio");
  revalidatePath("/painel");
  return { ok: true };
}

/** Desfaz o encerramento. Clique errado não pode virar conserto em arquivo. */
export async function reabrir(id: string): Promise<ResultadoProcesso> {
  if (!id) return { ok: false, erro: "Processo não identificado." };
  try {
    await reabrirProcesso(id);
  } catch (e) {
    return tratar(e);
  }
  revalidatePath("/escritorio");
  revalidatePath("/painel");
  return { ok: true };
}
