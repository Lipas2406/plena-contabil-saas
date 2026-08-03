import { Sidebar } from "@/componentes/painel/sidebar";
import { Topbar } from "@/componentes/painel/topbar";
import { TransicaoPagina } from "@/kernel/ui/transicao";
import { clienteLogado } from "@/dominio/sessao";
import { avisosDoCliente } from "@/dominio/avisos";
import { listarProcessosDoCliente } from "@/dominio/armazenamento-processos";

/**
 * Shell do painel do cliente.
 *
 * Componente de servidor: lê a sessão aqui e passa só o necessário para a
 * Topbar, que é cliente. Assim o mock inteiro de clientes não vai parar no
 * bundle do navegador só para mostrar um nome no canto.
 */
// clienteLogado() resolve via arquivo persistido, não array estático.
export const dynamic = "force-dynamic";
export default function LayoutPainel({
  children,
}: {
  children: React.ReactNode;
}) {
  const cliente = clienteLogado();
  // Avisos derivados aqui, no servidor: a Topbar é componente de cliente e não
  // deve carregar o domínio inteiro no bundle só para contar pendência.
  const avisos = avisosDoCliente(cliente, listarProcessosDoCliente(cliente.id));

  return (
    <div className="min-h-dvh">
      <Sidebar />

      {/* A margem compensa a sidebar fixa, que sai do fluxo do documento. */}
      <div className="lg:ml-64">
        <Topbar
          nomeUsuario={cliente.responsavel ?? cliente.nomeFantasia}
          empresa={cliente.nomeFantasia}
          avisos={avisos}
        />
        <main className="p-4 lg:p-8">
          <TransicaoPagina>{children}</TransicaoPagina>
        </main>
      </div>
    </div>
  );
}
