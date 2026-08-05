import { gravarJSON, lerJSON } from "@/dominio/armazenamento-base";
import { bancoConfigurado } from "@/dominio/banco/conexao";
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

/**
 * Onde a sobreposição mora, neste ambiente.
 *
 * Import dinâmico pelo mesmo motivo da carteira: evita ciclo e resolve na
 * primeira chamada.
 */
async function repositorio() {
  return import("@/dominio/banco/processos");
}

async function lerAlteracoes(): Promise<Alteracoes> {
  if (bancoConfigurado()) return (await repositorio()).lerAlteracoes();
  return (await lerJSON<Alteracoes>(ARQUIVO)) ?? {};
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
export async function listarProcessos(hoje = new Date()): Promise<Processo[]> {
  const alteracoes = await lerAlteracoes();
  return semear(hoje).map((p) => {
    const alteracao = alteracoes[p.id];
    return alteracao ? aplicarEncerramento(p, alteracao.encerradoEm) : p;
  });
}

export async function listarProcessosDoCliente(
  clienteId: string,
  hoje = new Date(),
) {
  return (await listarProcessos(hoje)).filter((p) => p.clienteId === clienteId);
}

export async function encerrarProcesso(
  id: string,
  hoje = new Date(),
): Promise<Processo> {
  const existe = semear(hoje).some((p) => p.id === id);
  if (!existe) throw new Error(`Processo ${id} não existe.`);

  // Data em UTC, como todo o resto do módulo `kernel/datas`. Consequência
  // conhecida: encerrar depois das 21h no horário de Brasília registra o dia
  // seguinte. Vencimento e competência são datas de calendário e UTC está
  // certo para elas; "quando a pessoa clicou" é um instante, e para esse caso
  // não está. Mudar exige revisar o módulo inteiro, então fica registrado em
  // vez de corrigido pela metade.
  const encerradoEm = hoje.toISOString().slice(0, 10);

  if (bancoConfigurado()) {
    await (await repositorio()).registrarEncerramento(id, encerradoEm);
  } else {
    const alteracoes = await lerAlteracoes();
    alteracoes[id] = { encerradoEm };
    // Sem `await` aqui, a linha seguinte leria de volta e devolveria o processo
    // "encerrado" sem confirmação da escrita, e a tela mostraria sucesso.
    await gravarJSON(ARQUIVO, alteracoes);
  }

  return (await listarProcessos(hoje)).find((p) => p.id === id)!;
}

/**
 * Desfaz o encerramento.
 *
 * Existe porque encerrar por engano é erro barato de cometer e caro de não
 * poder desfazer: sem isto, um clique errado obrigaria a mexer em arquivo à
 * mão. As etapas voltam ao que a semente diz, inclusive a estimativa.
 */
export async function reabrirProcesso(
  id: string,
  hoje = new Date(),
): Promise<Processo> {
  if (bancoConfigurado()) {
    await (await repositorio()).removerEncerramento(id);
  } else {
    const alteracoes = await lerAlteracoes();
    delete alteracoes[id];
    await gravarJSON(ARQUIVO, alteracoes);
  }

  const processo = (await listarProcessos(hoje)).find((p) => p.id === id);
  if (!processo) throw new Error(`Processo ${id} não existe.`);
  return processo;
}
