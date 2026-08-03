import { ChevronRight, FileStack, Lock, ListChecks, Users } from "lucide-react";
import { Cartao } from "@/kernel/ui/cartao";
import { Escalonado, EscalonadoItem } from "@/kernel/ui/transicao";
import { Etiqueta } from "@/kernel/ui/tabela";
import { listarClientes } from "@/dominio/armazenamento-clientes";
import { documentosAguardando } from "@/dominio/mocks/documentos";
import {
  linhaDoTempo,
  montarCarteira,
  resumoDoEscritorio,
  tarefasDoEscritorio,
} from "@/dominio/escritorio";
import { FilaDocumentos } from "@/componentes/escritorio/fila-documentos";
import { Kanban } from "@/componentes/escritorio/kanban";
import { LinhaDoTempo } from "@/componentes/escritorio/linha-do-tempo";
import { ListaClientes } from "@/componentes/escritorio/lista-clientes";
import { NovoCliente } from "@/componentes/escritorio/novo-cliente";
import { carteiraSomenteLeitura } from "@/dominio/armazenamento-clientes";
import { NumeroAnimado } from "@/componentes/escritorio/numero-animado";

export const metadata = {
  title: "Escritório (Plena Contábil)",
};

// A carteira agora vem de arquivo (@/dominio/armazenamento-clientes), não de
// array estático: sem isto, `next build` congelaria a lista de clientes no
// estado de quando rodou o build, e cliente cadastrado depois não apareceria.
export const dynamic = "force-dynamic";

/**
 * Painel do escritório.
 *
 * Componente de servidor: toda a derivação (semáforo, kanban, linha do tempo,
 * fila) acontece aqui e desce pronta. Os componentes de cliente recebem dados
 * simples e cuidam só de interação, então nem o mock nem as funções de domínio
 * entram no bundle do navegador.
 *
 * Uma tela só, com âncora para cada seção. É a leitura da restrição de manter
 * o painel "flat": a contadora cruza cliente com tarefa o dia inteiro, e
 * espalhar isso em quatro rotas transformaria o trabalho dela em navegação.
 */
export default function PaginaEscritorio() {
  const resumo = resumoDoEscritorio();
  const carteira = montarCarteira();
  const tarefas = tarefasDoEscritorio();
  const prazos = linhaDoTempo();
  const documentos = documentosAguardando();

  const nomesPorCliente = Object.fromEntries(
    listarClientes().map((c) => [c.id, c.nomeFantasia]),
  );

  const criticos = carteira.filter((c) => c.sinal === "critico").length;
  const atencao = carteira.filter((c) => c.sinal === "atencao").length;

  return (
    <div className="mx-auto max-w-[1600px] space-y-12">
      <header id="visao-geral" className="scroll-mt-8">
        <h1 className="font-display text-3xl leading-tight font-semibold text-texto sm:text-4xl">
          Escritório
        </h1>
        <p className="mt-2 text-sm text-texto-suave">
          Tudo o que está aberto na carteira, em uma tela.
        </p>

        <Escalonado className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <EscalonadoItem>
            <Indicador
              rotulo="Clientes na carteira"
              valor={resumo.clientes}
              detalhe={
                criticos + atencao === 0
                  ? "Todos em dia"
                  : `${criticos} travado(s), ${atencao} com pendência`
              }
              icone={<Users />}
              tom="acento"
              href="#clientes"
            />
          </EscalonadoItem>
          <EscalonadoItem>
            <Indicador
              rotulo="Tarefas em aberto"
              valor={resumo.tarefasAbertas}
              detalhe="Etapas que ainda não fecharam"
              icone={<ListChecks />}
              tom="neutro"
              href="#tarefas"
            />
          </EscalonadoItem>
          <EscalonadoItem>
            <Indicador
              rotulo="Etapas travadas"
              valor={resumo.travadas}
              detalhe={
                resumo.travadas > 0
                  ? "Dependem de algo antes de seguir"
                  : "Nada bloqueado"
              }
              icone={<Lock />}
              tom={resumo.travadas > 0 ? "critico" : "ok"}
              href="#tarefas"
            />
          </EscalonadoItem>
          <EscalonadoItem>
            <Indicador
              rotulo="Documentos na fila"
              valor={resumo.documentosNaFila}
              detalhe="Aguardando sua conferência"
              icone={<FileStack />}
              tom={resumo.documentosNaFila > 0 ? "alerta" : "ok"}
              href="#documentos"
            />
          </EscalonadoItem>
        </Escalonado>
      </header>

      <Secao
        id="clientes"
        titulo="Clientes"
        descricao="Clique em qualquer um para abrir o detalhe."
        acao={
          <div className="flex items-center gap-3">
            {criticos > 0 && (
              <Etiqueta tom="critico">{criticos} travado(s)</Etiqueta>
            )}
            <NovoCliente somenteLeitura={carteiraSomenteLeitura()} />
          </div>
        }
      >
        <ListaClientes
          carteira={carteira}
          somenteLeitura={carteiraSomenteLeitura()}
        />
      </Secao>

      <Secao
        id="prazos"
        titulo="Prazos e envelhecimento"
        descricao="Ordenado do mais antigo para o mais recente. Barra cheia é processo parado há tempo demais."
      >
        <LinhaDoTempo itens={prazos} />
      </Secao>

      <Secao
        id="tarefas"
        titulo="Tarefas"
        descricao="Cada cartão é uma etapa de processo. Arraste, ou use as setas do cartão."
      >
        <Kanban tarefas={tarefas} />
      </Secao>

      <Secao
        id="documentos"
        titulo="Documentos aguardando conferência"
        descricao="Ordenado do mais duvidoso para o mais tranquilo."
        acao={
          <Etiqueta tom="neutro">{documentos.length} na fila</Etiqueta>
        }
      >
        <FilaDocumentos
          documentos={documentos}
          nomesPorCliente={nomesPorCliente}
        />
      </Secao>
    </div>
  );
}

