import { diasAte } from "@/kernel/datas";
import { cadastroIncompleto } from "@/dominio/mocks/clientes";
import type { Cliente, Processo } from "@/dominio/tipos";

/**
 * Avisos do painel do cliente.
 *
 * ISTO NÃO É CAIXA DE MENSAGEM. Cada aviso é uma **condição viva** derivada do
 * estado real: existe enquanto a etapa está travada ou o cadastro está
 * incompleto, e some sozinho quando o assunto se resolve.
 *
 * A diferença importa e decidiu a interface. A versão anterior era uma lista
 * fixa escrita no código ("DAS de julho disponível", "Nota fiscal 1042",
 * "Ana respondeu"), com botão de "marcar todas como lidas". Três problemas de
 * uma vez:
 *
 * 1. Nada daquilo existia nesta carteira. Não há DAS, não há NF 1042, e não há
 *    nenhuma Ana. Era dado inventado sobre clientes reais, exatamente o que a
 *    regra do projeto proíbe.
 * 2. "Marcar como lida" pressupõe mensagem que alguém enviou. Condição não se
 *    marca como lida, se resolve.
 * 3. O contador nunca mudava, então virava enfeite que a pessoa aprende a
 *    ignorar.
 *
 * Derivar resolve os três: o número é verdade, muda quando o trabalho anda, e
 * cada aviso aponta para o lugar onde a pessoa faz algo a respeito.
 */

export type TomAviso = "critico" | "alerta" | "info";

export interface Aviso {
  id: string;
  titulo: string;
  descricao: string;
  tom: TomAviso;
  /** Âncora da seção que trata do assunto. */
  href: string;
}

/** A partir de quantos dias o prazo passa a ser assunto para o cliente. */
const DIAS_PRAZO_PROXIMO = 15;

export function avisosDoCliente(
  cliente: Cliente,
  processos: Processo[],
  hoje = new Date(),
): Aviso[] {
  const avisos: Aviso[] = [];

  // 1. Etapa travada. É o que de fato impede o trabalho de andar, então vem
  //    primeiro e com o motivo escrito, não só "há uma pendência".
  for (const processo of processos) {
    for (const etapa of processo.etapas) {
      if (etapa.status !== "bloqueada") continue;
      avisos.push({
        id: `travada-${etapa.id}`,
        titulo: `${processo.titulo}: etapa parada`,
        descricao: etapa.observacao ?? etapa.rotulo,
        tom: "critico",
        href: "#processos",
      });
    }
  }

  // 2. Prazo chegando. Só aparece se o prazo existe: a maior parte desta
  //    carteira não tem data combinada, e inventar uma seria pior que o silêncio.
  for (const processo of processos) {
    if (!processo.prazo) continue;
    const aberto = processo.etapas.some((e) => e.status !== "concluida");
    if (!aberto) continue;

    const dias = diasAte(processo.prazo, hoje);
    if (dias > DIAS_PRAZO_PROXIMO) continue;

    avisos.push({
      id: `prazo-${processo.id}`,
      titulo:
        dias < 0
          ? `${processo.titulo}: prazo vencido`
          : `${processo.titulo}: prazo chegando`,
      descricao:
        dias < 0
          ? `Venceu há ${Math.abs(dias)} dia(s).`
          : dias === 0
            ? "O prazo é hoje."
            : `Faltam ${dias} dia(s).`,
      tom: dias < 0 ? "critico" : "alerta",
      href: "#processos",
    });
  }

  // 3. Cadastro incompleto. Um aviso só, com a lista, em vez de um por campo:
  //    quatro avisos dizendo "falta um dado" viram ruído e escondem o resto.
  const faltando = cadastroIncompleto(cliente);
  if (faltando.length > 0) {
    avisos.push({
      id: "cadastro",
      titulo: "Faltam dados no seu cadastro",
      descricao: `A Plena precisa de: ${faltando.join(", ")}.`,
      tom: "alerta",
      href: "#cadastro",
    });
  }

  return avisos;
}
