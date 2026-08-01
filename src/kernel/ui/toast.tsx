"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/kernel/cn";

/**
 * Toasts deslizando do canto superior direito.
 *
 * Decisões que valem para o próximo projeto:
 * - O timer é guardado em ref, não em estado. Estado dispararia re-render a
 *   cada toast e cancelar ficaria sujeito a closure velha.
 * - `aria-live="polite"` na região, não em cada toast: o leitor de tela anuncia
 *   a mudança sem interromper o que o usuário está fazendo. Erro usa
 *   "assertive" porque aí interromper é o comportamento correto.
 * - Timer pausa no hover. Toast que some enquanto a pessoa está lendo é o
 *   defeito mais comum dessa interface.
 */

type TipoToast = "sucesso" | "erro" | "alerta" | "info";

interface Toast {
  id: number;
  tipo: TipoToast;
  titulo: string;
  descricao?: string;
}

const ICONES: Record<TipoToast, typeof CheckCircle2> = {
  sucesso: CheckCircle2,
  erro: XCircle,
  alerta: AlertTriangle,
  info: Info,
};

const CORES: Record<TipoToast, string> = {
  sucesso: "text-ok",
  erro: "text-critico",
  alerta: "text-alerta",
  info: "text-info",
};

interface ContextoToast {
  notificar: (toast: Omit<Toast, "id">) => void;
}

const Contexto = createContext<ContextoToast | null>(null);

export function useToast() {
  const ctx = useContext(Contexto);
  if (!ctx) {
    throw new Error("useToast precisa estar dentro de <ProvedorToast>.");
  }
  return ctx;
}

const DURACAO_MS = 5000;

export function ProvedorToast({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const proximoId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const remover = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((atual) => atual.filter((t) => t.id !== id));
  }, []);

  const agendar = useCallback(
    (id: number, ms = DURACAO_MS) => {
      timers.current.set(
        id,
        setTimeout(() => remover(id), ms),
      );
    },
    [remover],
  );

  const notificar = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = proximoId.current++;
      setToasts((atual) => [...atual, { ...toast, id }]);
      agendar(id);
    },
    [agendar],
  );

  const valor = useMemo(() => ({ notificar }), [notificar]);

  function pausar(id: number) {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }

  return (
    <Contexto.Provider value={valor}>
      {children}

      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed top-4 right-4 z-[100] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {toasts.map((toast) => {
            const Icone = ICONES[toast.tipo];
            return (
              <motion.div
                key={toast.id}
                layout
                // Entra deslizando da direita, sai encolhendo: a saída
                // diferente da entrada evita a sensação de "voltou atrás".
                initial={{ opacity: 0, x: 320, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                onMouseEnter={() => pausar(toast.id)}
                onMouseLeave={() => agendar(toast.id, 2000)}
                role={toast.tipo === "erro" ? "alert" : "status"}
                className={cn(
                  "pointer-events-auto flex items-start gap-3 rounded-[var(--radius-card)]",
                  "vidro-forte p-4 shadow-[var(--sombra-elevada)]",
                )}
              >
                <Icone
                  className={cn("mt-0.5 size-5 shrink-0", CORES[toast.tipo])}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-texto">
                    {toast.titulo}
                  </p>
                  {toast.descricao && (
                    <p className="mt-0.5 text-xs text-texto-suave">
                      {toast.descricao}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remover(toast.id)}
                  aria-label="Fechar notificação"
                  className="-m-1 rounded-md p-1 text-texto-suave transition-colors hover:text-texto"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Contexto.Provider>
  );
}
