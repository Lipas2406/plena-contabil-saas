import fs from "node:fs";
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
 */
export function podeGravar(): boolean {
  if (gravavelCache !== null) return gravavelCache;
  try {
    fs.mkdirSync(PASTA_DADOS, { recursive: true });
    fs.accessSync(PASTA_DADOS, fs.constants.W_OK);
    gravavelCache = true;
  } catch {
    gravavelCache = false;
  }
  return gravavelCache;
}

/** Lê o JSON do arquivo, ou devolve `null` quando ele ainda não existe. */
export function lerJSON<T>(nomeArquivo: string): T | null {
  const caminho = path.join(PASTA_DADOS, nomeArquivo);
  if (!fs.existsSync(caminho)) return null;
  return JSON.parse(fs.readFileSync(caminho, "utf-8")) as T;
}

/** Grava o JSON. Lança se o ambiente não aceitar escrita. */
export function gravarJSON(nomeArquivo: string, dados: unknown): void {
  if (!podeGravar()) throw new ArmazenamentoSomenteLeituraError();
  fs.writeFileSync(
    path.join(PASTA_DADOS, nomeArquivo),
    JSON.stringify(dados, null, 2),
    "utf-8",
  );
}
