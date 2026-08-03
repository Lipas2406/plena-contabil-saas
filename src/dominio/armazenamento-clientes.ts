import fs from "node:fs";
import path from "node:path";
import { apenasDigitos } from "@/kernel/br";
import { CLIENTES as SEED } from "@/dominio/mocks/clientes";
import type {
  Cliente,
  NaturezaJuridica,
  PorteEmpresa,
  RegimeTributario,
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

const CAMINHO = path.join(process.cwd(), ".dados", "clientes.json");

function lerOuSemear(): Cliente[] {
  if (!fs.existsSync(CAMINHO)) {
    fs.mkdirSync(path.dirname(CAMINHO), { recursive: true });
    fs.writeFileSync(CAMINHO, JSON.stringify(SEED, null, 2), "utf-8");
    return SEED;
  }
  return JSON.parse(fs.readFileSync(CAMINHO, "utf-8")) as Cliente[];
}

function gravar(lista: Cliente[]) {
  fs.mkdirSync(path.dirname(CAMINHO), { recursive: true });
  fs.writeFileSync(CAMINHO, JSON.stringify(lista, null, 2), "utf-8");
}

export function listarClientes(): Cliente[] {
  return lerOuSemear();
}

export function buscarClientePorId(id: string) {
  return listarClientes().find((c) => c.id === id);
}

/** Busca por CNPJ tolerando máscara ("31.845.220/0001-88" ou só dígitos). */
export function buscarClientePorCNPJ(cnpj: string) {
  const alvo = apenasDigitos(cnpj);
  return listarClientes().find((c) => c.cnpj === alvo);
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

/** Continua a numeração `cli-001`, `cli-002`... que a semente já usa. */
function proximoId(lista: Cliente[]) {
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
export function adicionarCliente(entrada: NovoClienteEntrada): Cliente {
  const lista = listarClientes();
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

  gravar([...lista, cliente]);
  return cliente;
}