function Secao({
  id,
  titulo,
  descricao,
  acao,
  children,
}: {
  id: string;
  titulo: string;
  descricao: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-medium text-texto">
            {titulo}
          </h2>
          <p className="mt-1 text-sm text-texto-suave">{descricao}</p>
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

/**
 * Indicador do topo.
 *
 * Não reusa o `ResumoNumerico` do painel do cliente porque aqui o valor é
 * número e anima, e lá é texto já formatado (moeda, porcentagem). Forçar os
 * dois no mesmo componente exigiria uma prop dizendo "anime este, aquele não",
 * que é a costura que faz componente compartilhado virar bagunça.
 *
 * `href` vira link para a âncora da seção correspondente. A seta some só se
 * NÃO houver link, nunca some por causa de hover: em tela de toque não existe
 * hover, e é exatamente lá que o sinal "isto leva a algum lugar" mais falta.
 */
function Indicador({
  rotulo,
  valor,
  detalhe,
  icone,
  tom,
  href,
}: {
  rotulo: string;
  valor: number;
  detalhe: string;
  icone: React.ReactNode;
  tom: "ok" | "alerta" | "critico" | "acento" | "neutro";
  href?: string;
}) {
  const TONS = {
    ok: "text-ok bg-ok/10",
    alerta: "text-alerta bg-alerta/10",
    critico: "text-critico bg-critico/10",
    acento: "text-acento bg-acento/10",
    neutro: "text-texto-suave bg-white/5",
  } as const;

  const conteudo = (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wider text-texto-suave uppercase">
          {rotulo}
        </p>
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-xl [&_svg]:size-[18px] ${TONS[tom]}`}
          aria-hidden
        >
          {icone}
        </span>
      </div>

      <p className="mt-4 font-display text-3xl leading-none font-semibold text-texto">
        <NumeroAnimado valor={valor} />
      </p>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-texto-suave">{detalhe}</p>
        {href && (
          <ChevronRight
            className="ml-auto size-4 shrink-0 text-texto-suave/60"
            aria-hidden
          />
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        title={`Ver ${rotulo.toLowerCase()}`}
        aria-label={`${rotulo}: ${valor}, ${detalhe}. Ir para essa seção.`}
        className="block h-full"
      >
        <Cartao className="h-full" grausMaximos={4}>
          {conteudo}
        </Cartao>
      </a>
    );
  }

  return (
    <Cartao className="h-full" grausMaximos={4}>
      {conteudo}
    </Cartao>
  );
}
