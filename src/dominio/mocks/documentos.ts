import { dataRelativa } from "@/kernel/mock";
import { CONFIANCA_MINIMA } from "@/dominio/tipos";
import type { Documento } from "@/dominio/tipos";

/**
 * Fila de documentos aguardando conferência da contadora.
 *
 * ESTES DOCUMENTOS SÃO INVENTADOS, e é o único mock do projeto que é. Motivo:
 * ao contrário de nome de cliente e de débito fiscal, aqui o dado não aponta
 * para ninguém. Os clientes já estão anonimizados, os valores são pequenos e
 * ilustrativos, e o que a fila precisa demonstrar é a REGRA, não o conteúdo.
 *
 * A regra que ela demonstra: `confianca` abaixo de `CONFIANCA_MINIMA` (0.6)
 * não pode ser aceita sozinha. A classificação automática é sugestão, e quem
 * assina é a contadora. Por isso a fila mistura de propósito casos fáceis
 * (nota fiscal limpa), casos ambíguos e um ilegível, que é o que acontece
 * quando o cliente fotografa o papel torto no WhatsApp.
 */
type DocumentoSeed = Omit<Documento, "emitidoEm"> & {
  offsetMeses: number;
  dia: number;
};

const SEEDS: DocumentoSeed[] = [
  {
    id: "doc-001",
    clienteId: "cli-001",
    nomeArquivo: "darf-parcelamento-pgfn.pdf",
    categoria: "Imposto e taxa",
    valorCentavos: 41_270,
    confianca: 0.94,
    offsetMeses: 0,
    dia: 4,
  },
  {
    id: "doc-002",
    clienteId: "cli-002",
    nomeArquivo: "contrato-social-assinado.pdf",
    categoria: "Não identificado",
    valorCentavos: null,
    // Baixa de propósito: contrato social não é lançamento, e o classificador
    // não tem categoria para ele. O caminho certo é a fila humana, não forçar
    // um enquadramento qualquer.
    confianca: 0.21,
    offsetMeses: 0,
    dia: 6,
  },
  {
    id: "doc-003",
    clienteId: "cli-003",
    nomeArquivo: "taxa-viabilidade-prefeitura.jpg",
    categoria: "Imposto e taxa",
    valorCentavos: 8_940,
    confianca: 0.71,
    offsetMeses: 0,
    dia: 9,
  },
  {
    id: "doc-004",
    clienteId: "cli-004",
    nomeArquivo: "print-portal-nfse.png",
    categoria: "Não identificado",
    valorCentavos: null,
    confianca: 0.18,
    offsetMeses: 0,
    dia: 11,
  },
  {
    id: "doc-005",
    clienteId: "cli-005",
    nomeArquivo: "boleto-escritorio-virtual.pdf",
    categoria: "Serviço de terceiros",
    valorCentavos: 29_000,
    confianca: 0.88,
    offsetMeses: 0,
    dia: 12,
  },
  {
    id: "doc-006",
    clienteId: "cli-006",
    nomeArquivo: "informe-rendimentos-banco.pdf",
    categoria: "Receita de venda",
    // Classificou como receita de venda, e provavelmente está errado: informe
    // de rendimentos não é venda. Confiança na faixa cinzenta, exatamente o
    // caso em que a revisão humana existe para pegar.
    valorCentavos: 1_284_500,
    confianca: 0.58,
    offsetMeses: -1,
    dia: 27,
  },
  {
    id: "doc-007",
    clienteId: "cli-001",
    nomeArquivo: "recibo-honorarios.jpg",
    categoria: "Serviço de terceiros",
    valorCentavos: 45_000,
    confianca: 0.66,
    offsetMeses: -1,
    dia: 19,
  },
];

export function listarDocumentos(hoje = new Date()): Documento[] {
  return SEEDS.map(({ offsetMeses, dia, ...base }): Documento => ({
    ...base,
    emitidoEm: dataRelativa(offsetMeses, dia, hoje),
  }));
}

/** Fila de conferência, do mais duvidoso para o mais tranquilo. */
export function documentosAguardando(hoje = new Date()): Documento[] {
  return listarDocumentos(hoje)
    .slice()
    .sort((a, b) => a.confianca - b.confianca);
}

/** True quando a classificação automática NÃO pode ser aceita sozinha. */
export function exigeRevisaoHumana(documento: Documento) {
  return documento.confianca < CONFIANCA_MINIMA;
}
