"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarClock,
  ExternalLink,
  FileStack,
  KanbanSquare,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { cn } from "@/kernel/cn";

/**
 * Menu do escritório.
 *
 * Os itens são ÂNCORAS para as seções da própria página, não rotas. Foi
 * decisão de projeto, a partir da restrição de manter o painel "flat", tudo a
 * no máximo um clique: quatro rotas separadas obrigariam a contadora a
 * navegar para cruzar cliente com tarefa, que é justamente o que ela faz o dia
 * inteiro. Uma tela só, com salto para a seção, resolve sem recarregar nada.
 *
 * Se alguma seção crescer a ponto de merecer página própria, ela vira rota e o
 * item aqui troca de `href`. Nada mais muda.
 */
const SECOES = [
  { id: "visao-geral", rotulo: "Visão geral", icone: LayoutDashboard },
  { id: "clientes", rotulo: "Clientes", icone: Users },
  { id: "prazos", rotulo: "Prazos", icone: CalendarClock },
  { id: "tarefas", rotulo: "Tarefas", icone: KanbanSquare },
  { id: "documentos", rotulo: "Documentos", icone: FileStack },
];

export function SidebarEscritorio() {
  const [ativa, setAtiva] = useState("visao-geral");
  const reduzir = useReducedMotion();

  // Realce segue a rolagem. `IntersectionObserver` em vez de listener de
  // scroll: o navegador faz a conta, e não roda JS a cada pixel.
  useEffect(() => {
    const alvos = SECOES.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );

    const observador = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visivel) setAtiva(visivel.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );

    alvos.forEach((el) => observador.observe(el));
    return () => observador.disconnect();
  }, []);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-[var(--borda-suave)] bg-navy-deep/60 backdrop-blur-xl lg:flex">
      <div className="flex h-20 items-center gap-3 px-5">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-acento-claro to-acento">
          <span className="font-display text-lg font-bold text-navy-deep">P</span>
        </div>
        <div className="min-w-0">
          <p className="font-display text-base leading-tight font-semibold text-texto">
            Plena
          </p>
          <p className="text-[11px] tracking-wider text-texto-suave uppercase">
            Escritório
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {SECOES.map((secao) => {
          const Icone = secao.icone;
          const ativo = ativa === secao.id;

          return (
            <a
              key={secao.id}
              href={`#${secao.id}`}
              aria-current={ativo ? "true" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-[var(--radius-card)] px-3 py-2.5",
                "text-sm font-medium transition-colors duration-200",
                ativo ? "text-acento-claro" : "text-texto-suave hover:text-texto",
              )}
            >
              {ativo && (
                <motion.span
                  layoutId="realce-escritorio"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute inset-0 -z-10 rounded-[var(--radius-card)] border border-[var(--borda-acento)] bg-acento/10"
                />
              )}
              <motion.span
                whileHover={reduzir ? undefined : { scale: 1.15, rotate: -4 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                className="grid place-items-center"
              >
                <Icone className="size-[18px]" aria-hidden />
              </motion.span>
              {secao.rotulo}
            </a>
          );
        })}
      </nav>

      <div className="border-t border-[var(--borda-suave)] p-3">
        {/* Nova aba de propósito: troca de contexto (contadora -> visão do
            cliente), não navegação dentro do próprio trabalho. Assim ela não
            perde a rolagem nem o filtro que tinha aberto aqui. */}
        <Link
          href="/painel"
          target="_blank"
          rel="noopener noreferrer"
          title="Abre em nova aba"
          className="flex items-center gap-3 rounded-[var(--radius-card)] px-3 py-2.5 text-sm font-medium text-texto-suave transition-colors hover:bg-white/5 hover:text-texto"
        >
          <ExternalLink className="size-[18px]" aria-hidden />
          Ver como cliente
        </Link>
      </div>
    </aside>
  );
}
