import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Checagem otimista de sessão.
 *
 * ── Por que `proxy.ts` e não `middleware.ts` ────────────────────────────────
 * A partir do Next 16 o middleware foi renomeado para proxy e passou a rodar no
 * runtime Node em vez de Edge. `middleware.ts` continua existindo só como saída
 * para quem precisa de Edge.
 *
 * ── Por que isto NÃO é a proteção de verdade ────────────────────────────────
 * Aqui só se olha se o cookie EXISTE. Não se consulta o banco, não se valida o
 * token, não se checa expiração. O motivo é que o proxy roda em toda navegação,
 * inclusive em prefetch de link — uma consulta ao banco aqui multiplicaria carga
 * sem entregar segurança.
 *
 * Cookie forjado à mão passa por este ponto **de propósito**. Quem barra é o
 * `exigirSessao()` de `dominio/auth/sessao.ts`, que resolve o token contra a
 * tabela. Este arquivo existe para evitar carregar a tela inteira de quem
 * claramente não está logado, e a documentação do Next é explícita em dizer que
 * ele não deve ser a única linha de defesa.
 */

const COOKIE = "sessao";

export function proxy(request: NextRequest) {
  const temCookie = Boolean(request.cookies.get(COOKIE)?.value);
  const { pathname } = request.nextUrl;

  if (!temCookie) {
    const destino = new URL("/entrar", request.nextUrl);
    // Guarda para onde a pessoa queria ir, para voltar depois de entrar.
    if (pathname !== "/") destino.searchParams.set("de", pathname);
    return NextResponse.redirect(destino);
  }

  return NextResponse.next();
}

/**
 * O que passa por aqui.
 *
 * Sem `matcher`, o proxy rodaria em TODA requisição — inclusive `_next/static`,
 * imagens e arquivos de `public/`, o que faria a própria tela de login perder
 * CSS ao redirecionar os assets dela.
 *
 * Ficam de fora: a rota de entrar (senão ninguém consegue chegar nela), a
 * `/ajuda` (é material de apoio e não expõe dado), a API do assistente, os
 * arquivos internos do Next e qualquer coisa com extensão.
 */
export const config = {
  matcher: [
    "/((?!entrar|ajuda|api|_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
};
