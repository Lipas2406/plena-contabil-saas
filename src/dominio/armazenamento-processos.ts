import { gravarJSON, lerJSON } from "@/dominio/armazenamento-base";
import { listarProcessos as semear } from "@/dominio/mocks/processos";
import type { Processo } from "@/dominio/tipos";

/**
 * Estado dos processos que a contadora alterou, persistido fora do git.
 *
 * Guarda SOBREPOSIÇÃO, não o processo inteiro, e essa é a decisão central
 * deste arquivo. As etapas e as datas vêm da semente em `mocks/processos.ts`,
 * que é relativa ao mês corrente de propósito para o mock não envelhecer
 * (ver `padrao-mock-que-nao-envelhece` no vault). Se este arquivo copiasse o
 * processo inteiro, congelaria as datas no dia em que ela clicasse, e o mock
 * passaria a envelhecer justamente por causa do recurso que deveria ajudar.
 *
 * Então aqui mora só o que é decisão dela: quando o processo foi encerrado.
 *
 * Encerrar não apaga nem esconde: o processo continua na carteira, sai das
 * contagens de "em aberto" e passa a mostrar a data. Contadora que conclui uma
 * abertura de empresa ainda precisa achar aquele trabalho depois.
 */

const ARQUIVO = "processos.json";

interface AlteracaoProcesso {
  /** ISO 8601 (YYYY-MM-DD). Presente = encerrado. */
  encerradoEm: string;
}

type Alteracoes = Record<string, AlteracaoProcesso>;

function lerAlteracoes(): Alteracoes {
  return lerJSON<Alteracoes>(ARQUIVO) ?? {};
}

/**
 * Aplica o encerramento num processo. Função PURA: não lê nem grava disco.
 *
 * Separada de `listarProcessos` pelo mesmo motivo de `fundirCliente`: é a
 * regra que precisa de teste, e o portão não pode depender de estado em disco.
 * Testar uma cópia dela no script de verificação passaria a dar OK mesmo
 * depois desta função mudar.
 */
export function aplicarEncerramento(
  processo: Processo,
  encerradoEm: string,
): Processo {
  return {
    ...processo,
    encerradoEm,
    etapas: processo.etapas.map((e) => ({
      ...e,
      status: "concluida" as const,
      statusConfirmado: true,
    })),
  };
}

/**
 * Processos com as decisões da contadora aplicadas por cima da semente.
 *
 * Encerrar marca todas as etapas como concluídas E confirmadas: se ela diz que
 * o trabalho acabou, o andamento deixou de ser estimativa. É o mesmo
 * `statusConfirmado` que faz o aviso "Andamento a confirmar" sumir sozinho.
 */
export function listarProcessos(hoje = new Date()): Processo[] {
  const alteracoes = lerAlteracoes();
  return semear(hoje).map((p) => {
    const alteracao = alteracoes[p.id];
    return alteracao ? aplicarEncerramento(p, alteracao.encerradoEm) : p;
  });
}

export function listarProcessosDoCliente(clienteId: string, hoje = new Date()) {
  return listarProcessos(hoje).filter((p) => p.clienteId === clienteId);
}

export function encerrarProcesso(id: string, hoje = new Date()): Processo {
  const existe = semear(hoje).some((p) => p.id === id);
  if (!existe) throw new Error(`Processo ${id} não existe.`);

  const alteracoes = lerAlteracoes();
  alteracoes[id] = { encerradoEm: hoje.toISOString().slice(0, 10) };
  gravarJSON(ARQUIVO, alteracoes);

  return listarProcessos(hoje).find((p) => p.id === id)!;
}

/**
 * Desfaz o encerramento.
 *
 * Existe porque encerrar por engano é erro barato de cometer e caro de não
 * poder desfazer: sem isto, um clique errado obrigaria a mexer em arquivo à
 * mão. As etapas voltam ao que a semente diz, inclusive a estimativa.
 */
export function reabrirProcesso(id: string, hoje = new Date()): Processo {
  const alteracoes = lerAlteracoes();
  delete alteracoes[id];
  gravarJSON(ARQUIVO, alteracoes);

  const processo = listarProcessos(hoje).find((p) => p.id === id);
  if (!processo) throw new Error(`Processo ${id} não existe.`);
  return processo;
}
