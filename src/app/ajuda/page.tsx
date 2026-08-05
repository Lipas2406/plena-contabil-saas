import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { carteiraSomenteLeitura } from "@/dominio/armazenamento-clientes";

export const metadata = {
  title: "Como usar — Plena Contábil",
  description: "Guia rápido do sistema, do cadastro ao encerramento do serviço.",
};

/**
 * Renderiza por requisição, e isso NÃO é detalhe de performance.
 *
 * O guia pergunta ao ambiente se o disco aceita gravação para decidir o que
 * promete. Prerenderizado, essa pergunta seria respondida na máquina de BUILD,
 * onde o disco é gravável, e a página publicada nasceria afirmando "fica salvo
 * de verdade" justamente onde nada fica salvo. Foi o que aconteceu na primeira
 * tentativa: o build passou limpo e congelou a frase errada no HTML.
 */
export const dynamic = "force-dynamic";

/**
 * Guia de uso, escrito para a contadora.
 *
 * Mora DENTRO do sistema, e não num PDF ou link externo, por três motivos:
 * ela já está aqui quando a dúvida aparece, o guia sobe junto com o app (então
 * não desatualiza sozinho) e nenhum dado precisa sair para um serviço de fora.
 *
 * Pensado para o CELULAR primeiro, que é de onde ela vai consultar: uma coluna
 * só, seções fechadas por padrão para a tela não virar um paredão de texto, e
 * `<details>` nativo em vez de acordeão em JavaScript, que funciona sem
 * hidratação, responde ao toque e o leitor de tela entende.
 *
 * O de-para com os nomes reais dos clientes NÃO entra aqui, e isso é
 * deliberado: o repositório é público e a anonimização de 01/08 existe para
 * esses nomes viverem só no vault do Filipe. A correspondência ele passa a ela
 * por fora.
 */

function Secao({
  titulo,
  resumo,
  children,
  aberta = false,
}: {
  titulo: string;
  resumo: string;
  children: React.ReactNode;
  aberta?: boolean;
}) {
  return (
    <details
      open={aberta}
      className="group rounded-[var(--radius-card)] border border-[var(--borda-suave)] bg-white/[0.02]"
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base leading-snug font-semibold text-texto">
            {titulo}
          </h2>
          <p className="mt-0.5 text-xs text-texto-suave">{resumo}</p>
        </div>
        <ChevronDown
          className="mt-1 size-4 shrink-0 text-texto-suave transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="space-y-3 px-4 pb-4 text-sm leading-relaxed text-texto-suave">
        {children}
      </div>
    </details>
  );
}

function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-acento/15 text-xs font-semibold text-acento">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

const N = ({ children }: { children: React.ReactNode }) => (
  <strong className="font-medium text-texto">{children}</strong>
);

