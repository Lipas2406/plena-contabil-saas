"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { cn } from "@/kernel/cn";

/**
 * Cartão de vidro com inclinação 3D e brilho de acento seguindo o cursor.
 *
 * Como funciona: a posição do mouse dentro do cartão vira dois motion values
 * normalizados (-0.5 a 0.5). Um alimenta rotateX/rotateY via spring, o outro
 * posiciona um brilho radial. Nada disso passa por estado do React, então o
 * movimento não dispara re-render, o que é o que mantém 60fps com vários
 * cartões na tela ao mesmo tempo.
 *
 * `useReducedMotion` desliga a inclinação inteira, não só a suaviza: efeito
 * de paralaxe é justamente o que incomoda quem tem sensibilidade vestibular.
 */

interface CartaoProps {
  children: ReactNode;
  className?: string;
  /** Desliga a inclinação 3D, mantendo o vidro. Use em áreas densas de texto. */
  semInclinacao?: boolean;
  /** Intensidade da inclinação em graus. */
  grausMaximos?: number;
  onClick?: () => void;
}

export function Cartao({
  children,
  className,
  semInclinacao = false,
  grausMaximos = 6,
  onClick,
}: CartaoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduzirMovimento = useReducedMotion();
  const inclinar = !semInclinacao && !reduzirMovimento;

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mola = { stiffness: 220, damping: 22, mass: 0.6 };
  const rotacaoX = useSpring(
    useTransform(y, [-0.5, 0.5], [grausMaximos, -grausMaximos]),
    mola,
  );
  const rotacaoY = useSpring(
    useTransform(x, [-0.5, 0.5], [-grausMaximos, grausMaximos]),
    mola,
  );

  // Posição do brilho em porcentagem, para o radial-gradient acompanhar o cursor.
  // `useMotionTemplate` reconstrói a string a cada frame sem passar por React;
  // ler com `.get()` dentro do style congelaria o valor no primeiro render.
  const brilhoX = useTransform(x, (v) => `${(v + 0.5) * 100}%`);
  const brilhoY = useTransform(y, (v) => `${(v + 0.5) * 100}%`);
  const fundoBrilho = useMotionTemplate`radial-gradient(340px circle at ${brilhoX} ${brilhoY}, var(--brilho-acento), transparent 70%)`;

  function aoMover(evento: React.MouseEvent<HTMLDivElement>) {
    if (!inclinar) return;
    const caixa = ref.current?.getBoundingClientRect();
    if (!caixa) return;
    x.set((evento.clientX - caixa.left) / caixa.width - 0.5);
    y.set((evento.clientY - caixa.top) / caixa.height - 0.5);
  }

  function aoSair() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={aoMover}
      onMouseLeave={aoSair}
      onClick={onClick}
      style={
        inclinar
          ? { rotateX: rotacaoX, rotateY: rotacaoY, transformPerspective: 1000 }
          : undefined
      }
      whileHover={reduzirMovimento ? undefined : { y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "group relative isolate overflow-hidden rounded-[var(--radius-card)] vidro",
        "shadow-[var(--sombra-profunda)] transition-shadow duration-300",
        "hover:shadow-[var(--sombra-elevada)]",
        // A borda dourada só acende no hover, senão a tela inteira vira dourado.
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]",
        "before:border before:border-[var(--borda-acento)] before:opacity-0",
        "before:transition-opacity before:duration-300 group-hover:before:opacity-100",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {/* Brilho dourado que segue o cursor. Fica atrás do conteúdo. */}
      {inclinar && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: fundoBrilho }}
        />
      )}
      {children}
    </motion.div>
  );
}

/** Cabeçalho padrão de cartão: título em Playfair, ação opcional à direita. */
export function CartaoCabecalho({
  titulo,
  descricao,
  acao,
  className,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 p-5", className)}>
      <div className="min-w-0">
        <h3 className="font-display text-lg leading-tight font-medium text-texto">
          {titulo}
        </h3>
        {descricao && (
          <p className="mt-1 text-sm text-texto-suave">{descricao}</p>
        )}
      </div>
      {acao}
    </div>
  );
}

export function CartaoCorpo({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("px-5 pb-5", className)}>{children}</div>;
}
