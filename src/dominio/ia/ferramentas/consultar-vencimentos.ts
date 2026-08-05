import { z } from "zod";
import { definirFerramenta, naoEncontrado } from "@/kernel/ia/ferramenta";
import { formatarBRL } from "@/kernel/br";
import { diasAte, formatarData } from "@/kernel/datas";
import { buscarClientePorCNPJ } from "@/dominio/armazenamento-clientes";
import { listarObrigacoesDoCliente } from "@/dominio/mocks/obrigacoes";

const parametros = z.object({
  cnpj: z
    .string()
    .describe(
      "CNPJ da empresa, com ou sem máscara. Ex: 00.000.000/0001-00 ou 00000000000100",
    ),
  incluirPagos: z
    .boolean()
    .optional()
    .describe("Se true, inclui também as obrigações já quitadas. Padrão: false"),
});

export const consultarVencimentos = definirFerramenta({
  nome: "consultar_vencimentos",
  descricao:
    "Consulta os impostos e obrigações fiscais a vencer de uma empresa cliente da Plena Contábil, a partir do CNPJ. Use sempre que perguntarem o que está a vencer, o que está atrasado, quanto a empresa deve ou quando pagar.",
  parametros,
  executar: async ({ cnpj, incluirPagos = false }) => {
    const cliente = await buscarClientePorCNPJ(cnpj);
    if (!cliente) {
      return naoEncontrado(
        "Nenhum cliente com esse CNPJ na carteira da Plena. Confirme o número com o cliente.",
      );
    }

    const todas = listarObrigacoesDoCliente(cliente.id);
    const obrigacoes = incluirPagos
      ? todas
      : todas.filter((o) => o.status !== "pago");

    const emAberto = obrigacoes.filter((o) => o.status !== "pago");
    const atrasadas = emAberto.filter((o) => o.status === "atrasado");
    const somar = (lista: typeof emAberto) =>
      lista.reduce((s, o) => s + o.valorCentavos, 0);

    return {
      encontrado: true as const,
      cliente: {
        nomeFantasia: cliente.nomeFantasia,
        razaoSocial: cliente.razaoSocial,
        regime: cliente.regime,
      },
      resumo: {
        quantidadeEmAberto: emAberto.length,
        quantidadeAtrasada: atrasadas.length,
        totalEmAberto: formatarBRL(somar(emAberto)),
        totalAtrasado: formatarBRL(somar(atrasadas)),
      },
      // Ordenado por vencimento: o que aperta primeiro aparece primeiro.
      obrigacoes: obrigacoes
        .slice()
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
        .map((o) => {
          const dias = diasAte(o.vencimento);
          return {
            sigla: o.sigla,
            descricao: o.descricao,
            competencia: o.competencia,
            vencimento: formatarData(o.vencimento),
            valor: formatarBRL(o.valorCentavos),
            status: o.status,
            // Prazo vem pronto em texto: modelo errando conta de dias é
            // falha comum, e aqui o erro vira multa para o cliente.
            prazo:
              o.status === "pago"
                ? "quitado"
                : dias < 0
                  ? `vencido há ${Math.abs(dias)} dia(s)`
                  : dias === 0
                    ? "vence hoje"
                    : `vence em ${dias} dia(s)`,
          };
        }),
    };
  },
});
