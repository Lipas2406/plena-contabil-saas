"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatarBRL } from "@/kernel/br";
import type { PontoFinanceiro } from "@/dominio/mocks/financeiro";

/**
 * Evolução de faturamento e carga tributária.
 *
 * Duas séries em área empilhável visualmente, mas NÃO empilhadas de fato:
 * imposto está contido no faturamento, e somar as duas alturas mentiria
 * sobre o total. Por isso `stackId` não é usado.
 *
 * O eixo Y é abreviado em milhares. Valor fiscal em centavos escrito por
 * extenso ocupa metade da largura do gráfico e não é o que se lê num
 * gráfico de tendência, que serve para ver a forma da curva.
 */
export function GraficoEvolucao({ dados }: { dados: PontoFinanceiro[] }) {
  const emReais = dados.map((p) => ({
    mes: p.mes,
    competencia: p.competencia,
    Faturamento: p.faturamentoCentavos / 100,
    Impostos: p.impostosCentavos / 100,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={emReais}
          margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
        >
          <defs>
            <linearGradient id="grad-faturamento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E2C670" stopOpacity={0.42} />
              <stop offset="100%" stopColor="#E2C670" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="grad-impostos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="mes"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#8A9BB5", fontSize: 12 }}
            dy={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#8A9BB5", fontSize: 12 }}
            tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
            width={48}
          />
          <Tooltip
            cursor={{ stroke: "rgba(201,168,76,0.35)", strokeWidth: 1 }}
            content={<TooltipCustomizado />}
          />

          <Area
            type="monotone"
            dataKey="Faturamento"
            stroke="#E2C670"
            strokeWidth={2}
            fill="url(#grad-faturamento)"
            // Ponto some no repouso e aparece no hover: com 6 meses na tela,
            // bolinha fixa em cada mês vira poluição.
            dot={false}
            activeDot={{ r: 4, fill: "#E2C670", stroke: "#0A1628", strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="Impostos"
            stroke="#60A5FA"
            strokeWidth={2}
            fill="url(#grad-impostos)"
            dot={false}
            activeDot={{ r: 4, fill: "#60A5FA", stroke: "#0A1628", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ItemTooltip {
  name?: string;
  value?: number;
  color?: string;
}

function TooltipCustomizado({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ItemTooltip[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-[var(--radius-card)] vidro-forte px-3.5 py-2.5 shadow-[var(--sombra-elevada)]">
      <p className="mb-1.5 text-xs font-semibold tracking-wider text-texto-suave uppercase">
        {label}
      </p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-sm">
          <span
            className="size-2 rounded-full"
            style={{ background: item.color }}
            aria-hidden
          />
          <span className="text-texto-suave">{item.name}</span>
          <span className="ml-auto font-medium text-texto">
            {/* Volta para centavos: o gráfico trabalha em reais, mas a
                formatação canônica do repositório recebe centavos. */}
            {formatarBRL(Math.round((item.value ?? 0) * 100))}
          </span>
        </div>
      ))}
    </div>
  );
}
