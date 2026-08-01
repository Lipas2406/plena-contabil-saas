"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/kernel/cn";
import { Botao } from "./botao";

/**
 * Modal em portal, com foco preso e trava de rolagem.
 *
 * O que costuma faltar em modal caseiro e está resolvido aqui:
 * - Esc fecha.
 * - Foco vai para dentro ao abrir e VOLTA para quem abriu ao fechar. Sem
 *   isso, quem navega por teclado é jogado para o topo da página.
 * - Tab circula dentro do modal em vez de escapar para o fundo.
 * - `aria-modal` e `role="dialog"` com o título ligado por id.
 * - A rolagem do body é travada preservando a posição.
 * - O painel tem altura máxima e rola por dentro. Sem isso, um formulário
 *   mais alto que a janela fica com o rodapé (e o botão de salvar)
 *   inalcançável: a página por trás não rola porque está travada, e o
 *   próprio modal é `fixed`, então rolagem de página não adianta nada.
 *   Cabeçalho e rodapé ficam fixos, só o meio rola.
 */

interface ModalProps {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  children?: ReactNode;
  rodape?: ReactNode;
  className?: string;
}

const FOCAVEIS =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export function Modal({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  rodape,
  className,
}: ModalProps) {
  const painel = useRef<HTMLDivElement>(null);
  const focoAnterior = useRef<HTMLElement | null>(null);
  const reduzir = useReducedMotion();

  useEffect(() => {
    if (!aberto) return;

    focoAnterior.current = document.activeElement as HTMLElement;

    // Trava a rolagem compensando a largura da barra, senão o layout
    // "pula" horizontalmente no instante em que o modal abre.
    const larguraBarra = window.innerWidth - document.documentElement.clientWidth;
    const overflowOriginal = document.body.style.overflow;
    const paddingOriginal = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (larguraBarra > 0) document.body.style.paddingRight = `${larguraBarra}px`;

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        aoFechar();
        return;
      }
      if (evento.key !== "Tab" || !painel.current) return;

      const alvos = painel.current.querySelectorAll<HTMLElement>(FOCAVEIS);
      if (alvos.length === 0) return;
      const primeiro = alvos[0];
      const ultimo = alvos[alvos.length - 1];

      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);
    // rAF para o foco só entrar depois do painel existir no DOM.
    const id = requestAnimationFrame(() => {
      painel.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus();
    });

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      cancelAnimationFrame(id);
      document.body.style.overflow = overflowOriginal;
      document.body.style.paddingRight = paddingOriginal;
      focoAnterior.current?.focus();
    };
  }, [aberto, aoFechar]);

  // createPortal só existe no cliente. Sem esta guarda, quebra no SSR.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {aberto && (
        <div className="fixed inset-0 z-[90] grid place-items-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={aoFechar}
            className="absolute inset-0 bg-navy-deep/70 backdrop-blur-sm"
            aria-hidden
          />

          <motion.div
            ref={painel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal"
            initial={reduzir ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduzir ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className={cn(
              "relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-[var(--radius-painel)]",
              "vidro-forte shadow-[var(--sombra-elevada)]",
              className,
            )}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 p-6 pb-4">
              <div>
                <h2
                  id="titulo-modal"
                  className="font-display text-xl font-medium text-texto"
                >
                  {titulo}
                </h2>
                {descricao && (
                  <p className="mt-1 text-sm text-texto-suave">{descricao}</p>
                )}
              </div>
              <Botao
                variante="fantasma"
                tamanho="sm"
                onClick={aoFechar}
                aria-label="Fechar"
                className="-mt-1 -mr-2 px-2"
              >
                <X className="size-4" aria-hidden />
              </Botao>
            </div>

            {children && (
              <div className="overflow-y-auto px-6 pb-2">{children}</div>
            )}

            {rodape && (
              <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--borda-suave)] p-6 pt-4">
                {rodape}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
