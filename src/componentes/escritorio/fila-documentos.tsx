"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, FileText, Sparkles, TriangleAlert, X } from "lucide-react";
import { Etiqueta } from "@/kernel/ui/tabela";
import { formatarBRL } from "@/kernel/br";
import { formatarData } from "@/kernel/datas";
import { cn } from "@/kernel/cn";
import { CONFIANCA_MINIMA } from "@/dominio/tipos";
import type { Documento } from "@/dominio/tipos";

const NOME_CLIENTE: Record<string, string> = {};

/**
 * Fila de conferência de documentos.
 *
 * O ponto desta tela não é aprovar rápido, é deixar VISÍVEL o que a máquina
 * não sabe. Cada item mostra a categoria sugerida e a confiança, e abaixo de
 * `CONFIANCA_MINIMA` (0.6) o cartão avisa que aprovar sem olhar é decisão da
 * contadora, não do classificador. Esconder a incerteza atrás de um botão
 * verde é o jeito de fazer alguém assinar coisa errada.
 *
 * Aprovar e rejeitar são locais e somem ao recarregar: não há banco ainda.
 */
export function FilaDocumentos({
  documentos,
  nomesPorCliente,
}: {
  documentos: Documento[];
  nomesPorCliente: Record<string, string>;
}) {
  const [fila, setFila] = useState(documentos);
  const [decididos, setDecididos] = useState(0);
  const reduzir = useReducedMotion();

  const decidir = (id: string) => {
    setFila((atual) => atual.filter((d) => d.id !== id));
    setDecididos((n) => n + 1);
  };

  const nomes = { ...NOME_CLIENTE, ...nomesPorCliente };

  return (
    <div>
      <ul className="space-y-2.5">
        <AnimatePresence initial={false} mode="popLayout">
          {fila.map((doc) => {
            const incerto = doc.confianca < CONFIANCA_MINIMA;

            return (
              <motion.li
                key={doc.id}
                layout={!reduzir}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: reduzir ? 0 : 40, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "rounded-[var(--radius-card)] vidro p-4",
                  incerto && "border-critico/25",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl",
                      incerto
                        ? "bg-critico/10 text-critico"
                        : "bg-white/5 text-texto-suave",
                    )}
                    aria-hidden
                  >
                    <FileText className="size-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-texto">
                      {doc.nomeArquivo}
                    </p>
                    <p className="mt-1 text-[11px] text-texto-suave">
                      {/* Padding vertical extra só aqui: é o alvo de toque
                          menor da tela, então precisa de folga pra não errar
                          o dedo em cima do texto ao lado. */}
                      <a
                        href="#clientes"
                        title={`Ver ${nomes[doc.clienteId] ?? doc.clienteId} na carteira`}
                        className="-my-1 rounded px-0.5 py-1 underline decoration-dotted underline-offset-2 hover:text-texto"
                      >
                        {nomes[doc.clienteId] ?? doc.clienteId}
                      </a>
                      <span className="mx-1.5 opacity-40">•</span>
                      {formatarData(doc.emitidoEm)}
                      {doc.valorCentavos !== null && (
                        <>
                          <span className="mx-1.5 opacity-40">•</span>
                          {formatarBRL(doc.valorCentavos)}
                        </>
                      )}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <Etiqueta tom={incerto ? "critico" : "info"}>
                        <Sparkles className="size-3" aria-hidden />
                        {doc.categoria}
                      </Etiqueta>
                      <span
                        className={cn(
                          "text-[11px]",
                          incerto ? "text-critico" : "text-texto-suave",
                        )}
                      >
                        {Math.round(doc.confianca * 100)}% de confiança
                      </span>
                    </div>

                    {incerto && (
                      <p className="mt-2 flex items-start gap-1.5 text-[11px] text-critico">
                        <TriangleAlert className="mt-px size-3 shrink-0" aria-hidden />
                        Abaixo do mínimo para aceitar sozinho. Confira antes de aprovar.
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-1.5">
                    <BotaoAcao
                      rotulo={`Aprovar ${doc.nomeArquivo}`}
                      tom="ok"
                      aoClicar={() => decidir(doc.id)}
                    >
                      <Check className="size-4" aria-hidden />
                    </BotaoAcao>
                    <BotaoAcao
                      rotulo={`Rejeitar ${doc.nomeArquivo}`}
                      tom="critico"
                      aoClicar={() => decidir(doc.id)}
                    >
                      <X className="size-4" aria-hidden />
                    </BotaoAcao>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>

        {fila.length === 0 && (
          <li className="rounded-[var(--radius-card)] border border-dashed border-[var(--borda-suave)] px-4 py-10 text-center">
            <p className="font-display text-base text-texto">Fila zerada.</p>
            <p className="mt-1 text-sm text-texto-suave">
              {decididos > 0
                ? `${decididos} documento(s) conferido(s) nesta sessão.`
                : "Nada aguardando conferência."}
            </p>
          </li>
        )}
      </ul>

      {/* Região viva: quem usa leitor de tela precisa saber que o item saiu
          da fila, senão o cartão some em silêncio. */}
      <p className="sr-only" role="status" aria-live="polite">
        {fila.length} documento(s) na fila.
      </p>
    </div>
  );
}

function BotaoAcao({
  children,
  rotulo,
  tom,
  aoClicar,
}: {
  children: React.ReactNode;
  rotulo: string;
  tom: "ok" | "critico";
  aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-label={rotulo}
      title={rotulo}
      className={cn(
        "grid size-9 place-items-center rounded-xl border transition-colors",
        tom === "ok"
          ? "border-ok/25 text-ok hover:bg-ok/12"
          : "border-critico/25 text-critico hover:bg-critico/12",
      )}
    >
      {children}
    </button>
  );
}
