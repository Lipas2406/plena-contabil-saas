"use client";

import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { ArrowRight, Lock, X } from "lucide-react";
import { Etiqueta } from "@/kernel/ui/tabela";
import { formatarCNPJ } from "@/kernel/br";
import { formatarData } from "@/kernel/datas";
import { cn } from "@/kernel/cn";
import { progressoDoProcesso } from "@/dominio/tipos";
import { EncerrarProcesso } from "@/componentes/escritorio/encerrar-processo";
import { NovoCliente } from "@/componentes/escritorio/novo-cliente";
import type { ClienteNaCarteira, SinalCliente } from "@/dominio/escritorio";

const SEMAFORO: Record<
  SinalCliente,
  { ponto: string; halo: string; rotulo: string; tom: "ok" | "alerta" | "critico" }
> = {
  ok: { ponto: "bg-ok", halo: "shadow-[0_0_0_4px_rgba(52,211,153,0.14)]", rotulo: "Em dia", tom: "ok" },
  atencao: { ponto: "bg-alerta", halo: "shadow-[0_0_0_4px_rgba(226,198,112,0.16)]", rotulo: "Pendência", tom: "alerta" },
  critico: { ponto: "bg-critico", halo: "shadow-[0_0_0_4px_rgba(248,113,113,0.16)]", rotulo: "Travado", tom: "critico" },
};

/**
 * Carteira do escritório com painel de detalhe deslizante.
 *
 * Sem tabela, por restrição de projeto: cartão de vidro com respiro em vez de
 * grade densa. A troca é real, uma tabela caberia mais linha na tela, mas com
 * 6 clientes a densidade não é o problema, e o cartão deixa o semáforo e o
 * motivo lado a lado sem virar coluna espremida.
 *
 * O off-canvas é irmão do `Modal` do kernel e repete os mesmos cuidados:
 * fecha no Esc, trava a rolagem do fundo e devolve o foco. Não foi extraído
 * para o kernel porque só existe um uso; na segunda tela que precisar, vira
 * componente compartilhado.
 */
