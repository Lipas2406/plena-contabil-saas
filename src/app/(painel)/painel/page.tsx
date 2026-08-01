import {
  AlertTriangle,
  CalendarClock,
  FileCheck2,
  ListChecks,
  Lock,
} from "lucide-react";
import { Cartao, CartaoCabecalho, CartaoCorpo } from "@/kernel/ui/cartao";
import { Escalonado, EscalonadoItem } from "@/kernel/ui/transicao";
import { Etiqueta } from "@/kernel/ui/tabela";
import { formatarBRL } from "@/kernel/br";
import { clienteLogado, primeiroNome } from "@/dominio/sessao";
import { cadastroIncompleto } from "@/dominio/mocks/clientes";
import { listarObrigacoesDoCliente } from "@/dominio/mocks/obrigacoes";
import { listarProcessosDoCliente } from "@/dominio/mocks/processos";
import { CartaoProcesso } from "@/componentes/painel/cartao-processo";
import { CartaoVencimento } from "@/componentes/painel/cartao-vencimento";
import { ResumoNumerico } from "@/componentes/painel/resumo-numerico";

export const metadata = {
  title: "Dashboard (Plena Contábil)",
};

// clienteLogado() agora resolve via arquivo persistido (@/dominio/armazenamento-clientes).
export const dynamic = "force-dynamic";

/**
 * Dashboard do cliente.
 *
 * Componente de servidor: lê os mocks aqui e entrega dados já resolvidos aos
 * componentes de cliente. Só o que precisa de interação roda no navegador,
 * então o mock inteiro não vai para o bundle. Quando isto virar banco de
 * verdade, só este arquivo muda.
 *
 * Por que a tela é de PROCESSO e não de guia mensal: a carteira real da Plena
 * (ver `mocks/clientes.ts`) é feita de abertura, regularização, IRPF e
 * suporte. Guia mensal é minoria, então ela aparece só quando existe, e o
 * assunto principal do painel é a etapa em que o trabalho parou.
 */
