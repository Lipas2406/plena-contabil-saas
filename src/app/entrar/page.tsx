import { redirect } from "next/navigation";
import { FormularioLogin } from "@/componentes/auth/formulario-login";
import { sessaoAtual } from "@/dominio/auth/sessao";

export const metadata = {
  title: "Entrar (Plena Contábil)",
};

/**
 * Tela de entrada.
 *
 * Não tem link de "criar conta" nem de "esqueci a senha", e isso é decisão, não
 * falta: o sistema **não tem auto-cadastro**. Quem entra é quem a contadora
 * autorizar, e a conta nasce por linha de comando (`npm run criar-usuario`),
 * fora da internet. Senha esquecida se resolve pelo mesmo caminho.
 */
export default async function PaginaEntrar() {
  // Quem já está logado não precisa ver isto. `redirect` fora de try/catch.
  if (await sessaoAtual()) redirect("/escritorio");

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <header className="mb-8 text-center">
          <h1 className="font-display text-3xl font-semibold text-texto">
            Plena Contábil
          </h1>
          <p className="mt-2 text-sm text-texto-suave">
            Entre para acessar a carteira.
          </p>
        </header>

        <div className="vidro-forte rounded-[var(--radius-painel)] p-6 shadow-[var(--sombra-profunda)]">
          <FormularioLogin />
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-texto-suave">
          O acesso é criado pelo escritório. Se você não consegue entrar, fale
          com a Plena.
        </p>
      </div>
    </main>
  );
}
