import { diasAte } from "@/kernel/datas";
import { cadastroIncompleto } from "@/dominio/mocks/clientes";
import { listarClientes } from "@/dominio/armazenamento-clientes";
import { listarObrigacoes } from "@/dominio/mocks/obrigacoes";
import { listarProcessos } from "@/dominio/armazenamento-processos";
import { documentosAguardando } from "@/dominio/mocks/documentos";
import type { Cliente, Processo, TipoAtendimento } from "@/dominio/tipos";

/**
 * Visão do ESCRITÓRIO, não do cliente.
 *
 * Tudo aqui é derivado dos mesmos mocks que o painel do cliente lê. Nenhum
 * dado novo é inventado nesta camada, e essa é a regra: se a contadora corrigir
 * uma etapa, o semáforo, o kanban e os contadores mudam juntos, porque são a
 * mesma fonte vista de ângulos diferentes. Duplicar o estado aqui seria criar
 * duas verdades sobre a mesma carteira.
 */

/**
 * Semáforo do cliente.
 *
 * O prompt original pedia verde/amarelo/vermelho por atraso de imposto. Não
 * serve para esta carteira: nenhum dos 6 tem guia mensal, então o semáforo
 * ficaria verde para todo mundo e não diria nada. O critério aqui é o que de
 * fato trava o trabalho:
 *
 * - vermelho: tem etapa BLOQUEADA, ou guia em atraso quando houver guia.
 * - amarelo: cadastro incompleto, que impede emitir ou declarar.
 * - verde: andando, nada travado.
 */
export type SinalCliente = "critico" | "atencao" | "ok";

export interface ClienteNaCarteira {
  cliente: Cliente;
  processos: Processo[];
  sinal: SinalCliente;
  /** Frase curta que explica o sinal. Vai para a tela como está. */
  motivo: string;
  etapasAbertas: number;
  etapasTravadas: number;
  camposFaltando: string[];
  /** Dias desde a abertura do processo mais antigo em aberto. */
  diasSemFechar: number | null;
}

export function montarCarteira(hoje = new Date()): ClienteNaCarteira[] {
  const processos = listarProcessos(hoje);
  const obrigacoes = listarObrigacoes(hoje);

  return listarClientes().map((cliente) => {
    const meus = processos.filter((p) => p.clienteId === cliente.id);
    const etapas = meus.flatMap((p) => p.etapas);
    const travadas = etapas.filter((e) => e.status === "bloqueada");
    const abertas = etapas.filter((e) => e.status !== "concluida");
    const faltando = cadastroIncompleto(cliente);
    const atrasadas = obrigacoes.filter(
      (o) => o.clienteId === cliente.id && o.status === "atrasado",
    );

    // Processo é "em aberto" enquanto tiver qualquer etapa não concluída.
    const emAberto = meus.filter((p) =>
      p.etapas.some((e) => e.status !== "concluida"),
    );
    const maisAntigo = emAberto
      .map((p) => diasAte(p.abertoEm, hoje))
      .sort((a, b) => a - b)[0];

    let sinal: SinalCliente = "ok";
    let motivo = "Andando, nada travado";

    if (atrasadas.length > 0) {
      sinal = "critico";
      motivo = `${atrasadas.length} guia(s) em atraso`;
    } else if (travadas.length > 0) {
      sinal = "critico";
      motivo =
        travadas[0].observacao ?? `${travadas.length} etapa(s) travada(s)`;
    } else if (faltando.length > 0) {
      sinal = "atencao";
      motivo = `Falta ${faltando.join(", ")}`;
    } else if (meus.length === 0) {
      // Cliente recém-cadastrado, cadastro completo, nenhum processo aberto
      // ainda. Diferente de "tudo concluído": aqui nada foi sequer começado.
      motivo = "Nenhum processo aberto ainda";
    } else if (abertas.length === 0) {
      motivo = "Tudo concluído";
    }

    return {
      cliente,
      processos: meus,
      sinal,
      motivo,
      etapasAbertas: abertas.length,
      etapasTravadas: travadas.length,
      camposFaltando: faltando,
      diasSemFechar: maisAntigo === undefined ? null : Math.abs(maisAntigo),
    };
  });
}

/** Os 4 números do topo. Todos derivados, nenhum digitado. */
export function resumoDoEscritorio(hoje = new Date()) {
  const carteira = montarCarteira(hoje);
  return {
    clientes: carteira.length,
    tarefasAbertas: carteira.reduce((s, c) => s + c.etapasAbertas, 0),
    travadas: carteira.reduce((s, c) => s + c.etapasTravadas, 0),
    documentosNaFila: documentosAguardando().length,
  };
}

