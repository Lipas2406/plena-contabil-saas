"use client";

import { useState, useTransition } from "react";
import { Archive, RotateCcw } from "lucide-react";
import { Botao } from "@/kernel/ui/botao";
import { Modal } from "@/kernel/ui/modal";
import { arquivarCliente } from "@/dominio/acoes/clientes";
import type { Cliente } from "@/dominio/tipos";

/**
 * Arquivar cliente, com confirmação.
 *
 * Duas decisões de desenho que valem explicação, porque as duas foram
 * pedidas em 05/08/2026 ("não queremos que um cadastro inteiro seja excluído
 * sem querer"):
 *
 * 1. **Arquiva, não exclui.** Não existe botão de excluir no sistema. Ver a
 *    justificativa em `acoes/clientes.ts`: prazo legal de guarda de documento
 *    e chave estrangeira RESTRICT.
 * 2. **A confirmação não é um `confirm()` do navegador.** Diálogo nativo trava
 *    a página inteira e some sem deixar rastro do que ia acontecer. Aqui a
 *    tela diz o que arquivar faz, o que NÃO faz, e que dá para desfazer — que
 *    é a informação que impede o susto.
 *
 * O botão de confirmar é `perigo` e fica à direita; "Cancelar" vem antes na
 * ordem do teclado, então quem abrir sem querer e apertar Enter cancela.
 */
export function ArquivarCliente({
  cliente,
  somenteLeitura = false,
  aoMudar,
}: {
  cliente: Cliente;
  somenteLeitura?: boolean;
  aoMudar?: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const arquivado = cliente.status === "inativo";

  function confirmar() {
    setErro(null);
    iniciar(async () => {
      const resultado = await arquivarCliente(cliente.id, !arquivado);
      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não deu para salvar. Tenta de novo.");
        return;
      }
      setAberto(false);
      aoMudar?.();
    });
  }

  if (somenteLeitura) return null;

  // Reativar é inofensivo: devolve o cliente à carteira e nada se perde.
  // Por isso vai direto, sem passar pelo modal de confirmação.
  if (arquivado) {
    return (
      <Botao
        variante="fantasma"
        tamanho="sm"
        carregando={pendente}
        onClick={confirmar}
        iconeEsquerda={<RotateCcw className="size-4" aria-hidden />}
      >
        Reativar cliente
      </Botao>
    );
  }

  return (
    <>
      <Botao
        variante="fantasma"
        tamanho="sm"
        onClick={() => {
          setErro(null);
          setAberto(true);
        }}
        iconeEsquerda={<Archive className="size-4" aria-hidden />}
        className="text-texto-suave hover:text-critico"
      >
        Arquivar
      </Botao>

      <Modal
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo={`Arquivar ${cliente.nomeFantasia}?`}
        descricao="O cliente sai da sua carteira do dia a dia. Nada é apagado."
        rodape={
          <>
            <Botao
              variante="fantasma"
              onClick={() => setAberto(false)}
              disabled={pendente}
            >
              Cancelar
            </Botao>
            <Botao variante="perigo" onClick={confirmar} carregando={pendente}>
              Arquivar cliente
            </Botao>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-texto">O que acontece</p>
            <ul className="mt-2 space-y-1.5 text-texto-suave">
              <li>Sai da lista de clientes e das contagens do painel.</li>
              <li>Você para de receber os avisos de vencimento dele.</li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-texto">O que continua</p>
            <ul className="mt-2 space-y-1.5 text-texto-suave">
              <li>Todo o cadastro, do jeito que está.</li>
              <li>Os documentos e o histórico de tudo que foi entregue.</li>
              <li>
                Dá para reativar quando quiser, e ele volta como estava. Nenhum
                dado é apagado.
              </li>
            </ul>
          </div>

          {erro && (
            <p
              role="alert"
              className="rounded-[var(--radius-card)] border border-critico/30 bg-critico/10 px-3 py-2 text-critico"
            >
              {erro}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
