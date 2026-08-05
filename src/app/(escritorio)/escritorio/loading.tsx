import { EsqueletoCartao, EsqueletoTexto } from "@/kernel/ui/esqueleto";

/**
 * Esqueleto do painel do escritório.
 *
 * Criado em 04/08/2026, junto com a passagem do armazenamento para
 * assíncrono. Enquanto a leitura era de disco síncrono, a página aparecia
 * pronta e este arquivo não fazia falta. Com uma ida à rede no meio, sem ele a
 * tela fica **em branco** durante a espera — e tela em branco é indistinguível
 * de sistema quebrado para quem está usando.
 *
 * O formato imita o da página real (quatro indicadores, depois blocos), porque
 * esqueleto menor que o conteúdo faz a página pular quando o dado chega, e o
 * pulo incomoda mais que a espera.
 */
export default function Carregando() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-12">
      <header>
        <EsqueletoTexto linhas={2} className="max-w-md" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <EsqueletoCartao key={i} />
          ))}
        </div>
      </header>

      {Array.from({ length: 3 }, (_, i) => (
        <section key={i}>
          <EsqueletoTexto linhas={2} className="mb-4 max-w-sm" />
          <EsqueletoCartao />
        </section>
      ))}

      <span className="sr-only" role="status">
        Carregando o painel do escritório.
      </span>
    </div>
  );
}
