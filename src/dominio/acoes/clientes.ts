"use server";

import { revalidatePath } from "next/cache";
import { apenasDigitos } from "@/kernel/br";
import {
  adicionarCliente,
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

  const cliente = adicionarCliente(dados);

  // As duas telas leem a mesma carteira: o painel do escritório mostra
  // todo mundo, o painel do cliente pode logar como o recém-criado no dia
  // em que a sessão deixar de ser fixa em sessao.ts.
  revalidatePath("/escritorio");
  revalidatePath("/painel");

  return { ok: true, cliente: { id: cliente.id, nomeFantasia: cliente.nomeFantasia } };
}
