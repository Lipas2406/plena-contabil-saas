"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/kernel/cn";

/**
 * Anel de progresso animado.
 *
 * Técnica: um círculo SVG com `strokeDasharray` igual ao perímetro e
 * `strokeDashoffset` animado do perímetro (vazio) até o valor final. É o
 * jeito mais barato de animar arco, porque o navegador interpola um número
 * só e a GPU cuida do resto, sem recalcular caminho a cada frame.
 *
 * O `-rotate-90` no SVG é o que faz o preenchimento começar às 12h em vez
 * das 3h, que é onde um SVG naturalmente começa.
 */

interface ProgressoCircularProps {
  /** 0 a 1. Valores fora da faixa são presos, não estouram o desenho. */
  valor: number;
  tamanho?: number;
  espessura?: number;
  /** Classe de cor aplicada ao traço, ex: "text-ok". */
  className?: string;
  /** Conteúdo central, geralmente o número. */
  children?: ReactNode;
  /** Pulsa devagar. Use quando o prazo estiver crítico. */
  pulsar?: boolean;
  rotuloAcessivel?: string;
}

export function ProgressoCircular({
  valor,
  tamanho = 72,
  espessura = 6,
  className,
  children,
  pulsar = false,
  rotuloAcessivel,
}: ProgressoCircularProps) {
  const reduzir = useReducedMotion();
  const preso = Math.min(1, Math.max(0, valor));
  const raio = (tamanho - espessura) / 2;
  const perimetro = 2 * Math.PI * raio;
  const deslocamento = perimetro * (1 - preso);

  return (
    <div
      className={cn("relative inline-grid place-items-center", pulsar && "pulso-critico")}
      style={{ width: tamanho, height: tamanho }}
      role="progressbar"
      aria-valuenow={Math.round(preso * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={rotuloAcessivel}
    >
      <svg
        width={tamanho}
        height={tamanho}
        className="-rotate-90"
        aria-hidden
      >
        {/* Trilho */}
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          strokeWidth={espessura}
          className="stroke-white/8"
        />
        {/* Preenchimento */}
        <motion.circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={perimetro}
          initial={{ strokeDashoffset: reduzir ? deslocamento : perimetro }}
          animate={{ strokeDashoffset: deslocamento }}
          transition={
            reduzir
              ? { duration: 0 }
              : { duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }
          }
          className={cn("stroke-current", className)}
        />
      </svg>

      {children && (
        <div className="absolute inset-0 grid place-items-center">{children}</div>
      )}
    </div>
  );
}
