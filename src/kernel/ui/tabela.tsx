import { type ReactNode } from "react";
import { cn } from "@/kernel/cn";

/**
 * Tabela genérica e tipada.
 *
 * `Coluna<T>` amarra `chave` às propriedades de T, então uma coluna que
 * aponta para campo inexistente vira erro de compilação, não célula vazia
 * descoberta em produção. `renderizar` recebe a linha inteira, e não só o
 * valor da célula, porque formatação quase sempre precisa de outro campo
 * (status depende de data, valor depende de moeda).
 *
 * Componente de servidor: sem estado, sem evento. Ordenação e paginação
 * pertencem a quem usa, que decide se resolve no servidor ou no cliente.
 */

export interface Coluna<T> {
  chave: keyof T & string;
  cabecalho: string;
  /** Conteúdo da célula. Sem isto, o valor é convertido para texto. */
  renderizar?: (linha: T) => ReactNode;
  alinhamento?: "esquerda" | "centro" | "direita";
  /** Esconde a coluna abaixo de md. Use nas menos importantes. */
  ocultarNoMobile?: boolean;
  className?: string;
}

const ALINHAMENTO = {
  esquerda: "text-left",
  centro: "text-center",
  direita: "text-right",
} as const;

interface TabelaProps<T> {
  colunas: Coluna<T>[];
  linhas: T[];
  /** Precisa ser estável entre renders. Índice de array não serve. */
  chaveDaLinha: (linha: T) => string;
  vazio?: ReactNode;
  legenda?: string;
  className?: string;
}

export function Tabela<T>({
  colunas,
  linhas,
  chaveDaLinha,
  vazio = "Nenhum registro encontrado.",
  legenda,
  className,
}: TabelaProps<T>) {
  if (linhas.length === 0) {
    return (
      <div className="grid place-items-center rounded-[var(--radius-card)] border border-dashed border-[var(--borda-suave)] p-10 text-center text-sm text-texto-suave">
        {vazio}
      </div>
    );
  }

  return (
    // O overflow-x fica no wrapper: tabela larga rola sozinha em vez de
    // empurrar a página inteira para os lados no celular.
    <div
      className={cn(
        "overflow-x-auto rounded-[var(--radius-card)] vidro",
        className,
      )}
    >
      <table className="w-full border-collapse text-sm">
        {legenda && <caption className="sr-only">{legenda}</caption>}
        <thead>
          <tr className="border-b border-[var(--borda-suave)]">
            {colunas.map((coluna) => (
              <th
                key={coluna.chave}
                scope="col"
                className={cn(
                  "px-4 py-3.5 text-xs font-semibold tracking-wider text-texto-suave uppercase",
                  ALINHAMENTO[coluna.alinhamento ?? "esquerda"],
                  coluna.ocultarNoMobile && "hidden md:table-cell",
                  coluna.className,
                )}
              >
                {coluna.cabecalho}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr
              key={chaveDaLinha(linha)}
              className="border-b border-[var(--borda-suave)] transition-colors last:border-0 hover:bg-white/[0.03]"
            >
              {colunas.map((coluna) => (
                <td
                  key={coluna.chave}
                  className={cn(
                    "px-4 py-3.5 text-texto",
                    ALINHAMENTO[coluna.alinhamento ?? "esquerda"],
                    coluna.ocultarNoMobile && "hidden md:table-cell",
                    coluna.className,
                  )}
                >
                  {coluna.renderizar
                    ? coluna.renderizar(linha)
                    : String(linha[coluna.chave] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Etiqueta de status. `tom` é semântico, não cor, para trocar tema sem caçar hex. */
export function Etiqueta({
  children,
  tom = "neutro",
  className,
}: {
  children: ReactNode;
  tom?: "ok" | "alerta" | "critico" | "info" | "neutro";
  className?: string;
}) {
  const TONS = {
    ok: "bg-ok/12 text-ok border-ok/25",
    alerta: "bg-alerta/12 text-alerta border-alerta/25",
    critico: "bg-critico/12 text-critico border-critico/25",
    info: "bg-info/12 text-info border-info/25",
    neutro: "bg-white/5 text-texto-suave border-white/10",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border",
        "px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        TONS[tom],
        className,
      )}
    >
      {children}
    </span>
  );
}
