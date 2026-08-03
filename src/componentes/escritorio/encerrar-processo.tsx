"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { cn } from "@/kernel/cn";
import { formatarData } from "@/kernel/datas";
import { concluirProcesso, reabrir } from "@/dominio/acoes/processos";
import type { Processo } from "@/dominio/tipos";

/**
 * Dar um processo por concluído, e desfazer.
 *
 * Fica no detalhe do cliente, junto do processo, e não numa tela de "encerrar"
 * separada: a decisão acontece olhando o andamento, não numa lista fora de
 * contexto.
 *
 * Pede confirmação porque encerrar marca TODAS as etapas como concluídas e
 * confirmadas de uma vez, inclusive as que estavam só estimadas. É a ação com
 * maior efeito da tela, e a única que muda dado que ela não digitou.
 */
export function EncerrarProcesso({
  processo,
  somenteLeitura,
}: {
  processo: Processo;
  somenteLeitura: boolean;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const encerrado = processo.encerradoEm !== null;

  function agir(acao: () => Promise<{ ok: boolean; erro?: string }>) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.erro ?? "Não deu para salvar.");
      setConfirmando(false);
    });
  }

  if (somenteLeitura) {
    return encerrado ? (
      <p className="mt-3 text-[11px] text-texto-suave">
        Concluído em {formatarData(processo.encerradoEm!)}.
      </p>
    ) : null;
  }

  if (encerrado) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-ok">
          <CheckCircle2 className="size-3.5" aria-hidden />
          Concluído em {formatarData(processo.encerradoEm!)}
        </span>
        <button
          type="button"
          disabled={pendente}
          onClick={() => agir(() => reabrir(processo.id))}
          className="inline-flex items-center gap-1 text-[11px] text-texto-suave underline-offset-2 hover:text-texto hover:underline disabled:opacity-50"
        >
          <RotateCcw className="size-3" aria-hidden />
          reabrir
        </button>
        {erro && <p className="w-full text-[11px] text-critico">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="mt-3">
      {confirmando ? (
        <div className="rounded-lg border border-[var(--borda-suave)] bg-white/[0.02] p-2.5">
          <p className="text-[11px] text-texto">
            Concluir marca as {processo.etapas.length} etapas como concluídas e
            tira o processo do quadro. Dá para reabrir depois.
          </p>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              disabled={pendente}
              onClick={() => agir(() => concluirProcesso(processo.id))}
              className={cn(
                "rounded-md bg-ok/15 px-2.5 py-1 text-[11px] font-medium text-ok",
                "transition-colors hover:bg-ok/25 disabled:opacity-50",
              )}
            >
              {pendente ? "Concluindo..." : "Confirmar"}
            </button>
            <button
              type="button"
              disabled={pendente}
              onClick={() => setConfirmando(false)}
              className="text-[11px] text-texto-suave hover:text-texto disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
          {erro && <p className="mt-2 text-[11px] text-critico">{erro}</p>}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="inline-flex items-center gap-1.5 text-[11px] text-texto-suave underline-offset-2 hover:text-ok hover:underline"
        >
          <CheckCircle2 className="size-3.5" aria-hidden />
          Concluir este processo
        </button>
      )}
    </div>
  );
}
