import { cn } from "@/kernel/cn";

/**
 * Esqueleto de carregamento com brilho varrendo.
 *
 * Componente de servidor de propósito: não tem estado nem evento, e assim
 * pode ser usado dentro de `loading.tsx` e de Suspense sem arrastar o
 * bundle de cliente junto. A animação é CSS puro (classe `.esqueleto` em
 * globals.css), que também é o que a faz continuar rodando enquanto a thread
 * principal está ocupada hidratando.
 */
export function Esqueleto({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("esqueleto rounded-[var(--radius-card)]", className)}
    />
  );
}

/** Linhas de texto falsas. A última sai mais curta, como parágrafo real. */
export function EsqueletoTexto({
  linhas = 3,
  className,
}: {
  linhas?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: linhas }, (_, i) => (
        <Esqueleto
          key={i}
          className={cn("h-3.5 rounded-md", i === linhas - 1 && "w-3/5")}
        />
      ))}
    </div>
  );
}

/** Placeholder de cartão, no mesmo formato do conteúdo que vai substituí-lo. */
export function EsqueletoCartao({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] vidro p-5 shadow-[var(--sombra-profunda)]",
        className,
      )}
    >
      <Esqueleto className="h-4 w-1/3 rounded-md" />
      <Esqueleto className="mt-4 h-9 w-2/3 rounded-md" />
      <EsqueletoTexto linhas={2} className="mt-4" />
    </div>
  );
}
