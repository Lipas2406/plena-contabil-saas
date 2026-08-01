"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Cartao } from "@/kernel/ui/cartao";
import { cn } from "@/kernel/cn";

/**
 * Tile de indicador. Número grande primeiro, rótulo depois.
 *
 * A variação vem como texto pronto e com sinal explícito de direção, em vez
 * de a UI inferir de um número: "menos imposto" é bom e "menos faturamento"
 * é ruim, e só quem conhece a métrica sabe qual é qual.
 *
 * `icone` é ReactNode, e NÃO `LucideIcon`. Motivo: este é um componente de
 * cliente e a página que o usa é de servidor. Componente é função, e função
 * não atravessa a fronteira RSC (o build quebra com "Functions cannot be
 * passed directly to Client Components"). Elemento já renderizado atravessa,
 * porque vira markup no payload.
 *
 * `href`, quando informado, torna o cartão inteiro um link (âncora da própria
 * página). A seta que indica isso fica visível o tempo todo, não só no hover:
 * em tela de toque não existe hover, e é exatamente lá que uma pessoa com
 * pouca prática digital mais precisa do sinal de "isto leva a algum lugar".
 */
export function ResumoNumerico({
  rotulo,
  valor,
  detalhe,
  icone,
  tom = "neutro",
  href,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  icone: ReactNode;
  tom?: "ok" | "alerta" | "critico" | "acento" | "neutro";
  /** Âncora da própria página (ex: "#processos"). Card vira link quando presente. */
  href?: string;
}) {
  const TONS = {
    ok: "text-ok bg-ok/10",
    alerta: "text-alerta bg-alerta/10",
    critico: "text-critico bg-critico/10",
    acento: "text-acento bg-acento/10",
    neutro: "text-texto-suave bg-white/5",
  } as const;

  const conteudo = (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wider text-texto-suave uppercase">
          {rotulo}
        </p>
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl [&_svg]:size-[18px]",
            TONS[tom],
          )}
          aria-hidden
        >
          {icone}
        </span>
      </div>

      <p className="mt-4 font-display text-3xl leading-none font-semibold text-texto">
        {valor}
      </p>

      <div className="mt-2 flex items-center justify-between gap-2">
        {detalhe && <p className="text-xs text-texto-suave">{detalhe}</p>}
        {href && (
          <ChevronRight
            className="ml-auto size-4 shrink-0 text-texto-suave/60"
            aria-hidden
          />
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        title={`Ver ${rotulo.toLowerCase()}`}
        aria-label={`${rotulo}: ${valor}${detalhe ? `, ${detalhe}` : ""}. Ir para essa seção.`}
        className="block h-full"
      >
        <Cartao className="h-full" grausMaximos={4}>
          {conteudo}
        </Cartao>
      </a>
    );
  }

  return (
    <Cartao className="h-full" grausMaximos={4}>
      {conteudo}
    </Cartao>
  );
}
