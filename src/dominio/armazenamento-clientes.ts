import {
  ArmazenamentoSomenteLeituraError,
  gravarJSON,
  lerJSON,
  podeGravar,
} from "@/dominio/armazenamento-base";
import { bancoConfigurado } from "@/dominio/banco/conexao";
import { apenasDigitos } from "@/kernel/br";
import { CLIENTES as SEED } from "@/dominio/mocks/clientes";
import type {
  Cliente,
  NaturezaJuridica,
  PorteEmpresa,
  RegimeTributario,
  StatusCliente,
  TipoPessoa,
} from "@/dominio/tipos";

/**
 * Carteira persistida em arquivo, fora do git (ver `.gitignore`).
 *
 * `mocks/clientes.ts` continua sendo a semente: estrutura real anonimizada,
 * usada para popular o arquivo na primeira leitura. Daqui para frente, quem
 * cadastra cliente novo grava aqui, não lá. É o motivo de existir este
 * arquivo em vez de simplesmente mutar o array do mock em memória: array em
 * memória do processo Node não sobrevive a um F5 do navegador nem a um
 * restart do `next dev`, e cadastrar cliente é justamente a ação que precisa
 * sobreviver a isso, ver `overview plena contábil saas.md`.
 *
 * Isto não é banco de verdade. É o degrau mínimo entre "mock estático" e
 * "banco", suficiente para a Marta usar de verdade num piloto. Quando entrar
 * banco, só este arquivo muda: nenhuma tela importa `fs`.
 */

/**
 * `true` quando a carteira não pode receber cadastro novo neste ambiente.
 *
 * A UI precisa saber para NÃO oferecer o botão de cadastrar: botão que aceita
 * o clique e perde o dado é a affordance falsa que este projeto já removeu
 * quatro vezes. Ver `conhecimento/wiki/affordance-falsa` no vault.
 */
const ARQUIVO = "clientes.json";

/**
 * Onde a carteira mora, neste ambiente.
 *
 * Com `DATABASE_URL` definida, é o Postgres; sem ela, o arquivo em `.dados/`.
 * O fallback existe para o projeto continuar rodando numa máquina sem banco
 * configurado — não é modo de produção.
 *
 * O import do módulo de banco é DINÂMICO de propósito: `banco/clientes.ts`
 * importa `fundirCliente` daqui, e um import estático nos dois sentidos criaria
 * ciclo. Dinâmico resolve na primeira chamada e fica em cache do módulo.
 */
async function repositorio() {
  return import("@/dominio/banco/clientes");
}

/**
 * `true` quando a carteira não aceita cadastro novo neste ambiente.
 *
 * Com banco, isto deixa de perguntar ao disco: se há `DATABASE_URL`, grava.
 * Falha de conexão é outra coisa — erro de runtime, tratado no `catch` das
 * ações, e não um estado permanente da instalação. Fundir os dois num teste
 * assíncrono cacheado por processo produziria o pior dos dois: uma queda
 * momentânea travaria a aplicação em somente leitura até a instância morrer.
 */
export async function carteiraSomenteLeitura(): Promise<boolean> {
  if (bancoConfigurado()) return false;
  return !(await podeGravar());
}

async function lerOuSemear(): Promise<Cliente[]> {
  const gravado = await lerJSON<Cliente[]>(ARQUIVO);
  if (gravado) return gravado;
  // Sem arquivo e sem permissão de escrita: a demonstração roda com a semente
  // em memória. Perde cadastro novo, não perde a carteira.
  if (!(await podeGravar())) return SEED;
  await gravarJSON(ARQUIVO, SEED);
  return SEED;
}

const gravar = (lista: Cliente[]) => gravarJSON(ARQUIVO, lista);

export async function listarClientes(): Promise<Cliente[]> {
  if (bancoConfigurado()) return (await repositorio()).listarClientes();
  return lerOuSemear();
}

export async function buscarClientePorId(id: string) {
  if (bancoConfigurado()) return (await repositorio()).buscarClientePorId(id);
  return (await listarClientes()).find((c) => c.id === id);
}

