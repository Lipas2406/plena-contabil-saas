"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { Botao } from "@/kernel/ui/botao";
import { Modal } from "@/kernel/ui/modal";
import { Campo } from "@/kernel/ui/campo";
import { cn } from "@/kernel/cn";
import { criarCliente } from "@/dominio/acoes/clientes";
import type {
  NaturezaJuridica,
  PorteEmpresa,
  RegimeTributario,
  TipoPessoa,
} from "@/dominio/tipos";

const NATUREZAS: NaturezaJuridica[] = [
  "Empresário Individual",
  "SLU",
  "Ltda",
  "Sociedade Simples",
];
const PORTES: PorteEmpresa[] = ["MEI", "ME", "EPP", "Demais"];
const REGIMES: RegimeTributario[] = [
  "MEI",
  "Simples Nacional",
  "Lucro Presumido",
  "Lucro Real",
  "Não optante",
];

const FORM_VAZIO = {
  nomeFantasia: "",
  razaoSocial: "",
  tipoPessoa: "PJ" as TipoPessoa,
  cnpj: "",
  cpf: "",
  atividade: "",
  naturezaJuridica: "" as NaturezaJuridica | "",
  porte: "" as PorteEmpresa | "",
  regime: "" as RegimeTributario | "",
  responsavel: "",
  email: "",
  telefone: "",
};

/**
 * Botão + modal de cadastro de cliente novo.
 *
 * Fica no cliente (não no Server Component da página) porque precisa de
 * estado de formulário e do `useTransition` que acompanha a Server Action.
 * A ação em si mora em `@/dominio/acoes/clientes`, este arquivo só coleta
 * o que a contadora digitou.
 */
/**
 * `somenteLeitura` chega do servidor porque só ele sabe se o disco aceita
 * escrita. Na demonstração publicada não dá, e aí o certo é NÃO oferecer o
 * botão: botão que aceita o clique e perde o dado é a affordance falsa que
 * este painel já removeu quatro vezes.
 */
