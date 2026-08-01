import { Construction } from "lucide-react";
import { Cartao } from "@/kernel/ui/cartao";

/**
 * Placeholder honesto para rota que a sidebar já aponta mas que ainda não
 * foi construída. Existe para não haver link morto no layout entregue.
 * Cada uma destas telas é substituída pela implementação real.
 */
export function EmConstrucao({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="font-display text-3xl font-semibold text-texto">
        {titulo}
      </h1>
      <p className="mt-2 text-sm text-texto-suave">{descricao}</p>

      <Cartao semInclinacao className="mt-8">
        <div className="grid place-items-center gap-3 p-12 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-acento/10 text-acento">
            <Construction className="size-6" aria-hidden />
          </span>
          <p className="font-display text-lg text-texto">
            Tela ainda não construída
          </p>
          <p className="max-w-md text-sm text-texto-suave">
            O layout, a navegação e o design system já estão de pé. Esta rota
            entra na próxima etapa do desenvolvimento.
          </p>
        </div>
      </Cartao>
    </div>
  );
}
