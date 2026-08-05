"use server";

import { revalidatePath } from "next/cache";
import { apenasDigitos } from "@/kernel/br";
import { exigirSessao } from "@/dominio/auth/sessao";
import { cadastroIncompleto } from "@/dominio/mocks/clientes";
import type { StatusCliente } from "@/dominio/tipos";
import {
  adicionarCliente,
  buscarClientePorId,
  atualizarCliente,
  CarteiraSomenteLeituraError,
  definirStatusCliente,
  type EdicaoClienteEntrada,
  type NovoClienteEntrada,
} from "@/dominio/armazenamento-clientes";

export interface ResultadoCriarCliente {
  ok: boolean;
  erro?: string;
  cliente?: { id: string; nomeFantasia: string };
}

/**
 * Única porta de escrita da carteira a partir da UI.
 *
 * Validação aqui é de FORMATO, não de negócio: 14 dígitos de CNPJ, 11 de
 * CPF. Não valida dígito verificador nem exige nada além do nome, porque a
 * regra do projeto é aceitar cadastro incompleto e mostrar "a informar",
 * não bloquear a contadora por falta de dado que ela ainda não tem.
 */
export async function criarCliente(
  dados: NovoClienteEntrada,
): Promise<ResultadoCriarCliente> {
  // Conferir na PÁGINA não protege esta ação: Server Action é alcançável por
  // POST direto, sem passar pela tela. A doc do Next avisa isso em três
  // lugares distintos, e por isso a verificação se repete aqui.
  await exigirSessao();

  const nome = dados.nomeFantasia?.trim();
  if (!nome) {
    return { ok: false, erro: "Nome é obrigatório." };
  }

  if (dados.tipoPessoa === "PJ" && dados.cnpj) {
    if (apenasDigitos(dados.cnpj).length !== 14) {
      return { ok: false, erro: "CNPJ precisa ter 14 dígitos, ou deixe em branco." };
    }
  }

  if (dados.tipoPessoa === "PF" && dados.cpf) {
    if (apenasDigitos(dados.cpf).length !== 11) {
      return { ok: false, erro: "CPF precisa ter 11 dígitos, ou deixe em branco." };
    }
  }

  let cliente;
  try {
    cliente = await adicionarCliente(dados);
  } catch (e) {
    // A UI já esconde o botão quando a carteira é somente leitura. Este ramo
    // cobre quem chegar pela Server Action direto, e o importante é não fingir
    // que salvou: devolve o motivo, não um sucesso vazio.
    if (e instanceof CarteiraSomenteLeituraError) {
      return {
        ok: false,
        erro: "Esta demonstração está publicada em modo somente leitura, então o cadastro não é salvo. Rodando local, ele funciona.",
      };
    }
    throw e;
  }

  // As duas telas leem a mesma carteira: o painel do escritório mostra
  // todo mundo, o painel do cliente pode logar como o recém-criado no dia
  // em que a sessão deixar de ser fixa em sessao.ts.
  revalidatePath("/escritorio");
  revalidatePath("/painel");

  return { ok: true, cliente: { id: cliente.id, nomeFantasia: cliente.nomeFantasia } };
}

/**
 * Completa ou corrige cadastro de cliente que já existe.
 *
 * Mesma validação de FORMATO do cadastro novo, e pela mesma razão: aceitar
 * cadastro incompleto é regra do projeto, então nada aqui exige campo. O que
 * não pode é aceitar um CNPJ com 9 dígitos e gravar lixo.
 */
export async function editarCliente(
  id: string,
  dados: EdicaoClienteEntrada,
): Promise<ResultadoCriarCliente> {
  // Mesma razão de `criarCliente`: a ação é alcançável por POST direto.
  await exigirSessao();

  if (!id) return { ok: false, erro: "Cliente não identificado." };

  if (dados.nomeFantasia !== undefined && !dados.nomeFantasia.trim()) {
    return { ok: false, erro: "Nome não pode ficar vazio." };
  }
  if (dados.cnpj?.trim() && apenasDigitos(dados.cnpj).length !== 14) {
    return { ok: false, erro: "CNPJ precisa ter 14 dígitos, ou deixe em branco." };
  }
  if (dados.cpf?.trim() && apenasDigitos(dados.cpf).length !== 11) {
    return { ok: false, erro: "CPF precisa ter 11 dígitos, ou deixe em branco." };
  }

  let cliente;
  try {
    cliente = await atualizarCliente(id, dados);
  } catch (e) {
    if (e instanceof CarteiraSomenteLeituraError) {
      return {
        ok: false,
        erro: "Esta demonstração está publicada em modo somente leitura, então a alteração não é salva. Rodando local, ela funciona.",
      };
    }
    return { ok: false, erro: e instanceof Error ? e.message : "Falha ao salvar." };
  }

  revalidatePath("/escritorio");
  revalidatePath("/painel");

  return { ok: true, cliente: { id: cliente.id, nomeFantasia: cliente.nomeFantasia } };
}

/**
 * Arquiva um cliente, ou o traz de volta.
 *
 * O nome importa: **não existe excluir** neste sistema, e a razão é dupla.
 * A legal, que manda: documento contábil tem prazo de guarda, e apagar o
 * cliente levaria junto o rastro de tudo que foi entregue por ele. A técnica,
 * que confirma: processos, documentos e obrigações apontam para o cliente com
 * chave estrangeira RESTRICT, então o próprio banco recusaria o DELETE.
 *
 * A confirmação da tela cobre o resto: arquivar por engano é reversível aqui,
 * mas ainda tira o cliente da vista de quem depende dela para saber o que
 * fazer no dia.
 */
export async function arquivarCliente(
  id: string,
  arquivar: boolean,
): Promise<ResultadoCriarCliente> {
  // Mesma razão das outras: Server Action é alcançável por POST direto.
  await exigirSessao();

  if (!id) return { ok: false, erro: "Cliente não identificado." };

  let cliente;
  try {
    let destino: StatusCliente = "inativo";

    if (!arquivar) {
      // Reativar tem que devolver o cliente ao estado que ele tinha, senão a
      // promessa da tela ("volta como estava") é mentira. Como o status
      // anterior não é guardado em lugar nenhum, ele é RECALCULADO pela mesma
      // regra que classifica o resto da carteira: cadastro com lacuna é
      // "pendente", cadastro completo é "ativo".
      //
      // Sem isto, um cliente "pendente" arquivado por engano voltava "ativo", e
      // a informação de que faltava dado no cadastro sumia no caminho.
      const atual = await buscarClientePorId(id);
      if (!atual) return { ok: false, erro: "Cliente não existe." };
      destino = cadastroIncompleto(atual).length > 0 ? "pendente" : "ativo";
    }

    cliente = await definirStatusCliente(id, destino);
  } catch (e) {
    if (e instanceof CarteiraSomenteLeituraError) {
      return {
        ok: false,
        erro: "Esta demonstração está publicada em modo somente leitura, então a alteração não é salva. Rodando local, ela funciona.",
      };
    }
    return { ok: false, erro: e instanceof Error ? e.message : "Falha ao salvar." };
  }

  revalidatePath("/escritorio");
  revalidatePath("/painel");

  return { ok: true, cliente: { id: cliente.id, nomeFantasia: cliente.nomeFantasia } };
}
