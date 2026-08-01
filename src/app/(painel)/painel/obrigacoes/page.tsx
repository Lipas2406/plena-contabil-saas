import { EmConstrucao } from "@/componentes/painel/em-construcao";

export const metadata = { title: "Obrigações — Plena Contábil" };

/**
 * Caso diferente das outras três rotas: a máquina de obrigação EXISTE e está
 * testada (`dominio/mocks/obrigacoes.ts`, `dominio/prazos.ts`), e o Dashboard
 * já renderiza vencimento quando existe. O que falta é a tela de histórico.
 *
 * Hoje o array de obrigações está vazio de propósito, porque nenhum cliente
 * desta carteira tem contabilidade mensal recorrente. A explicação abaixo diz
 * isso ao cliente sem jargão.
 */
export default function Pagina() {
  return (
    <EmConstrucao
      titulo="Obrigações"
      descricao="Suas guias e tributos, com histórico e comprovantes."
      vaiTer={[
        "Todas as guias emitidas, das mais recentes para as mais antigas",
        "Comprovante de pagamento anexado a cada uma",
        "Filtro por ano e por tipo de tributo",
        "Aviso antes do vencimento, não depois",
      ]}
      hoje="O seu trabalho hoje é acompanhado por etapa, no Dashboard, e não por guia mensal. Quando existir alguma guia a pagar, ela aparece no Dashboard com a contagem de dias até o vencimento, antes mesmo desta tela ficar pronta."
    />
  );
}
