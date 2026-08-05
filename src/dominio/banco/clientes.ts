import { obterSql } from "@/dominio/banco/conexao";
import { apenasDigitos } from "@/kernel/br";
import type {
  Cliente,
  NaturezaJuridica,
  PorteEmpresa,
  RegimeTributario,
  ServicoPlena,
  StatusCliente,
  TipoAtendimento,
  TipoPessoa,
} from "@/dominio/tipos";
import type {
  EdicaoClienteEntrada,
  NovoClienteEntrada,
} from "@/dominio/armazenamento-clientes";
import { fundirCliente } from "@/dominio/armazenamento-clientes";

/**
 * Carteira de clientes em Postgres.
 *
 * Substitui o arquivo JSON mantendo **exatamente** as assinaturas que a fase 1
 * já deixou assíncronas. Nenhuma tela muda por causa deste arquivo.
 *
 * Duas mudanças de comportamento, e as duas são correções:
 *
 * 1. **Id vem da sequência do banco.** O `proximoId()` antigo lia a lista,
 *    achava o maior e somava um — ler-modificar-gravar sem transação. Dois
 *    cadastros simultâneos calculavam o mesmo número e a segunda gravação
 *    apagava a primeira.
 * 2. **Escrita é por linha, não pelo array inteiro.** `INSERT` e `UPDATE ...
 *    WHERE id` em vez de reescrever a carteira toda. Dois cadastros ao mesmo
 *    tempo deixam de competir pelo mesmo arquivo.
 */

/** Forma da linha no banco. `snake_case` aqui, `camelCase` no domínio. */
interface LinhaCliente {
  id: string;
  razao_social: string | null;
  nome_fantasia: string;
  tipo_pessoa: string;
  cnpj: string | null;
  cpf: string | null;
  atividade: string | null;
  natureza_juridica: string | null;
  porte: string | null;
  regime: string | null;
  status: string;
  atendimentos: string[];
  servicos: string[];
  responsavel: string | null;
  email: string | null;
  telefone: string | null;
  cliente_desde: string | Date | null;
}

/**
 * Data como `YYYY-MM-DD`, sem passar por fuso.
 *
 * O driver devolve `date` do Postgres já como string nesse formato, mas
 * `timestamptz` vem como `Date`. Converter com `toISOString()` sem cuidado é o
 * que faz "encerrado dia 4" virar "dia 5" para quem está em UTC-3.
 */
function dataISO(valor: string | Date | null): string | null {
  if (valor === null) return null;
  if (typeof valor === "string") return valor.slice(0, 10);
  return `${valor.getUTCFullYear()}-${String(valor.getUTCMonth() + 1).padStart(2, "0")}-${String(valor.getUTCDate()).padStart(2, "0")}`;
}

function paraDominio(l: LinhaCliente): Cliente {
  return {
    id: l.id,
    razaoSocial: l.razao_social,
    nomeFantasia: l.nome_fantasia,
    tipoPessoa: l.tipo_pessoa as TipoPessoa,
    cnpj: l.cnpj,
    cpf: l.cpf,
    atividade: l.atividade,
    naturezaJuridica: l.natureza_juridica as NaturezaJuridica | null,
    porte: l.porte as PorteEmpresa | null,
    regime: l.regime as RegimeTributario | null,
    status: l.status as StatusCliente,
    atendimentos: (l.atendimentos ?? []) as TipoAtendimento[],
    servicos: (l.servicos ?? []) as ServicoPlena[],
    responsavel: l.responsavel,
    email: l.email,
    telefone: l.telefone,
    clienteDesde: dataISO(l.cliente_desde),
  };
}

const COLUNAS = `
  id, razao_social, nome_fantasia, tipo_pessoa, cnpj, cpf, atividade,
  natureza_juridica, porte, regime, status, atendimentos, servicos,
  responsavel, email, telefone, cliente_desde
`;

export async function listarClientes(): Promise<Cliente[]> {
  const sql = obterSql();
  const linhas = (await sql`
    SELECT ${sql.unsafe(COLUNAS)} FROM clientes ORDER BY id
  `) as LinhaCliente[];
  return linhas.map(paraDominio);
}

export async function buscarClientePorId(
  id: string,
): Promise<Cliente | undefined> {
  const sql = obterSql();
  const linhas = (await sql`
    SELECT ${sql.unsafe(COLUNAS)} FROM clientes WHERE id = ${id}
  `) as LinhaCliente[];
  return linhas[0] ? paraDominio(linhas[0]) : undefined;
}

