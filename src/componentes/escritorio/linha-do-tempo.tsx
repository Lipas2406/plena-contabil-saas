"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarClock, ChevronRight, Hourglass } from "lucide-react";
import { Etiqueta } from "@/kernel/ui/tabela";
import { formatarData } from "@/kernel/datas";
import { cn } from "@/kernel/cn";
import type { ItemLinhaDoTempo } from "@/dominio/escritorio";
import { DIAS_ARRASTANDO } from "@/dominio/tipos";
import type { TipoAtendimento } from "@/dominio/tipos";

const ROTULO_TIPO: Record<TipoAtendimento, string> = {
  "contabilidade-mensal": "Mensal",
  abertura: "Abertura",
  regularizacao: "Regularização",
  irpf: "IRPF",
  suporte: "Suporte",
  "folha-de-pagamento": "Folha",
};

/**
 * Prazos e envelhecimento dos processos.
 *
 * Substitui o calendário tributário pedido no escopo original. O motivo está
 * em `dominio/escritorio.ts`: não há DAS, DCTF nem eSocial nesta carteira, e
 * um calendário vazio, ou pior, preenchido com compromisso inventado, seria
 * enfeite. O que a contadora precisa ver é o que está apodrecendo.
 *
 * A barra mede idade contra `DIAS_ARRASTANDO`. Ela enche conforme o processo
 * envelhece, então cheia e vermelha significa "isso está parado há tempo
 * demais". É a mesma leitura do anel de vencimento do painel do cliente: cheio
 * é ruim.
 */
export function LinhaDoTempo({ itens }: { itens: ItemLinhaDoTempo[] }) {
  const [cliente, setCliente] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoAtendimento | null>(null);
  const reduzir = useReducedMotion();

  const clientes = useMemo(() => {
    const vistos = new Map<string, string>();
    itens.forEach((i) => vistos.set(i.clienteId, i.clienteNome));
    return [...vistos].map(([id, nome]) => ({ id, nome }));
  }, [itens]);

  const tipos = useMemo(
    () => [...new Set(itens.map((i) => i.tipo))],
    [itens],
  );

  const filtrados = itens.filter(
    (i) =>
      (cliente === null || i.clienteId === cliente) &&
      (tipo === null || i.tipo === tipo),
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4">
        <Filtro
          rotulo="Cliente"
          opcoes={clientes.map((c) => ({ id: c.id, rotulo: c.nome }))}
          selecionado={cliente}
          aoSelecionar={setCliente}
        />
        <Filtro
          rotulo="Tipo"
          opcoes={tipos.map((t) => ({ id: t, rotulo: ROTULO_TIPO[t] }))}
          selecionado={tipo}
          aoSelecionar={(v) => setTipo(v as TipoAtendimento | null)}
        />
      </div>

      <ul className="space-y-2.5">
        <AnimatePresence initial={false} mode="popLayout">
          {filtrados.map((item) => {
            const arrastando = item.diasAberto >= DIAS_ARRASTANDO;
            const fracao = Math.min(item.diasAberto / DIAS_ARRASTANDO, 1);

            return (
              <motion.li
                key={item.id}
                layout={!reduzir}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden rounded-[var(--radius-card)] vidro"
              >
                {/* Cartão inteiro é o alvo do clique, não só o nome: aqui não
                    tem botão de ação disputando o toque, então o alvo maior
                    possível ajuda quem tem menos precisão no dedo ou no mouse. */}
                <a
                  href="#clientes"
                  title={`Ver ${item.clienteNome} na carteira`}
                  aria-label={`${item.titulo}, cliente ${item.clienteNome}. Ir para a carteira de clientes.`}
                  className="block p-4 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-sm font-semibold text-texto">
                        {item.titulo}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-texto-suave">
                        {item.clienteNome}
                        <span className="mx-1 opacity-40">•</span>
                        {item.etapasAbertas} de {item.totalEtapas} etapas em aberto
                        <ChevronRight
                          className="size-3.5 shrink-0 text-texto-suave/50"
                          aria-hidden
                        />
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Etiqueta tom="neutro">{ROTULO_TIPO[item.tipo]}</Etiqueta>
                      {item.diasAtePrazo !== null ? (
                        <Etiqueta tom={item.diasAtePrazo < 0 ? "critico" : "info"}>
                          <CalendarClock className="size-3" aria-hidden />
                          {item.diasAtePrazo < 0
                            ? `venceu há ${Math.abs(item.diasAtePrazo)}d`
                            : `prazo em ${item.diasAtePrazo}d`}
                        </Etiqueta>
                      ) : (
                        <Etiqueta tom={arrastando ? "critico" : "alerta"}>
                          <Hourglass className="size-3" aria-hidden />
                          sem prazo combinado
                        </Etiqueta>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <div
                      className="h-1 flex-1 overflow-hidden rounded-full bg-white/8"
                      role="progressbar"
                      aria-valuenow={item.diasAberto}
                      aria-valuemin={0}
                      aria-valuemax={DIAS_ARRASTANDO}
                      aria-label={`${item.titulo}: ${item.diasAberto} dias em aberto`}
                    >
                      <div
                        className={cn(
                          "h-full rounded-full",
                          arrastando ? "bg-critico" : "bg-acento",
                        )}
                        style={{ width: `${fracao * 100}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-[11px]",
                        arrastando ? "text-critico" : "text-texto-suave",
                      )}
                    >
                      {item.diasAberto} dias em aberto
                      {item.prazo && ` · prazo ${formatarData(item.prazo)}`}
                    </span>
                  </div>
                </a>
              </motion.li>
            );
          })}
        </AnimatePresence>

        {filtrados.length === 0 && (
          <li className="rounded-[var(--radius-card)] border border-dashed border-[var(--borda-suave)] px-4 py-8 text-center text-sm text-texto-suave">
            Nenhum processo com esse filtro.
          </li>
        )}
      </ul>
    </div>
  );
}

function Filtro({
  rotulo,
  opcoes,
  selecionado,
  aoSelecionar,
}: {
  rotulo: string;
  opcoes: { id: string; rotulo: string }[];
  selecionado: string | null;
  aoSelecionar: (valor: string | null) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] tracking-wider text-texto-suave uppercase">
        {rotulo}
      </p>
      {/* group/radiogroup e não botões soltos: leitor de tela precisa saber
          que os itens são alternativas de um mesmo filtro. */}
      <div role="radiogroup" aria-label={`Filtrar por ${rotulo}`} className="flex flex-wrap gap-1.5">
        <Pilula
          ativo={selecionado === null}
          aoClicar={() => aoSelecionar(null)}
        >
          Todos
        </Pilula>
        {opcoes.map((o) => (
          <Pilula
            key={o.id}
            ativo={selecionado === o.id}
            aoClicar={() => aoSelecionar(selecionado === o.id ? null : o.id)}
          >
            {o.rotulo}
          </Pilula>
        ))}
      </div>
    </div>
  );
}

function Pilula({
  children,
  ativo,
  aoClicar,
}: {
  children: React.ReactNode;
  ativo: boolean;
  aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativo}
      onClick={aoClicar}
      className={cn(
        "rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-medium transition-colors",
        ativo
          ? "border-[var(--borda-acento)] bg-acento/15 text-acento-claro"
          : "border-[var(--borda-suave)] text-texto-suave hover:bg-white/5 hover:text-texto",
      )}
    >
      {children}
    </button>
  );
}
