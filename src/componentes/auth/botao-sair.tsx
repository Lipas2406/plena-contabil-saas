"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { sair } from "@/dominio/acoes/auth";

/**
 * Botão de sair.
 *
 * `useTransition` em vez de `<form action={sair}>` porque este botão vive
 * dentro da barra lateral, e um `<form>` ali herdaria estilo de formulário e
 * quebraria o alinhamento dos itens vizinhos. O efeito é o mesmo: a ação roda
 * no servidor, apaga a sessão e redireciona.
 *
 * O estado `pendente` importa mais aqui do que parece: sair envolve uma ida ao
 * banco, e sem o bloqueio dá para clicar duas vezes — a segunda chamada
 * tentaria apagar uma sessão que já não existe.
 */
export function BotaoSair({ aoNavegar }: { aoNavegar?: () => void }) {
  const [pendente, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => {
        aoNavegar?.();
        iniciar(() => {
          void sair();
        });
      }}
      className="flex w-full items-center gap-3 rounded-[var(--radius-card)] px-3 py-2.5 text-left text-sm font-medium text-texto-suave transition-colors hover:bg-white/5 hover:text-texto disabled:pointer-events-none disabled:opacity-45"
    >
      <LogOut className="size-[18px]" aria-hidden />
      {pendente ? "Saindo..." : "Sair"}
    </button>
  );
}
