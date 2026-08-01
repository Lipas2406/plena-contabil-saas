import { Esqueleto, EsqueletoCartao } from "@/kernel/ui/esqueleto";

/**
 * Estado de carregamento do dashboard.
 *
 * O App Router usa este arquivo automaticamente como fallback de Suspense
 * enquanto a página é resolvida no servidor. O esqueleto imita o LAYOUT real
 * (4 tiles, 2 cartões largos, 1 gráfico), e não uma barra genérica: quando
 * o formato bate, o conteúdo parece preencher o espaço em vez de substituir
 * a tela, e a troca deixa de ser percebida como um salto.
 */
export default function CarregandoDashboard() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <Esqueleto className="h-9 w-64 rounded-lg" />
        <Esqueleto className="mt-3 h-4 w-80 rounded-md" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <EsqueletoCartao key={i} />
        ))}
      </div>

      <div>
        <Esqueleto className="h-6 w-52 rounded-md" />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }, (_, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-[var(--radius-card)] vidro p-5"
            >
              <Esqueleto className="size-[76px] shrink-0 rounded-full" />
              <div className="flex-1 space-y-3">
                <Esqueleto className="h-5 w-24 rounded-md" />
                <Esqueleto className="h-8 w-40 rounded-md" />
                <Esqueleto className="h-4 w-32 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] vidro p-5">
        <Esqueleto className="h-5 w-48 rounded-md" />
        <Esqueleto className="mt-5 h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}
