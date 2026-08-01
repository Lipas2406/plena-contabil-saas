import { redirect } from "next/navigation";

/**
 * A área pública (landing page com partículas, planos e cards 3D) é a próxima
 * etapa. Até ela existir, a raiz manda para o painel, em vez de servir o
 * boilerplate do create-next-app, que passaria a impressão de projeto quebrado.
 */
export default function Home() {
  redirect("/painel");
}
