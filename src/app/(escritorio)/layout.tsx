import { SidebarEscritorio } from "@/componentes/escritorio/sidebar-escritorio";
import { TransicaoPagina } from "@/kernel/ui/transicao";

/**
 * Shell do painel do escritório.
 *
 * Grupo de rotas separado do `(painel)` de propósito: são dois produtos com o
 * mesmo design system, e não duas telas do mesmo produto. O cliente vê a
 * própria empresa, a contadora vê a carteira inteira. Compartilhar o layout
 * obrigaria a Topbar a perguntar "quem está logado?" em cada render, que é
 * exatamente o tipo de condicional que apodrece.
 */
export default function LayoutEscritorio({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <SidebarEscritorio />
      <div className="lg:ml-60">
        <main className="p-4 lg:p-8">
          <TransicaoPagina>{children}</TransicaoPagina>
        </main>
      </div>
    </div>
  );
}