export default async function Pagina() {
  // O guia PRECISA falar do ambiente em que ele está sendo lido. Na versão
  // publicada o disco é somente leitura, então cadastrar, completar cadastro e
  // encerrar processo aparecem desativados: prometer que "fica salvo" ali seria
  // ensinar a contadora a confiar num botão que a própria tela recusa, o mesmo
  // erro que a checagem de dado inventado existe para evitar. Derivado do estado
  // real, nunca escrito à mão, senão volta a mentir quando o ambiente mudar.
  const somenteLeitura = await carteiraSomenteLeitura();
  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/escritorio"
        className="inline-flex items-center gap-2 text-sm text-texto-suave transition-colors hover:text-texto"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Voltar ao escritório
      </Link>

      <h1 className="mt-5 font-display text-2xl leading-tight font-semibold text-texto sm:text-3xl">
        Como usar
      </h1>
      <p className="mt-2 text-sm text-texto-suave">
        Toque numa seção para abrir. O que ainda não existe está no fim, listado
        com todas as letras.
      </p>

      {/* Vem ANTES do passo a passo, não depois: quem lê o guia de cima para
          baixo tem que saber que os botões de gravar estão desativados antes de
          tentar seguir os passos, não ao chegar no fim. */}
      {somenteLeitura ? (
        <p className="mt-4 rounded-lg border border-[var(--borda-suave)] bg-white/[0.03] p-3 text-sm text-texto-suave">
          <N>Antes de começar:</N> este é o endereço de demonstração, e ele{" "}
          <N>não grava nada</N>. Dá para abrir tudo, clicar em tudo e conferir
          se a sua carteira está certa, mas os botões que salvam aparecem
          desativados. Nada do que você digitar aqui vai ficar.
        </p>
      ) : null}

      <div className="mt-6 space-y-3">
        <Secao
          titulo="As duas telas"
          resumo="Qual é a sua e qual o cliente vê"
          aberta
        >
          <p>
            <N>Escritório</N> é a sua: a carteira inteira, prazos, tarefas e
            documentos.
          </p>
          <p>
            <N>Painel</N> é a do cliente: só o que é dele, o andamento e o que
            falta.
          </p>
          <p>
            O botão <N>Ver como cliente</N>, no fim do menu, troca entre as
            duas. Use antes de mandar o acesso, para conferir o que ele enxerga.
          </p>
          <p className="text-xs">
            No celular o menu fica no botão de três traços, no canto superior
            esquerdo.
          </p>
        </Secao>

        <Secao
          titulo="Por onde começar o dia"
          resumo="Os quatro números do topo, na ordem certa"
        >
          <ol className="space-y-2">
            <Passo n={1}>
              <N>Etapas travadas</N> é o mais importante: trabalho parado
              esperando alguma coisa. Se for maior que zero, o dia começa aí.
            </Passo>
            <Passo n={2}>
              <N>Tarefas em aberto</N>: tudo que ainda não fechou na carteira.
            </Passo>
            <Passo n={3}>
              <N>Clientes na carteira</N>: quantos travados e quantos com
              pendência de cadastro.
            </Passo>
            <Passo n={4}>
              <N>Documentos na fila</N>: classificados pela máquina, esperando
              sua conferência.
            </Passo>
          </ol>
          <p>Tocar em qualquer um leva para a lista correspondente.</p>
        </Secao>

        <Secao
          titulo="A bolinha colorida do cliente"
          resumo="Vermelho, amarelo e verde, e o motivo escrito ao lado"
        >
          <ul className="space-y-1.5">
            <li>
              <N>Vermelho:</N> tem etapa travada, esperando algo para seguir.
            </li>
            <li>
              <N>Amarelo:</N> tem pendência, normalmente cadastro incompleto.
            </li>
            <li>
              <N>Verde:</N> em dia.
            </li>
          </ul>
          <p>
            Do lado, em texto, está <N>o motivo</N>. Não precisa abrir para
            saber por que está vermelho.
          </p>
          <p>
            Tocar no cliente abre o detalhe, e é de lá que você faz quase tudo.
          </p>
        </Secao>

        <Secao
          titulo="Cadastrar cliente novo"
          resumo="Só o nome é obrigatório"
        >
          <p>
            Botão <N>Novo cliente</N>, no topo da lista.
          </p>
          <p>
            <N>Só o nome é obrigatório.</N> Todo o resto pode ficar em branco.
            É de propósito: cadastre na hora em que o cliente chega, com o que
            ele passou, e complete depois. O que faltar aparece como{" "}
            <N>&quot;a informar&quot;</N>.
          </p>
          <p>
            <N>Pessoa jurídica ou física não muda depois.</N> É a única escolha
            que trava, porque trocar mudaria quais campos existem. Se errar,
            cadastre de novo.
          </p>
          <p className="text-xs">CNPJ e CPF: só números, ou em branco.</p>
        </Secao>

        <Secao
          titulo="Completar cadastro"
          resumo="O que você mais vai usar no dia a dia"
        >
          <ol className="space-y-2">
            <Passo n={1}>Toque no cliente.</Passo>
            <Passo n={2}>
              Toque em <N>Completar cadastro</N>.
            </Passo>
            <Passo n={3}>Preencha só o que o cliente informou.</Passo>
            <Passo n={4}>
              <N>Salvar alterações</N>.
            </Passo>
          </ol>
          <p>
            <N>Campo em branco continua como lacuna, e nada some sem você
            apagar.</N> Pode preencher um campo hoje e outro semana que vem.
          </p>
          <p>
            Logo abaixo fica <N>Falta no cadastro</N>, com o que ainda falta.
            Conforme você preenche, os itens somem dali sozinhos, e quando a
            lista esvazia o cliente sai do amarelo.
          </p>
          <p className="text-xs">
            Sem CNPJ, e-mail e telefone não dá para emitir guia nem declarar.
            Por isso a tela insiste.
          </p>
        </Secao>

        <Secao
          titulo="Concluir um serviço"
          resumo="Quando a abertura, a regularização ou a declaração termina"
        >
          <ol className="space-y-2">
            <Passo n={1}>Toque no cliente.</Passo>
            <Passo n={2}>
              No bloco <N>Processos</N>, toque em{" "}
              <N>Concluir este processo</N>.
            </Passo>
            <Passo n={3}>
              Ele avisa quantas etapas vai marcar. Toque em <N>Confirmar</N>.
            </Passo>
          </ol>
          <p>O processo vai para 100%, ganha a data e sai do quadro de tarefas.</p>
          <p>
            <N>Não some e dá para desfazer.</N> Ele continua no detalhe do
            cliente com a data, e do lado tem <N>reabrir</N>, que devolve tudo.
          </p>
        </Secao>

        <Secao
          titulo='O aviso "Andamento a confirmar"'
          resumo="Por que ele aparece e como fazer sumir"
        >
          <p>
            O andamento das etapas foi <N>estimado, não apurado</N>. Você passou
            o escopo de cada trabalho, não em que ponto cada um parou, e o
            sistema chutou para a tela não nascer vazia.
          </p>
          <p>
            Ao olhar cada processo, diga o que já terminou. Conforme o ponto
            real entra, o aviso some sozinho. Concluir o processo também faz
            sumir, porque aí deixou de ser chute.
          </p>
        </Secao>

        <Secao
          titulo="Os nomes na tela estão trocados"
          resumo="Proteção dos seus clientes enquanto é demonstração"
        >
          <p>
            Os clientes aparecem com nomes <N>parecidos com os verdadeiros, mas
            trocados</N>, e o CNPJ que aparece é inválido de propósito. Assim o
            dado dos seus clientes não fica exposto enquanto o sistema está em
            demonstração: você reconhece de quem se trata, um terceiro não.
          </p>
          <p>
            <N>A correspondência dos nomes está com o Filipe</N>, fora do
            sistema. Quando virar uso real, entram os nomes verdadeiros.
          </p>
        </Secao>

        <Secao
          titulo="O que ainda NÃO existe"
          resumo="Para você não procurar botão que não tem"
        >
          <ul className="space-y-2">
            <li>
              <N>Login:</N> o sistema abre direto, sem senha.
            </li>
            <li>
              <N>Mensagens:</N> continua no WhatsApp.
            </li>
            <li>
              <N>Envio de documento pelo cliente:</N> continua por e-mail ou
              WhatsApp.
            </li>
            <li>
              <N>Excluir cliente:</N> dá para editar, excluir não.
            </li>
            <li>
              <N>Mover cartão no quadro de tarefas:</N> move na tela, mas{" "}
              <N>volta ao recarregar a página</N>.
            </li>
            <li>
              <N>Aprovar documento na fila:</N> mesma coisa, ainda não fica
              salvo.
            </li>
          </ul>
          <p>
            As telas marcadas com <N>&quot;em breve&quot;</N> no menu não estão
            quebradas: cada uma explica o que vai ter ali e como resolver o
            assunto hoje.
          </p>
          {somenteLeitura ? (
            <p className="rounded-lg border border-[var(--borda-suave)] bg-white/[0.02] p-3 text-xs">
              <N>Nesta versão publicada, nada que você digitar fica salvo.</N>{" "}
              Cadastrar cliente, completar cadastro e encerrar processo aparecem
              como <N>desativados</N>, e é de propósito: o endereço da
              demonstração roda num servidor que não aceita gravação. Você pode
              navegar por tudo à vontade, sem medo de estragar nada, mas para
                registrar informação de verdade me avise, que eu subo a versão
              que grava.
            </p>
          ) : (
            <p className="rounded-lg border border-[var(--borda-suave)] bg-white/[0.02] p-3 text-xs">
              <N>Fica salvo de verdade:</N> cadastrar cliente, completar
              cadastro e concluir processo. Esses três sobrevivem a fechar o
              navegador.
            </p>
          )}
        </Secao>

        <Secao titulo="Se algo parecer errado" resumo="É erro nosso, não seu">
          <p>
            O sistema foi feito para <N>nunca inventar dado</N> sobre os seus
            clientes: onde não sabe, escreve &quot;a informar&quot; em vez de
            chutar um número.
          </p>
          <p>
            Se vir qualquer coisa que não bate com a realidade da sua carteira,
            avise. É exatamente o tipo de coisa que a demonstração serve para
            pegar.
          </p>
        </Secao>
      </div>

      <p className="mt-8 text-center text-xs text-texto-suave/70">
        Guia de 03/08/2026. Acompanha a versão do sistema.
      </p>
    </main>
  );
}
