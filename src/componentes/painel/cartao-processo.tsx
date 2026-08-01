"use client";

import { Check, CircleDashed, Loader2, Lock } from "lucide-react";
import { Cartao } from "@/kernel/ui/cartao";
import { Etiqueta } from "@/kernel/ui/tabela";
import { ProgressoCircular } from "@/kernel/ui/progresso-circular";
import { formatarData } from "@/kernel/datas";
import { cn } from "@/kernel/cn";
import { progressoDoProcesso } from "@/dominio/tipos";
import type { Processo, StatusEtapa, TipoAtendimento } from "@/dominio/tipos";

const ROTULO_TIPO: Record<TipoAtendimento, string> = {
  "contabilidade-mensal": "Contabilidade mensal",
  abertura: "Abertura de empresa",
  regularizacao: "Regularização fiscal",
  irpf: "Imposto de renda",
  suporte: "Suporte",
};

const TOM_TIPO: Record<
  TipoAtendimento,
  "ok" | "alerta" | "critico" | "info" | "neutro"
> = {
  "contabilidade-mensal": "ok",
  abertura: "info",
  regularizacao: "alerta",
  irpf: "info",
  suporte: "neutro",
};

const ETAPA = {
  concluida: { icone: Check, cor: "text-ok", risco: true },
  "em-andamento": { icone: Loader2, cor: "text-acento", risco: false },
  bloqueada: { icone: Lock, cor: "text-critico", risco: false },
  "nao-iniciada": { icone: CircleDashed, cor: "text-texto-suave", risco: false },
} as const satisfies Record<
  StatusEtapa,
  { icone: typeof Check; cor: string; risco: boolean }
>;

/**
 * Cartão de processo em andamento.
 *
 * É o irmão do `CartaoVencimento`, para o trabalho que tem etapa em vez de
 * data limite. O anel mostra andamento CONCLUÍDO, e não prazo consumido: aqui
 * cheio é bom, ao contrário do cartão de vencimento, onde cheio é urgente.
 *
 * Etapa bloqueada aparece em vermelho com o motivo escrito ao lado. Numa
 * abertura de empresa a pergunta do cliente é sempre "e agora, o que falta?",
 * e esconder o bloqueio só transfere a pergunta para o WhatsApp da contadora.
 */
export function CartaoProcesso({ processo }: { processo: Processo }) {
  const progresso = progressoDoProcesso(processo);
  const concluidas = processo.etapas.filter(
    (e) => e.status === "concluida",
  ).length;
  const travado = processo.etapas.some((e) => e.status === "bloqueada");

  return (
    <Cartao className="h-full" semInclinacao>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <ProgressoCircular
            valor={progresso}
            className={travado ? "text-critico" : "text-acento"}
            tamanho={76}
            rotuloAcessivel={`${processo.titulo}: ${concluidas} de ${processo.etapas.length} etapas concluídas`}
          >
            <div className="text-center leading-none">
              <p className="font-display text-lg font-semibold text-texto">
                {Math.round(progresso * 100)}
                <span className="text-[11px]">%</span>
              </p>
              <p className="mt-0.5 text-[10px] text-texto-suave">
                {concluidas}/{processo.etapas.length}
              </p>
            </div>
          </ProgressoCircular>

          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-tight font-semibold text-texto">
              {processo.titulo}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Etiqueta tom={TOM_TIPO[processo.tipo]}>
                {ROTULO_TIPO[processo.tipo]}
              </Etiqueta>
              {travado && <Etiqueta tom="critico">Travado</Etiqueta>}
            </div>

            <p className="mt-2 text-[11px] text-texto-suave/70">
              aberto em {formatarData(processo.abertoEm)}
              {processo.prazo && ` · prazo ${formatarData(processo.prazo)}`}
            </p>
          </div>
        </div>

        <ol className="mt-5 space-y-2.5 border-t border-[var(--borda-suave)] pt-4">
          {processo.etapas.map((etapa) => {
            const visual = ETAPA[etapa.status];
            const Icone = visual.icone;

            return (
              <li key={etapa.id} className="flex items-start gap-2.5 text-sm">
                <Icone
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    visual.cor,
                    etapa.status === "em-andamento" && "animate-spin",
                  )}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p
                    className={cn(
                      visual.risco
                        ? "text-texto-suave line-through decoration-texto-suave/40"
                        : "text-texto",
                      etapa.status === "nao-iniciada" && "text-texto-suave",
                    )}
                  >
                    {etapa.rotulo}
                  </p>
                  {etapa.observacao && (
                    <p className="mt-0.5 text-xs text-texto-suave">
                      {etapa.observacao}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </Cartao>
  );
}
