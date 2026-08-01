"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/kernel/cn";

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo?: string;
  erro?: string;
  dica?: string;
  iconeEsquerda?: ReactNode;
  iconeDireita?: ReactNode;
}

export const Campo = forwardRef<HTMLInputElement, CampoProps>(function Campo(
  { rotulo, erro, dica, iconeEsquerda, iconeDireita, className, id, ...resto },
  ref,
) {
  // useId garante que rótulo e mensagem casem com o input mesmo com vários
  // campos iguais na tela, sem o chamador ter que inventar id único.
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const idMensagem = `${idCampo}-msg`;

  return (
    <div className="w-full">
      {rotulo && (
        <label
          htmlFor={idCampo}
          className="mb-1.5 block text-sm font-medium text-texto-suave"
        >
          {rotulo}
        </label>
      )}

      <div className="relative">
        {iconeEsquerda && (
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-texto-suave">
            {iconeEsquerda}
          </span>
        )}

        <input
          ref={ref}
          id={idCampo}
          aria-invalid={Boolean(erro)}
          aria-describedby={erro || dica ? idMensagem : undefined}
          className={cn(
            "h-11 w-full rounded-[var(--radius-card)] vidro",
            "text-sm text-texto placeholder:text-texto-suave/60",
            "transition-all duration-200 outline-none",
            "focus:border-[var(--borda-acento)] focus:ring-2 focus:ring-acento/25",
            "disabled:cursor-not-allowed disabled:opacity-50",
            iconeEsquerda ? "pl-10" : "pl-4",
            iconeDireita ? "pr-10" : "pr-4",
            erro && "border-critico/50 focus:ring-critico/25",
            className,
          )}
          {...resto}
        />

        {iconeDireita && (
          <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-texto-suave">
            {iconeDireita}
          </span>
        )}
      </div>

      {(erro || dica) && (
        <p
          id={idMensagem}
          // role="alert" só no erro: dica não deve interromper o leitor de tela.
          role={erro ? "alert" : undefined}
          className={cn(
            "mt-1.5 text-xs",
            erro ? "text-critico" : "text-texto-suave",
          )}
        >
          {erro ?? dica}
        </p>
      )}
    </div>
  );
});
