import type { Cliente } from "@/dominio/tipos";

/**
 * Carteira da Plena Contábil, ANONIMIZADA.
 *
 * A ESTRUTURA é real: veio da carteira da contadora em 01/08/2026, e é o que
 * dá valor à demonstração (natureza jurídica, porte, regime, tipo de trabalho
 * e, principalmente, o quanto de cada cadastro está vazio).
 *
 * A IDENTIDADE é falsa, de propósito:
 *
 * - Os nomes são parecidos com os verdadeiros no som, e diferentes o bastante
 *   para não identificarem ninguém. A contadora reconhece de quem se trata, um
 *   terceiro não.
 * - O CNPJ tem dígito verificador inválido de propósito, então não existe e
 *   não colide com empresa nenhuma. Confira com `formatarCNPJ` se duvidar.
 * - Não há e-mail, telefone nem valor em dinheiro. Onde falta dado o campo é
 *   `null` e a tela mostra "a informar". Nada foi inventado para preencher.
 *
 * Motivo de existir assim: dado de cliente de terceiro num repositório é
 * exposição sem contrapartida. A demonstração não fica pior por isso, porque
 * o que ela precisa provar é a forma da carteira, não quem são as pessoas.
 * O de-para com os nomes reais fica no vault do Filipe, fora daqui.
 *
 * O que a carteira revela sobre o produto: dos 6, **nenhum** é contabilidade
 * mensal recorrente. São 2 aberturas, 1 regularização, 2 suportes e 1 IRPF de
 * pessoa física. O painel precisa servir processo, não só guia mensal.
 *
 * A partir de 01/08/2026 este array só SEMEIA a carteira: quem lê e escreve
 * de verdade é `@/dominio/armazenamento-clientes`, que persiste em arquivo
 * fora do git. Cliente cadastrado pela contadora não mexe neste arquivo.
 */
export const CLIENTES: Cliente[] = [
  {
    id: "cli-001",
    razaoSocial: "Márcio Antunes de Lira",
    nomeFantasia: "Márcio Antunes de Lira",
    tipoPessoa: "PJ",
    cnpj: "31845220000188",
    cpf: null,
    atividade: "Obras de acabamento",
    naturezaJuridica: "Empresário Individual",
    porte: "ME",
    regime: "Não optante",
    status: "pendente",
    atendimentos: ["regularizacao"],
    servicos: ["regularizacao-cnpj"],
    responsavel: "Márcio Antunes de Lira",
    email: null,
    telefone: null,
    clienteDesde: null,
  },
  {
    id: "cli-002",
    razaoSocial: "Cajueiro Guinchos Ltda.",
    nomeFantasia: "Cajueiro Guinchos",
    tipoPessoa: "PJ",
    // Empresa em abertura: o CNPJ só existe ao fim do REDESIM.
    cnpj: null,
    cpf: null,
    atividade: "Serviços de reboque de veículos",
    naturezaJuridica: "SLU",
    porte: "ME",
    regime: "Simples Nacional",
    status: "pendente",
    atendimentos: ["abertura"],
    servicos: ["abertura-de-empresa"],
    responsavel: "Não informado",
    email: null,
    telefone: null,
    clienteDesde: null,
  },
  {
    id: "cli-003",
    razaoSocial: "Não informado",
    nomeFantasia: "Edilaine (Psicóloga)",
    tipoPessoa: "PJ",
    cnpj: null,
    cpf: null,
    atividade: "86.50-0/03 Atividades de psicologia e psicanálise",
    naturezaJuridica: "SLU",
    porte: "ME",
    regime: "Simples Nacional",
    status: "pendente",
    atendimentos: ["abertura"],
    servicos: ["abertura-de-empresa"],
    responsavel: "Edilaine",
    email: null,
    telefone: null,
    clienteDesde: null,
  },
  {
    id: "cli-004",
    razaoSocial: "Não informado",
    nomeFantasia: "Davison (empresa)",
    tipoPessoa: "PJ",
    cnpj: null,
    cpf: null,
    atividade: null,
    naturezaJuridica: null,
    porte: null,
    regime: null,
    status: "ativo",
    atendimentos: ["suporte"],
    servicos: [],
    responsavel: "Davison",
    email: null,
    telefone: null,
    clienteDesde: null,
  },
  {
    id: "cli-005",
    razaoSocial: "Não informado",
    nomeFantasia: "Dr. Paulino (empresa)",
    tipoPessoa: "PJ",
    cnpj: null,
    cpf: null,
    atividade: null,
    naturezaJuridica: null,
    porte: null,
    regime: null,
    status: "ativo",
    atendimentos: ["suporte"],
    servicos: [],
    responsavel: "Dr. Paulino",
    email: null,
    telefone: null,
    clienteDesde: null,
  },
  {
    id: "cli-006",
    razaoSocial: "Roberval",
    nomeFantasia: "Roberval",
    tipoPessoa: "PF",
    cnpj: null,
    cpf: null,
    atividade: null,
    naturezaJuridica: null,
    porte: null,
    // Pessoa física não tem regime tributário. Aqui `null` é o único valor
    // honesto, e a tela não deve renderizar o campo para PF.
    regime: null,
    status: "ativo",
    atendimentos: ["irpf"],
    servicos: ["imposto-de-renda"],
    responsavel: "Roberval",
    email: null,
    telefone: null,
    clienteDesde: null,
  },
];

/** Cadastro incompleto: o que trava emitir guia ou declarar. */
export function cadastroIncompleto(cliente: Cliente) {
  const faltando: string[] = [];
  if (cliente.tipoPessoa === "PJ" && !cliente.cnpj) faltando.push("CNPJ");
  if (cliente.tipoPessoa === "PF" && !cliente.cpf) faltando.push("CPF");
  if (!cliente.atividade) faltando.push("atividade");
  if (cliente.tipoPessoa === "PJ" && !cliente.regime) faltando.push("regime");
  if (!cliente.email) faltando.push("e-mail");
  if (!cliente.telefone) faltando.push("telefone");
  return faltando;
}
