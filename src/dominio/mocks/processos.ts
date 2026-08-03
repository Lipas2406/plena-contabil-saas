import { dataRelativa } from "@/kernel/mock";
import type { Processo } from "@/dominio/tipos";

/**
 * Processos em curso na carteira da Plena.
 *
 * As ETAPAS vieram da própria contadora: cada uma corresponde a algo que ela
 * listou na coluna "o que você cuida". Nada foi inventado aqui.
 *
 * O STATUS de cada etapa é a única coisa que é chute, porque ela informou o
 * escopo do trabalho e não o ponto em que cada um parou. Estão marcados como
 * placeholder de propósito, para ela corrigir na demonstração. É melhor ela
 * apontar "essa já terminou" do que abrir uma tela vazia.
 *
 * Datas seguem o padrão de seed do kernel: deslocamento em meses, nunca data
 * fixa, senão o mock envelhece. Ver `src/kernel/mock.ts`.
 */

type ProcessoSeed = Omit<Processo, "abertoEm" | "prazo" | "encerradoEm"> & {
  /** Deslocamento em meses a partir do mês corrente. */
  abertoOffsetMeses: number;
  abertoDia: number;
  prazoOffsetMeses: number | null;
  prazoDia: number;
};

const SEEDS: ProcessoSeed[] = [
  {
    id: "prc-001",
    clienteId: "cli-001",
    tipo: "regularizacao",
    titulo: "Regularização fiscal e negociação de passivo",
    abertoOffsetMeses: -4,
    abertoDia: 12,
    prazoOffsetMeses: null,
    prazoDia: 1,
    etapas: [
      {
        id: "et-001",
        rotulo: "Levantamento de pendências na Receita e na PGFN",
        status: "concluida",
      },
      {
        id: "et-002",
        rotulo: "Regularização de pendências cadastrais",
        status: "em-andamento",
      },
      {
        id: "et-003",
        rotulo: "Entrega das declarações em atraso",
        status: "em-andamento",
      },
      {
        id: "et-004",
        rotulo: "Negociação de parcelamento com a PGFN",
        status: "bloqueada",
        observacao:
          "Depende das declarações em atraso: sem elas o débito não fecha.",
      },
      {
        id: "et-005",
        rotulo: "Baixa dos débitos inscritos em Dívida Ativa",
        status: "nao-iniciada",
      },
      {
        id: "et-006",
        rotulo: "Reenquadramento em regime tributário",
        status: "nao-iniciada",
        observacao: "Hoje a empresa está como não optante.",
      },
    ],
  },
  {
    id: "prc-002",
    clienteId: "cli-002",
    tipo: "abertura",
    titulo: "Abertura da empresa",
    abertoOffsetMeses: -2,
    abertoDia: 5,
    prazoOffsetMeses: null,
    prazoDia: 1,
    etapas: [
      { id: "et-011", rotulo: "Consulta de viabilidade", status: "concluida" },
      { id: "et-012", rotulo: "Registro no REDESIM", status: "em-andamento" },
      { id: "et-013", rotulo: "Registro na JUCESP", status: "nao-iniciada" },
      {
        id: "et-014",
        rotulo: "Emissão do CNPJ",
        status: "nao-iniciada",
        observacao: "Sai ao fim do REDESIM.",
      },
      { id: "et-015", rotulo: "Inscrição municipal", status: "nao-iniciada" },
      { id: "et-016", rotulo: "Liberação da NFS-e", status: "nao-iniciada" },
      {
        id: "et-017",
        rotulo: "Opção pelo Simples Nacional e orientação tributária",
        status: "nao-iniciada",
      },
    ],
  },
  {
    id: "prc-003",
    clienteId: "cli-003",
    tipo: "abertura",
    titulo: "Abertura da empresa",
    abertoOffsetMeses: -1,
    abertoDia: 18,
    prazoOffsetMeses: null,
    prazoDia: 1,
    etapas: [
      { id: "et-021", rotulo: "Consulta de viabilidade", status: "concluida" },
      {
        id: "et-022",
        rotulo: "Enquadramento da atividade (CNAE 86.50-0/03)",
        status: "concluida",
      },
      { id: "et-023", rotulo: "Registro no REDESIM", status: "em-andamento" },
      { id: "et-024", rotulo: "Registro na JUCESP", status: "nao-iniciada" },
      { id: "et-025", rotulo: "Emissão do CNPJ", status: "nao-iniciada" },
      {
        id: "et-026",
        rotulo: "Opção pelo Simples Nacional",
        status: "nao-iniciada",
      },
    ],
  },
  {
    id: "prc-004",
    clienteId: "cli-004",
    tipo: "suporte",
    titulo: "Acesso à NFS-e",
    abertoOffsetMeses: 0,
    abertoDia: 3,
    prazoOffsetMeses: null,
    prazoDia: 1,
    etapas: [
      {
        id: "et-031",
        rotulo: "Recuperação de senha do portal",
        status: "em-andamento",
      },
      {
        id: "et-032",
        rotulo: "Alteração do e-mail cadastrado",
        status: "nao-iniciada",
      },
      {
        id: "et-033",
        rotulo: "Confirmação do acesso à emissão de NFS-e",
        status: "nao-iniciada",
      },
    ],
  },
  {
    id: "prc-005",
    clienteId: "cli-005",
    tipo: "suporte",
    titulo: "Acompanhamento e escritório virtual",
    abertoOffsetMeses: -3,
    abertoDia: 9,
    prazoOffsetMeses: null,
    prazoDia: 1,
    etapas: [
      {
        id: "et-041",
        rotulo: "Acompanhamento da situação da empresa",
        status: "em-andamento",
      },
      {
        id: "et-042",
        rotulo: "Questões do escritório virtual",
        status: "em-andamento",
      },
    ],
  },
  {
    id: "prc-006",
    clienteId: "cli-006",
    tipo: "irpf",
    titulo: "IRPF 2026",
    abertoOffsetMeses: -5,
    abertoDia: 2,
    // Quotas do IRPF correm até dezembro, então o processo ainda tem prazo.
    prazoOffsetMeses: 4,
    prazoDia: 30,
    etapas: [
      { id: "et-051", rotulo: "Coleta de documentos", status: "concluida" },
      { id: "et-052", rotulo: "Preenchimento da declaração", status: "concluida" },
      { id: "et-053", rotulo: "Transmissão à Receita", status: "concluida" },
      { id: "et-054", rotulo: "Emissão do recibo", status: "concluida" },
      {
        id: "et-055",
        rotulo: "Pagamento das quotas (DARF)",
        status: "em-andamento",
        observacao: "Valores a informar pela contadora.",
      },
    ],
  },
];

/**
 * Materializa os processos contra a data de hoje.
 * É função, e não constante, pelo mesmo motivo de `listarObrigacoes`.
 */
export function listarProcessos(hoje = new Date()): Processo[] {
  return SEEDS.map(
    ({
      abertoOffsetMeses,
      abertoDia,
      prazoOffsetMeses,
      prazoDia,
      ...base
    }): Processo => ({
      ...base,
      // A semente nunca nasce encerrada: encerrar é decisão da contadora e
      // vive em `armazenamento-processos.ts`, não aqui.
      encerradoEm: null,
      abertoEm: dataRelativa(abertoOffsetMeses, abertoDia, hoje),
      prazo:
        prazoOffsetMeses === null
          ? null
          : dataRelativa(prazoOffsetMeses, prazoDia, hoje),
    }),
  );
}

export function listarProcessosDoCliente(clienteId: string, hoje = new Date()) {
  return listarProcessos(hoje).filter((p) => p.clienteId === clienteId);
}
