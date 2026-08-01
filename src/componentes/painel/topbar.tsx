"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Search, ChevronDown } from "lucide-react";
import { cn } from "@/kernel/cn";
import { Campo } from "@/kernel/ui/campo";
import { useToast } from "@/kernel/ui/toast";

interface Notificacao {
  id: string;
  titulo: string;
  descricao: string;
  quando: string;
  lida: boolean;
}

const NOTIFICACOES: Notificacao[] = [
  {
    id: "n1",
    titulo: "DAS de julho disponível",
    descricao: "Guia gerada e pronta para pagamento.",
    quando: "há 2 h",
    lida: false,
  },
  {
    id: "n2",
    titulo: "Documento aprovado",
    descricao: "Nota fiscal 1042 foi classificada e lançada.",
    quando: "ontem",
    lida: false,
  },
  {
    id: "n3",
    titulo: "Mensagem da contadora",
    descricao: "Ana respondeu sobre o pró-labore.",
    quando: "3 dias",
    lida: true,
  },
];

export function Topbar({
  nomeUsuario,
  empresa,
}: {
  nomeUsuario: string;
  empresa: string;
}) {
  const [aberto, setAberto] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const { notificar } = useToast();
  const naoLidas = NOTIFICACOES.filter((n) => !n.lida).length;

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

      <div className="hidden max-w-sm flex-1 md:block">
        <Campo
          type="search"
          placeholder="Buscar documento, guia ou mensagem..."
          iconeEsquerda={<Search className="size-4" aria-hidden />}
          aria-label="Buscar"
        />
      </div>

      <div className="flex-1 md:hidden" />

      <div className="relative flex items-center gap-2" ref={container}>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-label={`Notificações${naoLidas ? `, ${naoLidas} não lidas` : ""}`}
          aria-expanded={aberto}
          className="relative grid size-11 place-items-center rounded-[var(--radius-card)] text-texto-suave transition-colors hover:bg-white/5 hover:text-texto"
        >
          <Bell className="size-5" aria-hidden />
          {naoLidas > 0 && (
            <span className="absolute top-2.5 right-2.5 grid size-[18px] place-items-center rounded-full bg-acento text-[10px] font-bold text-navy-deep">
              {naoLidas}
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
              <div className="flex items-center justify-between border-b border-[var(--borda-suave)] px-4 py-3">
                <p className="font-display text-base font-medium text-texto">
                  Notificações
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAberto(false);
                    notificar({
                      tipo: "sucesso",
                      titulo: "Notificações marcadas como lidas",
                    });
                  }}
                  className="text-xs text-acento transition-opacity hover:opacity-75"
                >
                  Marcar todas
                </button>
              </div>

              <ul className="max-h-80 overflow-y-auto">
                {NOTIFICACOES.map((n) => (
                  <li
                    key={n.id}
                    className="flex gap-3 border-b border-[var(--borda-suave)] px-4 py-3 last:border-0 hover:bg-white/[0.03]"
                  >
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        n.lida ? "bg-white/15" : "bg-acento",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-texto">{n.titulo}</p>
                      <p className="mt-0.5 text-xs text-texto-suave">
                        {n.descricao}
                      </p>
                      <p className="mt-1 text-[11px] text-texto-suave/70">
                        {n.quando}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="ml-1 flex items-center gap-3 rounded-[var(--radius-pill)] py-1.5 pr-3 pl-1.5 transition-colors hover:bg-white/5">
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
          <ChevronDown
            className="hidden size-4 text-texto-suave sm:block"
            aria-hidden
          />
        </div>
      </div>
    </header>
  );
}
