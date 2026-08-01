"use client";

import { Cartao } from "@/kernel/ui/cartao";
import { Etiqueta } from "@/kernel/ui/tabela";
import { ProgressoCircular } from "@/kernel/ui/progresso-circular";
import { formatarBRL } from "@/kernel/br";
import { formatarData, formatarMes } from "@/kernel/datas";
import { cn } from "@/kernel/cn";
import {
  descricaoPrazo,
  fracaoConsumida,
  rotuloPrazo,
  rotuloStatus,
  tomDoPrazo,
} from "@/dominio/prazos";
import type { Obrigacao } from "@/dominio/tipos";

const COR_ANEL: Record<string, string> = {
  ok: "text-ok",
  alerta: "text-alerta",
  critico: "text-critico",
  neutro: "text-texto-suave",
};

/**
 * Cartão de próximo vencimento com contagem regressiva visual.
 *
 * O anel mostra o prazo CONSUMIDO, então ele enche conforme a data chega.
 * Cheio e vermelho comunica urgência sem precisar de texto, que é o ponto
 * de ter contagem visual em vez de só a data escrita.
 */
export function CartaoVencimento({ obrigacao }: { obrigacao: Obrigacao }) {
  const tom = tomDoPrazo(obrigacao);
  const prazo = rotuloPrazo(obrigacao);
  const critico = tom === "critico" && obrigacao.status !== "pago";

  return (
    <Cartao className="h-full">
      <div className="flex items-start gap-4 p-5">
        <ProgressoCircular
          valor={fracaoConsumida(obrigacao)}
          className={COR_ANEL[tom]}
          pulsar={critico}
          tamanho={76}
          rotuloAcessivel={`${obrigacao.sigla}: ${descricaoPrazo(obrigacao)}`}
        >
          <div className="text-center leading-none">
            <p
              className={cn(
                "font-display text-lg font-semibold",
                COR_ANEL[tom],
              )}
            >
              {prazo.valor}
            </p>
            <p className="mt-0.5 text-[10px] text-texto-suave">{prazo.unidade}</p>
          </div>
        </ProgressoCircular>

        <div className="min-w-0 flex-1">
          {/* Sem seta de "ver mais": este cartão já mostra tudo que existe
              sobre a guia, e /painel/obrigacoes ainda não foi construído. Seta
              apontando pra lugar nenhum é o tipo de coisa que confunde quem
              tem menos prática digital. Volta quando a página de guias
              existir de verdade. */}
          <p className="font-display text-lg leading-tight font-semibold text-texto">
            {obrigacao.sigla}
          </p>
          <p className="truncate text-xs text-texto-suave">
            {obrigacao.descricao}
          </p>

          <p className="mt-3 font-display text-2xl font-semibold texto-dourado">
            {formatarBRL(obrigacao.valorCentavos)}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Etiqueta tom={tom === "neutro" ? "neutro" : tom}>
              {rotuloStatus(obrigacao.status)}
            </Etiqueta>
            <span className="text-xs text-texto-suave">
              vence {formatarData(obrigacao.vencimento)}
            </span>
          </div>

          <p className="mt-2 text-[11px] text-texto-suave/70">
            competência {formatarMes(obrigacao.competencia)}
          </p>
        </div>
      </div>
    </Cartao>
  );
}
