import fs from "node:fs/promises";
import path from "node:path";

/**
 * Base comum dos arquivos persistidos em `.dados/`.
 *
 * Existe para cliente e processo não duplicarem a detecção de disco somente
 * leitura, que é sutil e cara de errar: em hospedagem serverless o diretório
 * da aplicação não aceita escrita, e sem o teste a primeira leitura derruba a
 * aplicação inteira com `EROFS`.
 *
 * Isto não é banco. É o degrau mínimo entre mock estático e banco, e quando
 * banco entrar só estes módulos mudam: nenhuma tela importa `node:fs`.
 *
 * ── Assíncrono desde 04/08/2026, ainda em disco ──────────────────────────
 * A troca de `node:fs` por `node:fs/promises` aconteceu ANTES da troca por
 * Postgres, de propósito. São duas mudanças de natureza diferente: virar
 * assíncrono é mecânico e o compilador aponta a cadeia inteira; trocar de
 * banco tem rede no meio e falha de forma intermitente. Depurar as duas ao
 * mesmo tempo é o que transforma esta migração numa semana perdida.
 *
 * A consequência é que as assinaturas aqui já são as definitivas: quando o
 * Postgres entrar, só o corpo destas funções muda.
 */

export const PASTA_DADOS = path.join(process.cwd(), ".dados");

/** Erro de escrita bloqueada pelo ambiente, para a UI distinguir de erro de dado. */
export class ArmazenamentoSomenteLeituraError extends Error {
  constructor() {
    super("Esta demonstração está hospedada em ambiente somente leitura.");
    this.name = "ArmazenamentoSomenteLeituraError";
  }
}

let gravavelCache: boolean | null = null;

/**
 * Dá para gravar aqui?
 *
 * Testa escrevendo de verdade, uma vez por processo. Deduzir pela variável de
 * ambiente (`process.env.VERCEL`) seria adivinhar o comportamento do provedor;
 * tentar escrever responde a pergunta que realmente importa.
 *
 * ⚠ O cache por processo é adequado para disco, cujo resultado é
 * determinístico, e vai deixar de ser quando isto virar banco: uma queda
 * momentânea de conexão travaria a aplicação em modo somente leitura até a
 * instância morrer, e um sucesso inicial esconderia uma queda posterior. Na
 * fase do Postgres, "esta instalação é somente leitura" (configuração,
 * síncrona, barata) tem que se separar de "a escrita falhou agora" (erro de
 * runtime, já tratado nos `catch` das ações).
 */
export async function podeGravar(): Promise<boolean> {
  if (gravavelCache !== null) return gravavelCache;
  try {
    await fs.mkdir(PASTA_DADOS, { recursive: true });
    await fs.access(PASTA_DADOS, fs.constants.W_OK);
    gravavelCache = true;
  } catch {
    gravavelCache = false;
  }
  return gravavelCache;
}

/** Lê o JSON do arquivo, ou devolve `null` quando ele ainda não existe. */
export async function lerJSON<T>(nomeArquivo: string): Promise<T | null> {
  const caminho = path.join(PASTA_DADOS, nomeArquivo);
  try {
    return JSON.parse(await fs.readFile(caminho, "utf-8")) as T;
  } catch (erro) {
    // Arquivo ainda não existe é o caso normal na primeira execução, e não é
    // erro. Qualquer outra falha (permissão, JSON corrompido) precisa subir:
    // engolir aqui devolveria `null` e faria o chamador semear por cima de um
    // arquivo real que só estava ilegível.
    if ((erro as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw erro;
  }
}

/** Grava o JSON. Lança se o ambiente não aceitar escrita. */
export async function gravarJSON(
  nomeArquivo: string,
  dados: unknown,
): Promise<void> {
  if (!(await podeGravar())) throw new ArmazenamentoSomenteLeituraError();
  await fs.writeFile(
    path.join(PASTA_DADOS, nomeArquivo),
    JSON.stringify(dados, null, 2),
    "utf-8",
  );
}