/** Busca por CNPJ tolerando máscara. O banco guarda só dígitos. */
export async function buscarClientePorCNPJ(
  cnpj: string,
): Promise<Cliente | undefined> {
  const sql = obterSql();
  const alvo = apenasDigitos(cnpj);
  const linhas = (await sql`
    SELECT ${sql.unsafe(COLUNAS)} FROM clientes WHERE cnpj = ${alvo}
  `) as LinhaCliente[];
  return linhas[0] ? paraDominio(linhas[0]) : undefined;
}

/**
 * Cadastra cliente novo.
 *
 * O id sai de `nextval`, dentro do próprio INSERT: é uma ida ao banco só, e é
 * atômico. `RETURNING` devolve a linha gravada de verdade, então o que volta
 * para a tela é o que ficou no banco, não o que se esperava gravar.
 */
export async function adicionarCliente(
  entrada: NovoClienteEntrada,
): Promise<Cliente> {
  const sql = obterSql();
  const ehPJ = entrada.tipoPessoa === "PJ";

  const linhas = (await sql`
    INSERT INTO clientes (
      id, razao_social, nome_fantasia, tipo_pessoa, cnpj, cpf, atividade,
      natureza_juridica, porte, regime, status, atendimentos, servicos,
      responsavel, email, telefone, cliente_desde
    ) VALUES (
      'cli-' || lpad(nextval('clientes_seq')::text, 3, '0'),
      ${entrada.razaoSocial?.trim() || null},
      ${entrada.nomeFantasia.trim()},
      ${entrada.tipoPessoa},
      ${entrada.cnpj ? apenasDigitos(entrada.cnpj) : null},
      ${entrada.cpf ? apenasDigitos(entrada.cpf) : null},
      ${entrada.atividade?.trim() || null},
      ${ehPJ ? (entrada.naturezaJuridica ?? null) : null},
      ${ehPJ ? (entrada.porte ?? null) : null},
      ${ehPJ ? (entrada.regime ?? null) : null},
      'pendente',
      '{}', '{}',
      ${entrada.responsavel?.trim() || null},
      ${entrada.email?.trim() || null},
      ${entrada.telefone ? apenasDigitos(entrada.telefone) : null},
      CURRENT_DATE
    )
    RETURNING ${sql.unsafe(COLUNAS)}
  `) as LinhaCliente[];

  return paraDominio(linhas[0]);
}

/**
 * Edita cliente.
 *
 * A fusão continua sendo feita por `fundirCliente`, a mesma função pura que o
 * `verificar.mts` testa. O banco só persiste o resultado — a regra de "campo
 * ausente não mexe no valor gravado" não muda de lugar.
 */
export async function atualizarCliente(
  id: string,
  entrada: EdicaoClienteEntrada,
): Promise<Cliente> {
  const sql = obterSql();
  const atual = await buscarClientePorId(id);
  if (!atual) throw new Error(`Cliente ${id} não existe.`);

  const c = fundirCliente(atual, entrada);

  const linhas = (await sql`
    UPDATE clientes SET
      razao_social = ${c.razaoSocial},
      nome_fantasia = ${c.nomeFantasia},
      cnpj = ${c.cnpj},
      cpf = ${c.cpf},
      atividade = ${c.atividade},
      natureza_juridica = ${c.naturezaJuridica},
      porte = ${c.porte},
      regime = ${c.regime},
      responsavel = ${c.responsavel},
      email = ${c.email},
      telefone = ${c.telefone},
      atualizado_em = now()
    WHERE id = ${id}
    RETURNING ${sql.unsafe(COLUNAS)}
  `) as LinhaCliente[];

  if (!linhas[0]) throw new Error(`Cliente ${id} não existe.`);
  return paraDominio(linhas[0]);
}

/**
 * Troca só o status do cliente. Arquivar e reativar passam por aqui.
 *
 * Está separado de `atualizarCliente` de propósito: status não é campo de
 * cadastro. Se ele viajasse junto no formulário, um salvamento comum poderia
 * arquivar cliente por acidente, que é exatamente o risco que a confirmação da
 * tela existe para evitar.
 *
 * Não há DELETE aqui nem em lugar nenhum, e não é esquecimento: as chaves
 * estrangeiras de processos, documentos e obrigações são RESTRICT. Apagar um
 * cliente com histórico seria recusado pelo banco, e apagar um sem histórico
 * ainda assim jogaria fora cadastro que a contadora digitou.
 */
export async function definirStatusCliente(
  id: string,
  status: StatusCliente,
): Promise<Cliente> {
  const sql = obterSql();

  const linhas = (await sql`
    UPDATE clientes
       SET status = ${status}, atualizado_em = now()
     WHERE id = ${id}
    RETURNING ${sql.unsafe(COLUNAS)}
  `) as LinhaCliente[];

  if (!linhas[0]) throw new Error(`Cliente ${id} não existe.`);
  return paraDominio(linhas[0]);
}
