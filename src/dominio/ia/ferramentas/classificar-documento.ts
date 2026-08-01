import { z } from "zod";
import { definirFerramenta } from "@/kernel/ia/ferramenta";
import { extrairValorBRL, normalizarTexto } from "@/kernel/br";
import { CONFIANCA_MINIMA, type CategoriaDocumento } from "@/dominio/tipos";

/**
 * Classificação de documento por palavra-chave pontuada.
 *
 * Implementação determinística de propósito, por duas razões:
 * 1) dá para testar e demonstrar sem gastar token;
 * 2) deixa explícito onde entra o classificador real depois (OCR + modelo),
 *    sem que nada em volta mude, porque o contrato já é o definitivo.
 *
 * `confianca` não é enfeite: abaixo de CONFIANCA_MINIMA a UI tem que exigir
 * confirmação humana. Categorizar despesa errado é problema fiscal da
 * contadora, não um rótulo errado na tela.
 */

const REGRAS: { categoria: CategoriaDocumento; termos: string[] }[] = [
  {
    categoria: "Despesa de viagem",
    termos: ["hotel", "hospedagem", "passagem", "aereo", "uber", "taxi", "pedagio", "combustivel", "posto", "diaria", "restaurante", "refeicao"],
  },
  {
    categoria: "Material de escritório",
    termos: ["papelaria", "resma", "papel a4", "caneta", "toner", "cartucho", "impressora", "grampeador", "material de escritorio", "suprimento"],
  },
  {
    categoria: "Serviço de terceiros",
    termos: ["nfs-e", "nfse", "nota fiscal de servico", "prestacao de servico", "consultoria", "assessoria", "manutencao", "freelancer", "terceirizado"],
  },
  {
    categoria: "Folha de pagamento",
    termos: ["holerite", "contracheque", "salario", "folha de pagamento", "rescisao", "ferias", "decimo terceiro", "vale transporte", "vale refeicao"],
  },
  {
    categoria: "Imposto e taxa",
    termos: ["das", "darf", "gps", "fgts", "inss", "irpj", "csll", "iss", "icms", "pis", "cofins", "guia de recolhimento", "tributo", "imposto"],
  },
  {
    categoria: "Receita de venda",
    termos: ["venda", "faturamento", "recebimento de cliente", "nf-e de saida", "cupom fiscal", "pedido de venda", "receita"],
  },
];

// Os termos são gravados sem acento porque a comparação é feita sobre texto
// normalizado. Guardar "diária" e "diaria" na mesma lista contava o termo
// duas vezes e inflava a pontuação.
const REGRAS_NORMALIZADAS = REGRAS.map(({ categoria, termos }) => ({
  categoria,
  termos: [...new Set(termos.map(normalizarTexto))],
}));

const parametros = z.object({
  texto: z
    .string()
    .min(3, "Texto muito curto para classificar.")
    .describe(
      "Conteúdo textual do recibo, nota fiscal ou comprovante a ser categorizado.",
    ),
});

export const classificarDocumento = definirFerramenta({
  nome: "classificar_documento",
  descricao:
    "Lê o texto de um recibo, nota fiscal ou comprovante e devolve a categoria contábil, o valor identificado e o grau de confiança. Use quando o cliente enviar ou descrever um documento e quiser saber como ele será lançado.",
  parametros,
  executar: ({ texto }) => {
    const alvo = normalizarTexto(texto);
    const valorCentavos = extrairValorBRL(texto);

    const pontuadas = REGRAS_NORMALIZADAS.map(({ categoria, termos }) => {
      const encontrados = termos.filter((t) => alvo.includes(t));
      return { categoria, encontrados, pontos: encontrados.length };
    })
      .filter((r) => r.pontos > 0)
      .sort((a, b) => b.pontos - a.pontos);

    if (pontuadas.length === 0) {
      return {
        categoria: "Não identificado" as CategoriaDocumento,
        confianca: 0,
        valorCentavos,
        justificativa:
          "Nenhum termo conhecido foi reconhecido no texto. Encaminhar para conferência manual.",
        requerRevisaoHumana: true,
      };
    }

    const [melhor, segundo] = pontuadas;

    // A confiança cai quando duas categorias empatam. Documento ambíguo
    // (uma nota de manutenção paga durante uma viagem) não pode sair com
    // 0.9 só porque bateu duas palavras.
    const margem = melhor.pontos - (segundo?.pontos ?? 0);
    const confianca = Number(
      Math.min(0.95, 0.45 + melhor.pontos * 0.15 + margem * 0.12).toFixed(2),
    );

    return {
      categoria: melhor.categoria,
      confianca,
      valorCentavos,
      justificativa: `Termos reconhecidos: ${melhor.encontrados.join(", ")}.`,
      requerRevisaoHumana: confianca < CONFIANCA_MINIMA,
      ...(segundo && { alternativa: segundo.categoria }),
    };
  },
});