export function NovoCliente({ somenteLeitura = false }: { somenteLeitura?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function fechar() {
    if (pendente) return;
    setAberto(false);
    setErro(null);
    setForm(FORM_VAZIO);
  }

  function enviar() {
    if (!form.nomeFantasia.trim()) {
      setErro("Nome é obrigatório.");
      return;
    }
    setErro(null);

    iniciarTransicao(async () => {
      const resultado = await criarCliente({
        nomeFantasia: form.nomeFantasia,
        razaoSocial: form.razaoSocial || null,
        tipoPessoa: form.tipoPessoa,
        cnpj: form.tipoPessoa === "PJ" ? form.cnpj || null : null,
        cpf: form.tipoPessoa === "PF" ? form.cpf || null : null,
        atividade: form.atividade || null,
        naturezaJuridica:
          form.tipoPessoa === "PJ" ? form.naturezaJuridica || null : null,
        porte: form.tipoPessoa === "PJ" ? form.porte || null : null,
        regime: form.tipoPessoa === "PJ" ? form.regime || null : null,
        responsavel: form.responsavel || null,
        email: form.email || null,
        telefone: form.telefone || null,
      });

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não deu para salvar. Tenta de novo.");
        return;
      }
      fechar();
    });
  }

  if (somenteLeitura) {
    return (
      <p className="text-xs text-texto-suave">
        Cadastro desativado nesta demonstração publicada. Rodando local, ele
        salva de verdade.
      </p>
    );
  }

  return (
    <>
      <Botao
        variante="primario"
        tamanho="sm"
        onClick={() => setAberto(true)}
        iconeEsquerda={<UserPlus className="size-4" aria-hidden />}
      >
        Novo cliente
      </Botao>

      <Modal
        aberto={aberto}
        aoFechar={fechar}
        titulo="Novo cliente"
        descricao='O que faltar fica marcado como "a informar". Não precisa preencher tudo agora.'
        rodape={
          <>
            <Botao variante="fantasma" onClick={fechar} disabled={pendente}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              onClick={enviar}
              carregando={pendente}
              disabled={!form.nomeFantasia.trim()}
            >
              Salvar cliente
            </Botao>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
        >
          <Campo
            rotulo="Nome fantasia"
            value={form.nomeFantasia}
            onChange={(e) =>
              setForm((f) => ({ ...f, nomeFantasia: e.target.value }))
            }
            placeholder="Como você chama esse cliente"
            autoFocus
          />

          <Campo
            rotulo="Razão social"
            value={form.razaoSocial}
            onChange={(e) =>
              setForm((f) => ({ ...f, razaoSocial: e.target.value }))
            }
            dica="Em branco, repete o nome fantasia"
          />

          <fieldset className="flex gap-5">
            <legend className="mb-1.5 text-sm font-medium text-texto-suave">
              Tipo
            </legend>
            {(["PJ", "PF"] as const).map((tipo) => (
              <label
                key={tipo}
                className="flex items-center gap-2 text-sm text-texto"
              >
                <input
                  type="radio"
                  name="tipoPessoa"
                  checked={form.tipoPessoa === tipo}
                  onChange={() => setForm((f) => ({ ...f, tipoPessoa: tipo }))}
                  className="accent-acento"
                />
                {tipo === "PJ" ? "Pessoa jurídica" : "Pessoa física"}
              </label>
            ))}
          </fieldset>

          {form.tipoPessoa === "PJ" ? (
            <Campo
              rotulo="CNPJ"
              value={form.cnpj}
              onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
              placeholder="Só números, ou deixe em branco"
            />
          ) : (
            <Campo
              rotulo="CPF"
              value={form.cpf}
              onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
              placeholder="Só números, ou deixe em branco"
            />
          )}

          <Campo
            rotulo="Atividade"
            value={form.atividade}
            onChange={(e) =>
              setForm((f) => ({ ...f, atividade: e.target.value }))
            }
            placeholder="O que o cliente faz"
          />

          {form.tipoPessoa === "PJ" && (
            <div className="grid grid-cols-2 gap-4">
              <Selecao
                rotulo="Natureza jurídica"
                valor={form.naturezaJuridica}
                opcoes={NATUREZAS}
                aoMudar={(v) =>
                  setForm((f) => ({
                    ...f,
                    naturezaJuridica: v as NaturezaJuridica,
                  }))
                }
              />
              <Selecao
                rotulo="Porte"
                valor={form.porte}
                opcoes={PORTES}
                aoMudar={(v) =>
                  setForm((f) => ({ ...f, porte: v as PorteEmpresa }))
                }
              />
              <div className="col-span-2">
                <Selecao
                  rotulo="Regime tributário"
                  valor={form.regime}
                  opcoes={REGIMES}
                  aoMudar={(v) =>
                    setForm((f) => ({ ...f, regime: v as RegimeTributario }))
                  }
                />
              </div>
            </div>
          )}

          <Campo
            rotulo="Responsável"
            value={form.responsavel}
            onChange={(e) =>
              setForm((f) => ({ ...f, responsavel: e.target.value }))
            }
            placeholder="Quem você fala no dia a dia"
          />

          <div className="grid grid-cols-2 gap-4">
            <Campo
              rotulo="E-mail"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Campo
              rotulo="Telefone"
              value={form.telefone}
              onChange={(e) =>
                setForm((f) => ({ ...f, telefone: e.target.value }))
              }
              placeholder="Com DDD"
            />
          </div>

          {erro && (
            <p role="alert" className="text-sm text-critico">
              {erro}
            </p>
          )}
        </form>
      </Modal>
    </>
  );
}

function Selecao({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  opcoes: readonly string[];
  aoMudar: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-texto-suave">
        {rotulo}
      </label>
      <select
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className={cn(
          "h-11 w-full rounded-[var(--radius-card)] vidro px-4 text-sm text-texto",
          "outline-none focus:border-[var(--borda-acento)] focus:ring-2 focus:ring-acento/25",
        )}
      >
        <option value="">a informar</option>
        {opcoes.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
