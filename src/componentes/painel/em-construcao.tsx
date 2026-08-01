import { Clock } from "lucide-react";
import { Cartao } from "@/kernel/ui/cartao";
import { Etiqueta } from "@/kernel/ui/tabela";

/**
 * Tela de rota que já está no menu mas ainda não foi construída.
 *
 * A versão anterior dizia só "Tela ainda não construída" e parava aí, o que
 * deixa quem chegou sem saber o que fazer. Esta pergunta o que a pessoa
 * queria e responde duas coisas:
 *
 * 1. O que vai existir aqui, para a tela comunicar o roteiro do produto.
 * 2. **Como resolver o assunto hoje**, que é o que ela realmente precisa.
 *
 * O item 2 é o que muda a experiência. Para alguém com pouca prática digital,
 * "em construção" sem alternativa é beco sem saída; com a alternativa, a tela
 * ainda cumpre uma função.
 */
export function EmConstrucao({
  titulo,
  descricao,
  vaiTer,
  hoje,
}: {
  titulo: string;
  descricao: string;
  /** O que a tela terá quando existir. */
  vaiTer: string[];
  /** Como o assunto é resolvido enquanto ela não existe. */
  hoje: string;
}) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-semibold text-texto">
          {titulo}
        </h1>
        <Etiqueta tom="neutro">
          <Clock className="size-3" aria-hidden />
          em breve
        </Etiqueta>
      </div>
      <p className="mt-2 text-sm text-texto-suave">{descricao}</p>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Cartao semInclinacao className="h-full">
          <div className="p-6">
            <h2 className="font-display text-lg font-medium text-texto">
              O que vai ter aqui
            </h2>
            <ul className="mt-4 space-y-2.5">
              {vaiTer.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-texto-suave">
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-acento/60"
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Cartao>

        <Cartao semInclinacao className="h-full">
          <div className="p-6">
            <h2 className="font-display text-lg font-medium text-texto">
              Como resolver hoje
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-texto-suave">
              {hoje}
            </p>
          </div>
        </Cartao>
      </div>
    </div>
  );
}