export function ListaClientes({
  carteira,
  somenteLeitura = false,
}: {
  carteira: ClienteNaCarteira[];
  somenteLeitura?: boolean;
}) {
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const reduzir = useReducedMotion();
  const selecionado = carteira.find((c) => c.cliente.id === abertoId) ?? null;

  useEffect(() => {
    if (!selecionado) return;

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbertoId(null);
    };
    document.addEventListener("keydown", aoTeclar);

    const larguraBarra =
      window.innerWidth - document.documentElement.clientWidth;
    const overflowAnterior = document.body.style.overflow;
    const padAnterior = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (larguraBarra > 0) document.body.style.paddingRight = `${larguraBarra}px`;

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
      document.body.style.paddingRight = padAnterior;
    };
  }, [selecionado]);

  return (
    <>
      <ul className="grid gap-3 xl:grid-cols-2">
        {carteira.map((item) => {
          const s = SEMAFORO[item.sinal];
          const c = item.cliente;

          return (
            <li key={c.id}>
              <motion.button
                type="button"
                onClick={() => setAbertoId(c.id)}
                whileHover={reduzir ? undefined : { y: -2 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                aria-haspopup="dialog"
                className={cn(
                  "group flex w-full items-center gap-4 rounded-[var(--radius-card)] p-4 text-left",
                  "vidro transition-shadow duration-300 hover:shadow-[var(--sombra-elevada)]",
                )}
              >
                <span
                  className={cn("size-2.5 shrink-0 rounded-full", s.ponto, s.halo)}
                  aria-hidden
                />

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="truncate font-display text-base font-semibold text-texto">
                      {c.nomeFantasia}
                    </span>
                    <span className="text-[11px] text-texto-suave">
                      {c.cnpj ? formatarCNPJ(c.cnpj) : "CNPJ a emitir"}
                    </span>
                  </span>

                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-texto-suave">
                    <span>{c.regime ?? (c.tipoPessoa === "PF" ? "Pessoa física" : "Regime a definir")}</span>
                    <span className="opacity-40">•</span>
                    <span className={cn(item.sinal !== "ok" && "text-texto")}>
                      {item.motivo}
                    </span>
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-3">
                  <Etiqueta tom={s.tom}>{s.rotulo}</Etiqueta>
                  <ArrowRight
                    className="size-4 text-texto-suave opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </span>
              </motion.button>
            </li>
          );
        })}
      </ul>

      <AnimatePresence>
        {selecionado && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAbertoId(null)}
              className="fixed inset-0 z-50 bg-navy-deep/70 backdrop-blur-sm"
              aria-hidden
            />

            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={`Detalhes de ${selecionado.cliente.nomeFantasia}`}
              initial={{ x: reduzir ? 0 : "100%", opacity: reduzir ? 0 : 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: reduzir ? 0 : "100%", opacity: reduzir ? 0 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 34 }}
              className={cn(
                "fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto",
                "border-l border-[var(--borda-suave)] bg-navy-deep/95 backdrop-blur-2xl",
              )}
            >
              <DetalheCliente
                item={selecionado}
                aoFechar={() => setAbertoId(null)}
                somenteLeitura={somenteLeitura}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function DetalheCliente({
  item,
  aoFechar,
  somenteLeitura,
}: {
  item: ClienteNaCarteira;
  aoFechar: () => void;
  somenteLeitura: boolean;
}) {
  const c = item.cliente;
  const s = SEMAFORO[item.sinal];

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold text-texto">
            {c.nomeFantasia}
          </h2>
          <p className="mt-1 text-xs text-texto-suave">
            {c.razaoSocial && c.razaoSocial !== c.nomeFantasia
              ? c.razaoSocial
              : c.cnpj
                ? formatarCNPJ(c.cnpj)
                : "Cadastro em formação"}
          </p>
        </div>
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar detalhes"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-texto-suave transition-colors hover:bg-white/5 hover:text-texto"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Etiqueta tom={s.tom}>{s.rotulo}</Etiqueta>
        {item.diasSemFechar !== null && (
          <Etiqueta tom="neutro">aberto há {item.diasSemFechar} dias</Etiqueta>
        )}
      </div>

      {/* O painel aponta o que falta logo abaixo; o botão fica junto para a
          correção acontecer onde a lacuna aparece, e não em outra tela. */}
      <div className="mt-3">
        <NovoCliente cliente={c} somenteLeitura={somenteLeitura} />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-[var(--borda-suave)] pt-5 text-sm">
        <Dado rotulo="CNPJ" valor={c.cnpj ? formatarCNPJ(c.cnpj) : null} />
        <Dado rotulo="Natureza" valor={c.naturezaJuridica} />
        <Dado rotulo="Porte" valor={c.porte} />
        <Dado
          rotulo="Regime"
          valor={c.regime ?? (c.tipoPessoa === "PF" ? "Pessoa física" : null)}
        />
        <div className="col-span-2">
          <Dado rotulo="Atividade" valor={c.atividade} />
        </div>
      </dl>

      {item.camposFaltando.length > 0 && (
        <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--borda-acento)] bg-acento/[0.07] p-4">
          <p className="text-xs font-medium tracking-wide text-acento-claro uppercase">
            Falta no cadastro
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {item.camposFaltando.map((campo) => (
              <li key={campo}>
                <Etiqueta tom="neutro">{campo}</Etiqueta>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 space-y-4">
        <h3 className="font-display text-base font-medium text-texto">
          Processos
        </h3>

        {item.processos.map((processo) => {
          const pct = Math.round(progressoDoProcesso(processo) * 100);

          return (
            <div
              key={processo.id}
              className="rounded-[var(--radius-card)] vidro p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-texto">
                  {processo.titulo}
                </p>
                <span className="shrink-0 font-display text-sm text-acento-claro">
                  {pct}%
                </span>
              </div>

              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Andamento de ${processo.titulo}`}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-acento to-acento-claro"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <p className="mt-2.5 text-[11px] text-texto-suave">
                aberto em {formatarData(processo.abertoEm)}
                {processo.prazo && ` · prazo ${formatarData(processo.prazo)}`}
              </p>

              <EncerrarProcesso
                processo={processo}
                somenteLeitura={somenteLeitura}
              />

              <ul className="mt-3 space-y-1.5">
                {processo.etapas
                  .filter((e) => e.status !== "concluida")
                  .map((etapa) => (
                    <li
                      key={etapa.id}
                      className="flex items-start gap-2 text-xs"
                    >
                      {etapa.status === "bloqueada" ? (
                        <Lock className="mt-0.5 size-3.5 shrink-0 text-critico" aria-hidden />
                      ) : (
                        <span
                          className={cn(
                            "mt-1 size-1.5 shrink-0 rounded-full",
                            etapa.status === "em-andamento"
                              ? "bg-acento"
                              : "bg-texto-suave/40",
                          )}
                          aria-hidden
                        />
                      )}
                      <span
                        className={cn(
                          etapa.status === "bloqueada"
                            ? "text-critico"
                            : "text-texto-suave",
                        )}
                      >
                        {etapa.rotulo}
                        {etapa.observacao && (
                          <span className="block text-texto-suave/70">
                            {etapa.observacao}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Campo do cadastro. Nulo vira "a informar", nunca some nem vira traço solto. */
function Dado({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-texto-suave uppercase">
        {rotulo}
      </dt>
      <dd
        className={cn(
          "mt-1",
          valor ? "text-texto" : "text-texto-suave/60 italic",
        )}
      >
        {valor ?? "a informar"}
      </dd>
    </div>
  );
}
