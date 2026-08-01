"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, GripVertical, Lock } from "lucide-react";
import { cn } from "@/kernel/cn";
import type { ColunaKanban, TarefaEscritorio } from "@/dominio/escritorio";

const COLUNAS: { id: ColunaKanban; rotulo: string; cor: string }[] = [
  { id: "a-fazer", rotulo: "A fazer", cor: "bg-texto-suave/40" },
  { id: "em-progresso", rotulo: "Em progresso", cor: "bg-acento" },
  { id: "concluido", rotulo: "Concluído", cor: "bg-ok" },
];

/**
 * Quadro de tarefas do escritório.
 *
 * Cada cartão é uma ETAPA de processo, não uma tarefa avulsa. Ver o porquê em
 * `dominio/escritorio.ts`.
 *
 * Sobre o arrastar: é `motion` puro, sem biblioteca de drag and drop. A coluna
 * de destino sai da posição do ponteiro no fim do gesto, medida contra o
 * retângulo de cada coluna. Com 3 colunas isso é suficiente e evita somar uma
 * dependência ao bundle.
 *
 * Arrastar não pode ser o único jeito de mover. Teclado e leitor de tela não
 * arrastam, e quem tem `prefers-reduced-motion` não deveria precisar. Por isso
 * cada cartão tem duas setas que fazem a mesma coisa, e elas são o caminho
 * acessível, não um extra.
 *
 * O estado é LOCAL e some ao recarregar: não há banco ainda, e persistir num
 * lugar improvisado criaria uma segunda verdade sobre a etapa. Quando existir
 * banco, é aqui que a mutação sai.
 */
export function Kanban({ tarefas }: { tarefas: TarefaEscritorio[] }) {
  const [itens, setItens] = useState(tarefas);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<ColunaKanban | null>(null);
  const reduzir = useReducedMotion();
  const colunasRef = useRef<Partial<Record<ColunaKanban, HTMLDivElement | null>>>({});

  const colunaSobPonteiro = (info: PanInfo): ColunaKanban | null => {
    for (const { id } of COLUNAS) {
      const el = colunasRef.current[id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const { x, y } = info.point;
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id;
    }
    return null;
  };

  const mover = (id: string, coluna: ColunaKanban) => {
    setItens((atual) =>
      atual.map((t) => (t.id === id ? { ...t, coluna } : t)),
    );
  };

  const moverRelativo = (tarefa: TarefaEscritorio, direcao: -1 | 1) => {
    const i = COLUNAS.findIndex((c) => c.id === tarefa.coluna);
    const destino = COLUNAS[i + direcao];
    if (destino) mover(tarefa.id, destino.id);
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {COLUNAS.map((coluna) => {
        const daColuna = itens.filter((t) => t.coluna === coluna.id);
        const realcar = alvo === coluna.id && arrastando !== null;

        return (
          <div
            key={coluna.id}
            ref={(el) => {
              colunasRef.current[coluna.id] = el;
            }}
            className={cn(
              "rounded-[var(--radius-painel)] p-3 transition-colors duration-200",
              realcar
                ? "border border-[var(--borda-acento)] bg-acento/[0.06]"
                : "border border-[var(--borda-suave)] bg-white/[0.02]",
            )}
          >
            <div className="flex items-center gap-2 px-2 pt-1 pb-3">
              <span className={cn("size-2 rounded-full", coluna.cor)} aria-hidden />
              <h3 className="text-sm font-medium text-texto">{coluna.rotulo}</h3>
              <span className="ml-auto text-xs text-texto-suave">
                {daColuna.length}
              </span>
            </div>

            <ul className="space-y-2.5">
              {daColuna.map((tarefa) => {
                const i = COLUNAS.findIndex((c) => c.id === tarefa.coluna);

                return (
                  <motion.li
                    key={tarefa.id}
                    layout={!reduzir}
                    drag={!reduzir}
                    dragSnapToOrigin
                    dragElastic={0.12}
                    dragMomentum={false}
                    whileDrag={{ scale: 1.03, zIndex: 30, cursor: "grabbing" }}
                    onDragStart={() => setArrastando(tarefa.id)}
                    onDrag={(_, info) => setAlvo(colunaSobPonteiro(info))}
                    onDragEnd={(_, info) => {
                      const destino = colunaSobPonteiro(info);
                      if (destino && destino !== tarefa.coluna) {
                        mover(tarefa.id, destino);
                      }
                      setArrastando(null);
                      setAlvo(null);
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    className={cn(
                      "rounded-[var(--radius-card)] vidro p-3",
                      !reduzir && "cursor-grab active:cursor-grabbing",
                      tarefa.travada && "border-critico/30",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!reduzir && (
                        <GripVertical
                          className="mt-0.5 size-3.5 shrink-0 text-texto-suave/50"
                          aria-hidden
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm leading-snug",
                            tarefa.coluna === "concluido"
                              ? "text-texto-suave line-through decoration-texto-suave/40"
                              : "text-texto",
                          )}
                        >
                          {tarefa.rotulo}
                        </p>
                        <p className="mt-1.5 truncate text-[11px] text-texto-suave">
                          {tarefa.clienteNome}
                        </p>

                        {tarefa.travada && (
                          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-critico">
                            <Lock className="mt-px size-3 shrink-0" aria-hidden />
                            {tarefa.observacao ?? "Etapa travada"}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 flex justify-end gap-1">
                      <BotaoMover
                        rotulo={`Mover "${tarefa.rotulo}" para a coluna anterior`}
                        desabilitado={i === 0}
                        aoClicar={() => moverRelativo(tarefa, -1)}
                      >
                        <ChevronLeft className="size-3.5" aria-hidden />
                      </BotaoMover>
                      <BotaoMover
                        rotulo={`Mover "${tarefa.rotulo}" para a próxima coluna`}
                        desabilitado={i === COLUNAS.length - 1}
                        aoClicar={() => moverRelativo(tarefa, 1)}
                      >
                        <ChevronRight className="size-3.5" aria-hidden />
                      </BotaoMover>
                    </div>
                  </motion.li>
                );
              })}

              {daColuna.length === 0 && (
                <li className="rounded-[var(--radius-card)] border border-dashed border-[var(--borda-suave)] px-3 py-6 text-center text-xs text-texto-suave">
                  Nada aqui
                </li>
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function BotaoMover({
  children,
  rotulo,
  desabilitado,
  aoClicar,
}: {
  children: React.ReactNode;
  rotulo: string;
  desabilitado: boolean;
  aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={desabilitado}
      aria-label={rotulo}
      className={cn(
        "grid size-6 place-items-center rounded-md text-texto-suave transition-colors",
        "hover:bg-white/8 hover:text-texto",
        "disabled:pointer-events-none disabled:opacity-25",
      )}
    >
      {children}
    </button>
  );
}
