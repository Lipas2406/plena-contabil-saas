"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/kernel/cn";

type Variante = "primario" | "secundario" | "fantasma" | "perigo";
type Tamanho = "sm" | "md" | "lg";

const VARIANTES: Record<Variante, string> = {
  // Dourado sólido, reservado para a ação principal da tela. Se dois botões
  // dourados aparecem juntos, um dos dois está errado.
  primario: cn(
    "bg-gradient-to-b from-acento-claro to-acento text-navy-deep font-semibold",
    "shadow-[0_8px_24px_-8px_rgba(201,168,76,0.6)]",
    "hover:shadow-[0_12px_32px_-8px_rgba(201,168,76,0.75)]",
  ),
  // `vidro-acao` e não `vidro`: a superfície de painel some contra o fundo
  // (1.23:1) e o botão vira texto solto. Ver globals.css, --borda-acao.
  secundario: cn(
    "vidro-acao text-texto hover:border-[var(--borda-acao-hover)]",
    "hover:text-acento-claro",
  ),
  fantasma: "text-texto-suave hover:text-texto hover:bg-white/5",
  perigo: "bg-critico/15 text-critico border border-critico/30 hover:bg-critico/25",
};

const TAMANHOS: Record<Tamanho, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-7 text-base gap-2.5",
};

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: Tamanho;
  carregando?: boolean;
  iconeEsquerda?: ReactNode;
  iconeDireita?: ReactNode;
}

export const Botao = forwardRef<HTMLButtonElement, BotaoProps>(function Botao(
  {
    variante = "secundario",
    tamanho = "md",
    carregando = false,
    iconeEsquerda,
    iconeDireita,
    className,
    children,
    disabled,
    ...resto
  },
  ref,
) {
  const reduzir = useReducedMotion();

  return (
    <motion.button
      ref={ref}
      // O whileTap é o que dá sensação de peso físico. Some com reduced motion.
      whileTap={reduzir || disabled || carregando ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      disabled={disabled || carregando}
      // `aria-busy` porque o spinner é decorativo: sem isso, leitor de tela
      // anuncia um botão aparentemente normal que não responde.
      aria-busy={carregando}
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-pill)]",
        "whitespace-nowrap transition-all duration-200 select-none",
        "disabled:pointer-events-none disabled:opacity-45",
        TAMANHOS[tamanho],
        VARIANTES[variante],
        className,
      )}
      {...(resto as React.ComponentProps<typeof motion.button>)}
    >
      {carregando ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        iconeEsquerda
      )}
      {children}
      {!carregando && iconeDireita}
    </motion.button>
  );
});
