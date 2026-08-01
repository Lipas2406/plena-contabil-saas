"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Transição de página.
 *
 * Usa `key={pathname}`: quando a rota muda, o React descarta a árvore antiga
 * e monta a nova, o que dispara o `initial` do Framer Motion de novo.
 *
 * Só a entrada é animada, sem AnimatePresence. Motivo: no App Router a saída
 * exigiria segurar a árvore antiga montada durante a navegação, e isso atrasa
 * a pintura da tela nova e briga com streaming de Server Components. Animação
 * de saída aqui custaria performance real em troca de estética, então fica de
 * fora até existir suporte de primeira classe (View Transitions API).
 */
export function TransicaoPagina({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduzir = useReducedMotion();

  if (reduzir) return <>{children}</>;

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Entrada escalonada para listas e grades de cartão.
 * Envolva a lista com `Escalonado` e cada item com `EscalonadoItem`.
 */
export function Escalonado({
  children,
  className,
  atraso = 0.05,
}: {
  children: ReactNode;
  className?: string;
  atraso?: number;
}) {
  const reduzir = useReducedMotion();
  if (reduzir) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial="oculto"
      animate="visivel"
      variants={{
        visivel: { transition: { staggerChildren: atraso } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function EscalonadoItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduzir = useReducedMotion();
  if (reduzir) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={{
        oculto: { opacity: 0, y: 16 },
        visivel: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