export default function PaginaDashboard() {
  const cliente = clienteLogado();
  const obrigacoes = listarObrigacoesDoCliente(cliente.id);
  const processos = listarProcessosDoCliente(cliente.id);
  const faltando = cadastroIncompleto(cliente);

  const emAberto = obrigacoes
    .filter((o) => o.status !== "pago")
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  const atrasadas = emAberto.filter((o) => o.status === "atrasado");
  const totalAberto = emAberto.reduce((s, o) => s + o.valorCentavos, 0);

  const todasEtapas = processos.flatMap((p) => p.etapas);
  const concluidas = todasEtapas.filter((e) => e.status === "concluida").length;
  const travadas = todasEtapas.filter((e) => e.status === "bloqueada");

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <h1 className="font-display text-3xl leading-tight font-semibold text-texto sm:text-4xl">
          Olá, {primeiroNome(cliente.responsavel)}.
        </h1>
        <p className="mt-2 text-sm text-texto-suave">
          {cliente.nomeFantasia}
          {/* Regime é nulo para pessoa física e para cadastro incompleto.
              Renderizar o separador sozinho deixaria um ponto órfão na tela. */}
          {cliente.regime && (
            <>
              <span className="mx-2 opacity-40">•</span>
              {cliente.regime}
            </>
          )}
          {atrasadas.length > 0 && (
            <>
              <span className="mx-2 opacity-40">•</span>
              <span className="text-critico">
                {atrasadas.length} obrigação(ões) em atraso
              </span>
            </>
          )}
        </p>
      </header>

      {/* Indicadores */}
      <Escalonado className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <EscalonadoItem>
          <ResumoNumerico
            rotulo="Processos em andamento"
            valor={String(processos.length)}
            detalhe={
              processos.length === 1
                ? "1 frente de trabalho aberta"
                : `${processos.length} frentes de trabalho abertas`
            }
            icone={<ListChecks />}
            tom="acento"
            href="#processos"
          />
        </EscalonadoItem>
        <EscalonadoItem>
          <ResumoNumerico
            rotulo="Etapas concluídas"
            valor={`${concluidas}/${todasEtapas.length}`}
            detalhe={
              todasEtapas.length > 0
                ? `${Math.round((concluidas / todasEtapas.length) * 100)}% do caminho`
                : "Nenhuma etapa registrada"
            }
            icone={<FileCheck2 />}
            tom={concluidas === todasEtapas.length ? "ok" : "neutro"}
            href="#processos"
          />
        </EscalonadoItem>
        <EscalonadoItem>
          <ResumoNumerico
            rotulo="Etapas travadas"
            valor={String(travadas.length)}
            detalhe={
              travadas.length > 0
                ? "Dependem de algo antes de seguir"
                : "Nada bloqueado"
            }
            icone={<Lock />}
            tom={travadas.length > 0 ? "critico" : "ok"}
            href="#processos"
          />
        </EscalonadoItem>
        <EscalonadoItem>
          {emAberto.length > 0 ? (
            <ResumoNumerico
              rotulo="Total em aberto"
              valor={formatarBRL(totalAberto)}
              detalhe={`${emAberto.length} guia(s) pendente(s)`}
              icone={<CalendarClock />}
              tom={atrasadas.length > 0 ? "critico" : "acento"}
              href="#vencimentos"
            />
          ) : (
            <ResumoNumerico
              rotulo="Cadastro"
              valor={faltando.length === 0 ? "Completo" : String(faltando.length)}
              detalhe={
                faltando.length === 0
                  ? "Nada pendente"
                  : `Falta informar: ${faltando.join(", ")}`
              }
              icone={<AlertTriangle />}
              tom={faltando.length === 0 ? "ok" : "alerta"}
              // Só a seção "Cadastro" existe quando falta algo. Cadastro
              // completo não tem pra onde ir, então o card fica só informativo.
              href={faltando.length > 0 ? "#cadastro" : undefined}
            />
          )}
        </EscalonadoItem>
      </Escalonado>

      {/* Processos em andamento */}
      <section id="processos" className="scroll-mt-28">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-medium text-texto">
              O que está em andamento
            </h2>
            <p className="mt-1 text-sm text-texto-suave">
              Cada etapa concluída, em execução ou parada, com o motivo.
            </p>
          </div>
          {travadas.length > 0 && (
            <Etiqueta tom="critico">
              {travadas.length} etapa(s) travada(s)
            </Etiqueta>
          )}
        </div>

        {processos.length > 0 ? (
          <Escalonado className="grid gap-4 lg:grid-cols-2">
            {processos.map((processo) => (
              <EscalonadoItem key={processo.id}>
                <CartaoProcesso processo={processo} />
              </EscalonadoItem>
            ))}
          </Escalonado>
        ) : (
          <Cartao semInclinacao>
            <div className="p-8 text-center">
              <p className="font-display text-lg text-texto">
                Nenhum processo em andamento.
              </p>
              <p className="mt-1 text-sm text-texto-suave">
                A Plena abre um card aqui assim que um trabalho começar.
              </p>
            </div>
          </Cartao>
        )}
      </section>

      {/*
        Vencimentos só aparecem para quem tem contabilidade mensal. Hoje
        ninguém na carteira tem, então a seção não renderiza. Ela fica porque a
        primeira empresa que entrar em regime mensal já cai aqui pronta.
      */}
      {emAberto.length > 0 && (
        <section id="vencimentos" className="scroll-mt-28">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-medium text-texto">
                Próximos vencimentos
              </h2>
              <p className="mt-1 text-sm text-texto-suave">
                Contagem regressiva até a data limite de cada guia.
              </p>
            </div>
            {atrasadas.length > 0 && (
              <Etiqueta tom="critico">Atenção necessária</Etiqueta>
            )}
          </div>

          <Escalonado className="grid gap-4 lg:grid-cols-2">
            {emAberto.map((obrigacao) => (
              <EscalonadoItem key={obrigacao.id}>
                <CartaoVencimento obrigacao={obrigacao} />
              </EscalonadoItem>
            ))}
          </Escalonado>
        </section>
      )}

      {/* Cadastro */}
      {faltando.length > 0 && (
        <section id="cadastro" className="scroll-mt-28">
          <Cartao semInclinacao>
            <CartaoCabecalho
              titulo="Dados que ainda faltam"
              descricao="Sem eles a Plena não consegue emitir guia nem declarar por você."
              acao={<Etiqueta tom="alerta">{faltando.length} pendente(s)</Etiqueta>}
            />
            <CartaoCorpo>
              <ul className="flex flex-wrap gap-2">
                {faltando.map((campo) => (
                  <li key={campo}>
                    <Etiqueta tom="neutro">{campo}</Etiqueta>
                  </li>
                ))}
              </ul>
            </CartaoCorpo>
          </Cartao>
        </section>
      )}
    </div>
  );
}
