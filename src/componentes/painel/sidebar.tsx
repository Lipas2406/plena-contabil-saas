"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Receipt,
  Settings,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/kernel/cn";

interface ItemMenu {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** Contador de pendências. Só aparece se maior que zero. */
  contador?: number;
}

// Sem contador fixo em Obrigações/Documentos: as duas rotas ainda são
// "em construção", sem dado real por trás. Número que não corresponde a nada
// e leva pra uma tela vazia é o tipo de coisa que assusta quem tem menos
// prática digital ("cadê minha pendência?"). Volta quando essas telas
// tiverem dado de verdade pra contar.
const MENU: ItemMenu[] = [
  { href: "/painel", rotulo: "Dashboard", icone: LayoutDashboard },
  { href: "/painel/obrigacoes", rotulo: "Obrigações", icone: Receipt },
  { href: "/painel/documentos", rotulo: "Documentos", icone: FileText },
  { href: "/painel/mensagens", rotulo: "Mensagens", icone: MessageSquare },
  { href: "/painel/configuracoes", rotulo: "Configurações", icone: Settings },
];

export function Sidebar() {
  const [abertoMobile, setAbertoMobile] = useState(false);

  return (
    <>
      {/* Botão de abrir, só no mobile. */}
      <button
        type="button"
        onClick={() => setAbertoMobile(true)}
        aria-label="Abrir menu"
        className="fixed top-4 left-4 z-50 grid size-11 place-items-center rounded-[var(--radius-card)] vidro-forte text-texto lg:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      {/* Fixa no desktop. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[var(--borda-suave)] bg-navy-deep/60 backdrop-blur-xl lg:flex">
        <ConteudoSidebar />
      </aside>

      {/* Gaveta no mobile. */}
      <AnimatePresence>
        {abertoMobile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAbertoMobile(false)}
              className="fixed inset-0 z-40 bg-navy-deep/70 backdrop-blur-sm lg:hidden"
              aria-hidden
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--borda-suave)] bg-navy-deep/95 backdrop-blur-xl lg:hidden"
            >
              <button
                type="button"
                onClick={() => setAbertoMobile(false)}
                aria-label="Fechar menu"
                className="absolute top-4 right-4 grid size-9 place-items-center rounded-lg text-texto-suave hover:text-texto"
              >
                <X className="size-5" aria-hidden />
              </button>
              <ConteudoSidebar aoNavegar={() => setAbertoMobile(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function ConteudoSidebar({ aoNavegar }: { aoNavegar?: () => void }) {
  const pathname = usePathname();
  const reduzir = useReducedMotion();

  return (
    <>
      <div className="flex h-20 items-center gap-3 px-6">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-acento-claro to-acento">
          <span className="font-display text-lg font-bold text-navy-deep">P</span>
        </div>
        <div className="min-w-0">
          <p className="font-display text-base leading-tight font-semibold text-texto">
            Plena
          </p>
          <p className="text-[11px] tracking-wider text-texto-suave uppercase">
            Contábil
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {MENU.map((item) => {
          // Comparação exata na raiz do painel, senão "/painel" ficaria ativo
          // em todas as subrotas ao mesmo tempo.
          const ativo =
            item.href === "/painel"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          const Icone = item.icone;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={aoNavegar}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-[var(--radius-card)] px-3 py-2.5",
                "text-sm font-medium transition-colors duration-200",
                ativo
                  ? "text-acento-claro"
                  : "text-texto-suave hover:text-texto",
              )}
            >
              {/* layoutId faz o realce DESLIZAR entre os itens em vez de
                  piscar, e o Framer Motion cuida da interpolação sozinho. */}
              {ativo && (
                <motion.span
                  layoutId="realce-menu"
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

              <span className="flex-1">{item.rotulo}</span>

              {item.contador ? (
                <span className="grid size-5 place-items-center rounded-full bg-acento text-[11px] font-bold text-navy-deep">
                  {item.contador}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/*
        O botão "Sair" foi removido em 01/08/2026. Não existe autenticação:
        `sessao.ts` tem o cliente logado numa constante, então não há sessão
        para encerrar e o botão não fazia nada. Num sistema que será usado por
        pessoas com pouca prática digital, clicar em "Sair" e continuar logado
        não é um detalhe, é motivo para desconfiar do resto da tela.

        Volta junto com a autenticação (etapa A.2 do cronograma no vault),
        provavelmente dentro de um menu de conta ancorado no avatar da Topbar.
      */}
    </>
  );
}
