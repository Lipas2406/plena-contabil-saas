/**
 * Formatação e normalização brasileira.
 *
 * Genérico de propósito: serve para qualquer projeto BR, não só contabilidade.
 *
 * Convenção de dinheiro do repositório: **valores trafegam em centavos
 * inteiros**. Float para dinheiro acumula erro (0.1 + 0.2 !== 0.3) e em
 * cálculo fiscal isso vira centavo de diferença numa guia. Formatar só na borda.
 */

/**
 * Centavos inteiros para BRL. Ex: 124000 -> "R$ 1.240,00"
 *
 * ATENÇÃO: o separador entre "R$" e o número é espaço NÃO SEPARÁVEL
 * (U+00A0), não espaço comum. É correto tipograficamente, impede quebra de
 * linha entre símbolo e valor, e quebra qualquer comparação ingênua de
 * string, incluindo teste e snapshot. Para comparar, use `mesmoTextoBR`.
 */
export function formatarBRL(centavos: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}

/**
 * Compara textos formatados tratando espaço não separável como espaço comum.
 * Existe por causa do U+00A0 que o Intl injeta em moeda e em milhar.
 */
export function mesmoTextoBR(a: string, b: string) {
  const achatar = (s: string) => s.replace(/\u00a0/g, " ").trim();
  return achatar(a) === achatar(b);
}

/** Centavos para número seco, sem símbolo. Ex: 124000 -> "1.240,00" */
export function formatarNumeroBR(centavos: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}

/** Remove tudo que não for dígito. Base para comparar documento digitado. */
export function apenasDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

/** 12345678000199 -> 12.345.678/0001-99. Devolve a entrada se não tiver 14 dígitos. */
export function formatarCNPJ(cnpj: string) {
  const d = apenasDigitos(cnpj);
  if (d.length !== 14) return cnpj;
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

/** 12345678901 -> 123.456.789-01. Devolve a entrada se não tiver 11 dígitos. */
export function formatarCPF(cpf: string) {
  const d = apenasDigitos(cpf);
  if (d.length !== 11) return cpf;
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

/** 11988776655 -> (11) 98877-6655. Aceita fixo (10 dígitos) e celular (11). */
export function formatarTelefone(tel: string) {
  const d = apenasDigitos(tel);
  if (d.length === 11) {
    return d.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }
  if (d.length === 10) {
    return d.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  return tel;
}

/**
 * Remove acento e caixa, para busca e comparação de texto livre.
 * Usa \p{Diacritic} em vez de faixa de combining marks: sobrevive a
 * copiar e colar entre editores, que às vezes normaliza o literal.
 */
export function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Extrai o primeiro valor monetário BR de um texto e devolve em centavos.
 * Entende "R$ 1.234,56" e "1234,56". Vírgula é decimal, ponto é milhar.
 * Devolve null se não achar.
 */
export function extrairValorBRL(texto: string): number | null {
  const m = texto.match(/R?\$?\s*(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})\b/);
  if (!m) return null;
  return Number(m[1].replace(/\./g, "")) * 100 + Number(m[2]);
}
