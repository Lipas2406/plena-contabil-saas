"use server";

import { redirect } from "next/navigation";
import { autenticar } from "@/dominio/banco/usuarios";
import { criarSessao, encerrarSessao } from "@/dominio/auth/sessao";

/**
 * Entrar e sair.
 *
 * Server Action é o único lugar (junto com Route Handler) onde se pode gravar
 * cookie: o HTTP não aceita cookie depois que o streaming da resposta começou,
 * então o Next proíbe isso na renderização de um Server Component.
 */

export interface EstadoLogin {
  erro?: string;
  /** Preservado para o campo não esvaziar quando a senha erra. */
  email?: string;
}

export async function entrar(
  _anterior: EstadoLogin | undefined,
  dados: FormData,
): Promise<EstadoLogin> {
  const email = String(dados.get("email") ?? "").trim();
  const senha = String(dados.get("senha") ?? "");

  if (!email || !senha) {
    return { erro: "Preencha e-mail e senha.", email };
  }

  const usuario = await autenticar(email, senha);

  /*
    Uma mensagem só para os dois casos, de propósito.

    "E-mail não cadastrado" contaria a quem tenta adivinhar quais endereços
    existem no sistema. A camada de baixo já iguala o TEMPO de resposta dos
    dois casos; aqui iguala-se o texto.
  */
  if (!usuario) {
    return { erro: "E-mail ou senha incorretos.", email };
  }

  await criarSessao(usuario.id);

  /*
    `redirect` FORA de try/catch, e depois de tudo que precisa acontecer.

    Ele funciona lançando uma exceção de controle de fluxo: dentro de um `try`,
    o próprio catch a engoliria e o redirecionamento nunca aconteceria — com a
    sessão já criada, o usuário ficaria preso na tela de login já autenticado.
    A documentação do Next avisa isso explicitamente.

    Nada abaixo desta linha executa.
  */
  redirect("/escritorio");
}

export async function sair(): Promise<void> {
  await encerrarSessao();
  redirect("/entrar");
}
