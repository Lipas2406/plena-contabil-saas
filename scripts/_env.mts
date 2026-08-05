import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Carrega o `.env.local` para os scripts de linha de comando.
 *
 * O Next carrega isso sozinho, mas `tsx scripts/*.mts` roda fora dele. Sem
 * isto, `npm run migrar` falharia com "DATABASE_URL não definida" mesmo com a
 * variável no arquivo, e a mensagem apontaria para o lugar errado.
 *
 * Não sobrescreve variável já presente no ambiente: em produção quem manda é o
 * ambiente, não o arquivo.
 */
export function carregarEnvLocal(arquivo = ".env.local") {
  const caminho = path.join(process.cwd(), arquivo);
  if (!existsSync(caminho)) return;

  for (const linha of readFileSync(caminho, "utf-8").split("\n")) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith("#")) continue;

    const igual = limpa.indexOf("=");
    if (igual < 0) continue;

    const chave = limpa.slice(0, igual).trim();
    let valor = limpa.slice(igual + 1).trim();
    // Aspas são delimitador do arquivo, não parte do valor.
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    if (!(chave in process.env)) process.env[chave] = valor;
  }
}
