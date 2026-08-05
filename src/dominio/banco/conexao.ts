import { neon } from "@neondatabase/serverless";

/**
 * Conexão com o Postgres (Neon).
 *
 * Por que o driver serverless e não `pg`: em função serverless cada invocação
 * pode ser um processo novo, e abrir conexão TCP a cada requisição esgota o
 * limite do banco em minutos. O driver do Neon fala HTTP e não mantém pool,
 * que é o modelo certo para este ambiente.
 *
 * Por que SQL puro e não ORM: o projeto inteiro é escrito para ser lido, e
 * ORM troca clareza por conveniência. Aqui a consulta que roda é a consulta
 * que está no arquivo.
 */

let clienteSql: ReturnType<typeof neon> | null = null;

/** Erro de configuração ausente, distinto de erro de consulta. */
export class BancoNaoConfiguradoError extends Error {
  constructor() {
    super(
      "DATABASE_URL não está definida. O sistema não consegue falar com o banco.",
    );
    this.name = "BancoNaoConfiguradoError";
  }
}

/**
 * O banco está configurado neste ambiente?
 *
 * Existe para a interface conseguir dizer a verdade quando não está, em vez de
 * quebrar com erro de conexão. É a mesma ideia do antigo `podeGravar()`, que
 * perguntava ao ambiente em vez de adivinhar — só que agora a pergunta é sobre
 * configuração, e não sobre disco.
 */
export function bancoConfigurado(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Cliente SQL, criado uma vez por processo.
 *
 * Uso: sql`SELECT * FROM clientes WHERE id = ${id}`
 *
 * O template tag PARAMETRIZA os valores interpolados. Não é concatenação de
 * string: `${id}` vira `$1` com o valor enviado à parte, então injeção de SQL
 * não acontece por construção. Nunca montar consulta com `+` ou com
 * `String.raw` para contornar isso.
 */
export function obterSql() {
  if (!bancoConfigurado()) throw new BancoNaoConfiguradoError();
  if (!clienteSql) clienteSql = neon(process.env.DATABASE_URL!);
  return clienteSql;
}

/**
 * Identificador legível, com prefixo por entidade.
 *
 * Prefixo (`cli_`, `obr_`) porque id que aparece em log e em URL fica muito
 * mais fácil de rastrear quando diz o que é. O sufixo aleatório de 96 bits
 * torna colisão irrelevante na prática, e — ao contrário de um contador em
 * memória — não quebra quando existirem duas instâncias da aplicação ao mesmo
 * tempo, que é justamente o que acontece em serverless.
 */
export function novoId(prefixo: string): string {
  const aleatorio = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  return `${prefixo}_${aleatorio}`;
}