/* ============================================================
   QUADRO DE TAREFAS
   ============================================================ */

export type ColunaKanban = "a-fazer" | "em-progresso" | "concluido";

export interface TarefaEscritorio {
  id: string;
  coluna: ColunaKanban;
  rotulo: string;
  clienteId: string;
  clienteNome: string;
  processoTitulo: string;
  tipo: TipoAtendimento;
  travada: boolean;
  observacao?: string;
}

/**
 * O kanban NÃO tem tarefas próprias: cada cartão é uma etapa de processo.
 *
 * Foi decisão de projeto. Um quadro com tarefas digitadas à parte vira a
 * segunda lista de afazeres do escritório, e as duas divergem na primeira
 * semana. Aqui mover o cartão é mover a etapa, e o painel do cliente reflete
 * na hora, porque é o mesmo dado.
 */
export function tarefasDoEscritorio(hoje = new Date()): TarefaEscritorio[] {
  const porId = new Map(listarClientes().map((c) => [c.id, c]));

  // Processo encerrado sai do quadro. O quadro é mesa de trabalho, não
  // arquivo: se ficasse, a coluna "concluído" cresceria para sempre e a tela
  // deixaria de responder "o que está na minha mão hoje". O trabalho concluído
  // continua visível no detalhe do cliente, com a data.
  return listarProcessos(hoje)
    .filter((p) => p.encerradoEm === null)
    .flatMap((processo) =>
      processo.etapas.map((etapa): TarefaEscritorio => ({
        id: etapa.id,
        coluna:
          etapa.status === "concluida"
            ? "concluido"
            : etapa.status === "em-andamento"
              ? "em-progresso"
              : "a-fazer",
        rotulo: etapa.rotulo,
        clienteId: processo.clienteId,
        clienteNome:
          porId.get(processo.clienteId)?.nomeFantasia ?? processo.clienteId,
        processoTitulo: processo.titulo,
        tipo: processo.tipo,
        travada: etapa.status === "bloqueada",
        observacao: etapa.observacao,
      })),
    );
}

/* ============================================================
   PRAZOS E ENVELHECIMENTO
   ============================================================ */

export interface ItemLinhaDoTempo {
  id: string;
  clienteId: string;
  clienteNome: string;
  titulo: string;
  tipo: TipoAtendimento;
  /** Dias em aberto desde que o processo começou. */
  diasAberto: number;
  /** Dias até o prazo. Nulo quando não existe prazo combinado. */
  diasAtePrazo: number | null;
  prazo: string | null;
  etapasAbertas: number;
  totalEtapas: number;
}

/**
 * Linha do tempo do escritório.
 *
 * O prompt pedia calendário tributário com DAS, DCTF e eSocial. Não existe
 * nada disso nesta carteira, e inventar encheria a tela de compromisso falso.
 * O que existe de verdade, e que dói, é processo aberto há meses sem prazo
 * combinado: 2 aberturas e 1 regularização arrastando. Então o eixo é
 * ENVELHECIMENTO, com o prazo aparecendo quando ele existe.
 *
 * Quando a primeira guia mensal entrar em `mocks/obrigacoes.ts`, ela cai aqui
 * pelo mesmo caminho, com data de vencimento no lugar de idade.
 */
export function linhaDoTempo(hoje = new Date()): ItemLinhaDoTempo[] {
  const porId = new Map(listarClientes().map((c) => [c.id, c]));

  return listarProcessos(hoje)
    .map((processo): ItemLinhaDoTempo => {
      const abertas = processo.etapas.filter((e) => e.status !== "concluida");
      return {
        id: processo.id,
        clienteId: processo.clienteId,
        clienteNome:
          porId.get(processo.clienteId)?.nomeFantasia ?? processo.clienteId,
        titulo: processo.titulo,
        tipo: processo.tipo,
        diasAberto: Math.abs(diasAte(processo.abertoEm, hoje)),
        diasAtePrazo: processo.prazo ? diasAte(processo.prazo, hoje) : null,
        prazo: processo.prazo,
        etapasAbertas: abertas.length,
        totalEtapas: processo.etapas.length,
      };
    })
    .filter((i) => i.etapasAbertas > 0)
    .sort((a, b) => b.diasAberto - a.diasAberto);
}
