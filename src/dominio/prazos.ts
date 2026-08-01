import { diasAte } from "@/kernel/datas";
import type { Obrigacao, StatusObrigacao } from "@/dominio/tipos";

/**
 * Regras de urgência de prazo fiscal.
 *
 * Fica separado dos componentes de propósito: "quando ficar vermelho" é regra
 * de negócio, não decisão de estilo. Se a contadora disser que 7 dias é tarde
 * demais, muda aqui e a interface inteira acompanha.
 */

/** Janela considerada para a contagem regressiva visual. */
export const JANELA_DIAS = 30;

/** A partir daqui o prazo é tratado como apertado. */
export const DIAS_URGENTE = 7;

export type TomPrazo = "ok" | "alerta" | "critico" | "neutro";

export function tomDoPrazo(obrigacao: Obrigacao): TomPrazo {
  if (obrigacao.status === "pago") return "neutro";
  if (obrigacao.status === "atrasado") return "critico";
  if (obrigacao.status === "vence-hoje") return "critico";
  return diasAte(obrigacao.vencimento) <= DIAS_URGENTE ? "alerta" : "ok";
}

/**
 * Fração de 0 a 1 para o anel de progresso.
 *
 * O anel representa **quanto do prazo já foi consumido**, não quanto falta:
 * anel cheio = acabou o tempo. Vencido preenche 100% e fica crítico, em vez
 * de estourar a faixa ou desenhar arco negativo.
 */
export function fracaoConsumida(obrigacao: Obrigacao): number {
  if (obrigacao.status === "pago") return 1;
  const dias = diasAte(obrigacao.vencimento);
  if (dias <= 0) return 1;
  if (dias >= JANELA_DIAS) return 0;
  return (JANELA_DIAS - dias) / JANELA_DIAS;
}

/** Texto curto do prazo, para o centro do anel. */
export function rotuloPrazo(obrigacao: Obrigacao): { valor: string; unidade: string } {
  if (obrigacao.status === "pago") return { valor: "OK", unidade: "pago" };
  const dias = diasAte(obrigacao.vencimento);
  if (dias < 0) {
    return { valor: String(Math.abs(dias)), unidade: dias === -1 ? "dia atrás" : "dias atrás" };
  }
  if (dias === 0) return { valor: "hoje", unidade: "vence" };
  return { valor: String(dias), unidade: dias === 1 ? "dia" : "dias" };
}

/** Frase completa, usada em leitor de tela e em tooltip. */
export function descricaoPrazo(obrigacao: Obrigacao): string {
  const dias = diasAte(obrigacao.vencimento);
  if (obrigacao.status === "pago") return "Quitado";
  if (dias < 0) return `Vencido há ${Math.abs(dias)} dia(s)`;
  if (dias === 0) return "Vence hoje";
  return `Vence em ${dias} dia(s)`;
}

const ROTULO_STATUS: Record<StatusObrigacao, string> = {
  pago: "Pago",
  "a-vencer": "A vencer",
  "vence-hoje": "Vence hoje",
  atrasado: "Atrasado",
};

export function rotuloStatus(status: StatusObrigacao) {
  return ROTULO_STATUS[status];
}
