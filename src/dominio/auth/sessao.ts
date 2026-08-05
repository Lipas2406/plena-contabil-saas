import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  abrirSessao,
  fecharSessao,
  usuarioDaSessao,
  type Usuario,
} from "@/dominio/banco/usuarios";

/**
 * Camada de acesso à sessão.
 *
 * É a **linha principal de defesa**, e não o `proxy.ts`. A documentação do Next
 * 16 é explícita: o proxy serve para checagem otimista (só lê o cookie, sem
 * tocar o banco, porque roda em toda navegação e até em prefetch), e não deve
 * ser a única proteção.
 *
 * Também não protegemos por layout, e isso é recomendação da doc, não gosto:
 * por causa da renderização parcial, **layout não re-renderiza a cada
 * navegação**, então a sessão deixaria de ser conferida ao trocar de rota.
 *
 * `server-only` no topo faz o build quebrar se algum componente de cliente
 * tentar importar isto — o que levaria o token para o navegador.
 */

const NOME_COOKIE = "sessao";
const DIAS = 30;

/**
 * Quem está logado, ou `null`.
 *
 * Embrulhado em `cache` do React: várias chamadas dentro do MESMO render
 * batem no banco uma vez só. Sem isso, uma página que confere a sessão em
 * quatro lugares faria quatro consultas idênticas.
 */
export const sessaoAtual = cache(async (): Promise<Usuario | null> => {
  const token = (await cookies()).get(NOME_COOKIE)?.value;
  return usuarioDaSessao(token);
});

/**
 * Exige sessão. Redireciona para o login quando não há.
 *
 * É esta função que cada página, Server Action e Route Handler protegida
 * chama. **Conferir na página não protege a Server Action daquela página** —
 * ela é alcançável por POST direto, então a verificação se repete dentro da
 * ação. A doc do Next repete esse aviso em três lugares distintos.
 */
export async function exigirSessao(): Promise<Usuario> {
  const usuario = await sessaoAtual();
  if (!usuario) redirect("/entrar");
  return usuario;
}

/**
 * Grava o cookie de sessão.
 *
 * Só pode ser chamada de Server Action ou Route Handler: o HTTP não permite
 * definir cookie depois que o streaming da resposta começou, então o Next
 * proíbe isso durante a renderização de um Server Component.
 *
 * As opções seguem o que a documentação recomenda para cookie de sessão:
 * - `httpOnly`: JavaScript da página não lê. Sem isso, um XSS rouba a sessão.
 * - `secure`: só viaja por HTTPS. Desligado em desenvolvimento, senão o cookie
 *   não é aceito em `http://localhost`.
 * - `sameSite: "lax"`: o navegador não manda o cookie em requisição vinda de
 *   outro site, o que corta CSRF sem quebrar a navegação normal por link.
 */
export async function criarSessao(usuarioId: string): Promise<void> {
  const token = await abrirSessao(usuarioId);
  const expira = new Date(Date.now() + DIAS * 86_400_000);

  (await cookies()).set(NOME_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expira,
    path: "/",
  });
}

/**
 * Encerra a sessão.
 *
 * Apaga a linha no banco **antes** de limpar o cookie. A ordem importa: se o
 * cookie some primeiro e a remoção falha, sobra uma sessão válida no banco sem
 * ninguém para revogá-la.
 */
export async function encerrarSessao(): Promise<void> {
  const store = await cookies();
  await fecharSessao(store.get(NOME_COOKIE)?.value);
  store.delete(NOME_COOKIE);
}

/** Nome do cookie, para o `proxy.ts` ler sem duplicar a string. */
export const COOKIE_SESSAO = NOME_COOKIE;
