"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronRight } from "lucide-react";
import { cn } from "@/kernel/cn";
import type { Aviso, TomAviso } from "@/dominio/avisos";

const COR_PONTO: Record<TomAviso, string> = {
  critico: "bg-critico",
  alerta: "bg-alerta",
  info: "bg-info",
};

/**
 * Barra superior do painel do cliente.
 *
 * Três coisas foram REMOVIDAS daqui em 01/08/2026, e o motivo é o mesmo nas
 * três: pareciam funcionar e não funcionavam. Num sistema que será usado por
 * pessoas com pouca prática digital, isso é pior que a ausência do elemento,
 * porque quem não tem prática conclui que errou, não que o botão é enfeite.
 * Ver `conhecimento/wiki/affordance-falsa` no vault.
 *
 * 1. **Campo de busca.** Prometia buscar "documento, guia ou mensagem", e as
 *    três telas correspondentes ainda não existem. Volta quando houver o que
 *    buscar, e provavelmente faz mais sentido no painel do escritório, que tem
 *    carteira crescendo, do que aqui, onde a pessoa vê a própria empresa.
 * 2. **Seta ao lado do avatar.** Anunciava um menu que não existia. Volta com o
 *    menu de conta, junto da autenticação.
 * 3. **"Marcar todas como lidas".** Ver a explicação em `dominio/avisos.ts`:
 *    aviso aqui não é mensagem recebida, é condição viva. Não se marca como
 *    lida, se resolve.
 */
export function Topbar({
  nomeUsuario,
  empresa,
  avisos,
}: {
  nomeUsuario: string;
  empresa: string;
  avisos: Aviso[];
}) {
  const [aberto, setAberto] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora e ao apertar Esc. Painel flutuante sem isto é o
  // tipo de coisa que passa despercebida até alguém reclamar.
  useEffect(() => {
    if (!aberto) return;

    function aoClicar(evento: MouseEvent) {
      if (!container.current?.contains(evento.target as Node)) setAberto(false);
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }

    document.addEventListener("mousedown", aoClicar);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicar);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  const iniciais = nomeUsuario
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-[var(--borda-suave)] bg-navy/60 px-4 backdrop-blur-xl lg:px-8">
      {/* Espaço para o botão de menu no mobile, que é position fixed. */}
      <div className="w-11 shrink-0 lg:hidden" />

      <div className="flex-1" />

      <div className="relative flex items-center gap-2" ref={container}>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-label={
            avisos.length
              ? `Avisos, ${avisos.length} em aberto`
              : "Avisos, nenhum em aberto"
          }
          aria-expanded={aberto}
          className="relative grid size-11 place-items-center rounded-[var(--radius-card)] text-texto-suave transition-colors hover:bg-white/5 hover:text-texto"
        >
          <Bell className="size-5" aria-hidden />
          {avisos.length > 0 && (
            <span className="absolute top-2.5 right-2.5 grid size-[18px] place-items-center rounded-full bg-acento text-[10px] font-bold text-navy-deep">
              {avisos.length}
            </span>
          )}
        </button>

        <AnimatePresence>
          {aberto && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-14 right-0 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius-painel)] vidro-forte shadow-[var(--sombra-elevada)]"
            >
              <div className="border-b border-[var(--borda-suave)] px-4 py-3">
                <p className="font-display text-base font-medium text-texto">
                  Avisos
                </p>
                <p className="mt-0.5 text-[11px] text-texto-suave">
                  Cada aviso some sozinho quando o assunto se resolve.
                </p>
              </div>

              <ul className="max-h-80 overflow-y-auto">
                {avisos.map((aviso) => (
                  <li key={aviso.id} className="border-b border-[var(--borda-suave)] last:border-0">
                    <a
                      href={aviso.href}
                      onClick={() => setAberto(false)}
                      className="flex gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04]"
                    >
                      <span
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          COR_PONTO[aviso.tom],
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-texto">
                          {aviso.titulo}
                        </p>
                        <p className="mt-0.5 text-xs text-texto-suave">
                          {aviso.descricao}
                        </p>
                      </div>
                      <ChevronRight
                        className="mt-0.5 size-4 shrink-0 text-texto-suave/50"
                        aria-hidden
                      />
                    </a>
                  </li>
                ))}

                {avisos.length === 0 && (
                  <li className="px-4 py-8 text-center">
                    <p className="text-sm text-texto">Nada pendente.</p>
                    <p className="mt-1 text-xs text-texto-suave">
                      Nenhuma etapa parada e nenhum dado faltando.
                    </p>
                  </li>
                )}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Identificação, não botão: sem hover que sugira clique, porque não
            há menu de conta enquanto não houver autenticação. */}
        <div className="ml-1 flex items-center gap-3 py-1.5 pr-3 pl-1.5">
          <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-acento-claro to-acento text-sm font-bold text-navy-deep">
            {iniciais}
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-sm leading-tight font-medium text-texto">
              {nomeUsuario}
            </p>
            <p className="max-w-[12rem] truncate text-xs text-texto-suave">
              {empresa}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
