import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Hash de senha com scrypt.
 *
 * Por que scrypt e não bcrypt/argon2: os dois exigem binário nativo, que
 * complica o deploy serverless e prende a versão do Node. `scrypt` vem no
 * `node:crypto`, é uma função de derivação deliberadamente lenta e com custo
 * de memória — que é exatamente o que se quer contra ataque de força bruta em
 * GPU — e não acrescenta nenhuma dependência ao projeto.
 *
 * Por que não SHA-256 puro: ele é RÁPIDO, e velocidade é defeito aqui. Uma
 * GPU testa bilhões de SHA-256 por segundo; o mesmo hardware testa poucos
 * milhares de scrypt com estes parâmetros.
 */

/**
 * Custo de CPU/memória. 2^16 é o recomendado atual para uso interativo:
 * aproximadamente 100ms por verificação em hardware comum, imperceptível para
 * quem entra e caro para quem tenta adivinhar.
 */
const CUSTO_N = 65_536;
const TAMANHO_BLOCO = 8;
const PARALELISMO = 1;
const TAMANHO_HASH = 64;
const TAMANHO_SAL = 16;

/** Piso de tamanho de senha. Não é política de segurança, é o mínimo do mínimo. */
export const SENHA_MINIMA = 8;

export interface SenhaGuardada {
  hash: string;
  sal: string;
}

function derivar(senha: string, sal: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      // NFKC porque "á" pode chegar como um caractere ou como "a" + acento
      // combinante, dependendo do teclado e do sistema. Sem normalizar, a
      // mesma senha digitada em dois aparelhos gera hashes diferentes.
      senha.normalize("NFKC"),
      sal,
      TAMANHO_HASH,
      {
        N: CUSTO_N,
        r: TAMANHO_BLOCO,
        p: PARALELISMO,
        // O padrão do Node não comporta N alto sem isto, e o erro que aparece
        // ("Invalid scrypt params") não diz qual parâmetro está errado.
        maxmem: 256 * 1024 * 1024,
      },
      (erro, chave) => (erro ? reject(erro) : resolve(chave)),
    );
  });
}

/**
 * Gera hash e sal para uma senha nova.
 *
 * O sal é por usuário e aleatório: sem ele, duas pessoas com a mesma senha
 * teriam o mesmo hash, e uma tabela pré-computada quebraria as duas de uma vez.
 */
export async function criarHashSenha(senha: string): Promise<SenhaGuardada> {
  if (senha.length < SENHA_MINIMA) {
    throw new Error(`A senha precisa ter ao menos ${SENHA_MINIMA} caracteres.`);
  }
  const sal = randomBytes(TAMANHO_SAL);
  const hash = await derivar(senha, sal);
  return { hash: hash.toString("hex"), sal: sal.toString("hex") };
}

/**
 * Confere uma senha contra o hash guardado.
 *
 * Usa `timingSafeEqual`, que compara em tempo constante. Comparação normal
 * (`===`) para no primeiro byte diferente, e essa diferença de microssegundos
 * é medível pela rede: dá para descobrir o hash byte a byte. É um ataque real,
 * e a defesa custa uma linha.
 */
export async function conferirSenha(
  senha: string,
  guardada: SenhaGuardada,
): Promise<boolean> {
  try {
    const sal = Buffer.from(guardada.sal, "hex");
    const esperado = Buffer.from(guardada.hash, "hex");
    const obtido = await derivar(senha, sal);
    if (obtido.length !== esperado.length) return false;
    return timingSafeEqual(obtido, esperado);
  } catch {
    // Hash malformado no banco não deve derrubar o login: nega e segue.
    return false;
  }
}

/** Token de sessão opaco, 256 bits. Não carrega informação, só identifica a linha. */
export function gerarTokenSessao(): string {
  return randomBytes(32).toString("hex");
}