/** Busca por CNPJ tolerando máscara ("31.845.220/0001-88" ou só dígitos). */
export async function buscarClientePorCNPJ(cnpj: string) {
  if (bancoConfigurado()) return (await repositorio()).buscarClientePorCNPJ(cnpj);
  const alvo = apenasDigitos(cnpj);
  return (await listarClientes()).find((c) => c.cnpj === alvo);
}

export interface NovoClienteEntrada {
  nomeFantasia: string;
  razaoSocial?: string | null;
  tipoPessoa: TipoPessoa;
  cnpj?: string | null;
  cpf?: string | null;
  atividade?: string | null;
  naturezaJuridica?: NaturezaJuridica | null;
  porte?: PorteEmpresa | null;
  regime?: RegimeTributario | null;
  responsavel?: string | null;
  email?: string | null;
  telefone?: string | null;
}

/**
 * Continua a numeração `cli-001`, `cli-002`... que a semente já usa.
 *
 * Exportada em 04/08/2026 só para ser testável. Ela é o ponto que a migração
 * para banco vai substituir, e até aqui não tinha nenhum teste — ver
 * `scripts/verificar.mts`.
 */
export function proximoId(lista: Cliente[]) {
  const maior = lista.reduce((max, c) => {
    const m = /^cli-(\d+)$/.exec(c.id);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
  return `cli-${String(maior + 1).padStart(3, "0")}`;
}

/**
 * Cadastra cliente novo com o mínimo que a contadora informou.
 *
 * Sem processo e sem obrigação: aquilo entra depois, por outra tela. `null`
 * aqui é o mesmo `null` de `tipos.ts`, "ainda não informado", nunca invenção.
 */
export async function adicionarCliente(
  entrada: NovoClienteEntrada,
): Promise<Cliente> {
  if (bancoConfigurado()) return (await repositorio()).adicionarCliente(entrada);

  const lista = await listarClientes();
  const nome = entrada.nomeFantasia.trim();

  const cliente: Cliente = {
    id: proximoId(lista),
    // Sem razão social o campo fica nulo, e não copia o nome fantasia: copiar
    // faria o cadastro parecer completo e sumiria da lista de lacunas.
    razaoSocial: entrada.razaoSocial?.trim() || null,
    nomeFantasia: nome,
    tipoPessoa: entrada.tipoPessoa,
    cnpj: entrada.cnpj ? apenasDigitos(entrada.cnpj) : null,
    cpf: entrada.cpf ? apenasDigitos(entrada.cpf) : null,
    atividade: entrada.atividade?.trim() || null,
    naturezaJuridica:
      entrada.tipoPessoa === "PJ" ? (entrada.naturezaJuridica ?? null) : null,
    porte: entrada.tipoPessoa === "PJ" ? (entrada.porte ?? null) : null,
    regime: entrada.tipoPessoa === "PJ" ? (entrada.regime ?? null) : null,
    status: "pendente",
    atendimentos: [],
    servicos: [],
    responsavel: entrada.responsavel?.trim() || null,
    email: entrada.email?.trim() || null,
    telefone: entrada.telefone ? apenasDigitos(entrada.telefone) : null,
    // Data real do cadastro, não suposição: é hoje que ele entrou no sistema.
    clienteDesde: new Date().toISOString().slice(0, 10),
  };

  // `await` obrigatório: sem ele a função devolveria o cliente antes de a
  // gravação terminar, a Server Action responderia "ok" e o registro poderia
  // nunca existir. É a Categoria B da auditoria, que o tsc não aponta.
  await gravar([...lista, cliente]);
  return cliente;
}

/**
 * Completa ou corrige o cadastro de um cliente que já existe.
 *
 * Existe porque a tela aponta o que falta ("Falta razão social, CNPJ,
 * e-mail...") e, até 02/08/2026, não havia onde digitar: o painel virava
 * formulário de coleta sem campo. Só `adicionarCliente` existia.
 *
 * Campo ausente na entrada é **campo não mexido**, e string vazia vira `null`.
 * A distinção importa: a contadora costuma preencher uma lacuna de cada vez,
 * conforme o cliente responde, e um formulário parcial não pode apagar o que
 * já estava lá. `null` continua significando "ainda não informado".
 *
 * O que NÃO se edita por aqui: `id`, `clienteDesde` e `tipoPessoa`. Os dois
 * primeiros são história, não cadastro. O terceiro troca quais campos fazem
 * sentido (CPF x CNPJ, regime) e mudaria o significado dos dados já gravados,
 * então é caso de cadastro novo, não de edição.
 */
export type EdicaoClienteEntrada = Partial<
  Omit<NovoClienteEntrada, "tipoPessoa">
>;

/**
 * Funde o cadastro atual com o que a contadora digitou. Função PURA: não lê
 * nem grava disco.
 *
 * Está separada de `atualizarCliente` de propósito, pelo mesmo motivo das
 * ferramentas de IA terem `.puro`: o que precisa de teste é a regra de fusão
 * (o que mantém, o que substitui, o que vira lacuna), e o portão não pode
 * depender de estado em disco nem sujar a carteira real.
 *
 * Testar uma CÓPIA da regra no script de verificação seria pior que não
 * testar: passaria a dar OK mesmo depois de esta função mudar.
 */
export function fundirCliente(
  atual: Cliente,
  entrada: EdicaoClienteEntrada,
): Cliente {
  // `undefined` = campo não veio no formulário, mantém o que estava.
  // `null` ou string vazia = a contadora apagou de propósito, vira lacuna.
  const texto = (v: string | null | undefined, anterior: string | null) =>
    v === undefined ? anterior : (v?.trim() || null);
  const digitos = (v: string | null | undefined, anterior: string | null) =>
    v === undefined ? anterior : v?.trim() ? apenasDigitos(v) : null;

  return {
    ...atual,
    razaoSocial: texto(entrada.razaoSocial, atual.razaoSocial),
    nomeFantasia: entrada.nomeFantasia?.trim() || atual.nomeFantasia,
    // CNPJ e CPF seguem o tipo de pessoa que o cliente já tem: PF não ganha
    // CNPJ por edição, e PJ não ganha CPF.
    cnpj: atual.tipoPessoa === "PJ" ? digitos(entrada.cnpj, atual.cnpj) : null,
    cpf: atual.tipoPessoa === "PF" ? digitos(entrada.cpf, atual.cpf) : null,
    atividade: texto(entrada.atividade, atual.atividade),
    naturezaJuridica:
      atual.tipoPessoa === "PJ"
        ? (entrada.naturezaJuridica ?? atual.naturezaJuridica)
        : null,
    porte:
      atual.tipoPessoa === "PJ" ? (entrada.porte ?? atual.porte) : null,
    regime:
      atual.tipoPessoa === "PJ" ? (entrada.regime ?? atual.regime) : null,
    responsavel: texto(entrada.responsavel, atual.responsavel),
    email: texto(entrada.email, atual.email),
    telefone: digitos(entrada.telefone, atual.telefone),
  };
}

export async function atualizarCliente(
  id: string,
  entrada: EdicaoClienteEntrada,
): Promise<Cliente> {
  if (bancoConfigurado())
    return (await repositorio()).atualizarCliente(id, entrada);

  const lista = await listarClientes();
  const indice = lista.findIndex((c) => c.id === id);
  if (indice < 0) throw new Error(`Cliente ${id} não existe.`);

  const atualizado = fundirCliente(lista[indice], entrada);
  const nova = [...lista];
  nova[indice] = atualizado;
  await gravar(nova);
  return atualizado;
}

/** Nome antigo, mantido para quem já importava. */
export { ArmazenamentoSomenteLeituraError as CarteiraSomenteLeituraError };

/**
 * Arquiva ou reativa um cliente.
 *
 * Arquivar é o mais perto de "excluir" que este sistema chega, e de propósito.
 * Documento contábil tem prazo legal de guarda, cliente que sai volta, e o
 * histórico do trabalho feito não pode evaporar por um clique errado. O
 * cliente arquivado sai da carteira do dia a dia e continua achável.
 */
export async function definirStatusCliente(
  id: string,
  status: StatusCliente,
): Promise<Cliente> {
  if (bancoConfigurado())
    return (await repositorio()).definirStatusCliente(id, status);

  const lista = await listarClientes();
  const indice = lista.findIndex((c) => c.id === id);
  if (indice < 0) throw new Error(`Cliente ${id} não existe.`);

  const atualizado = { ...lista[indice], status };
  const nova = [...lista];
  nova[indice] = atualizado;
  await gravar(nova);
  return atualizado;
}
