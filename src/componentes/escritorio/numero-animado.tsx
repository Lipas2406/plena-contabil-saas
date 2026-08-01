"use client";

import { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";

/**
 * Contagem progressiva de 0 até o valor.
 *
 * Anima um `MotionValue`, e não estado do React. A diferença importa: estado
 * dispararia um render por quadro (60 por segundo, por indicador), enquanto o
 * MotionValue escreve direto no nó de texto. Também é o que satisfaz a regra
 * de lint contra `setState` dentro de efeito, que existe justamente para
 * impedir esse tipo de render em cascata.
 *
 * Três cuidados que a versão ingênua não tem:
 *
 * 1. Só dispara quando o número entra na tela. Senão a animação acontece com o
 *    card fora do viewport e a pessoa encontra o valor final já parado.
 * 2. Respeita `prefers-reduced-motion`, indo direto ao valor final. Número
 *    correndo é exatamente o movimento que incomoda quem tem sensibilidade
 *    vestibular.
 * 3. Começa em `valor`, não em zero, e só volta a zero para animar. Assim o
 *    HTML do servidor já traz o número certo, e quem lê por leitor de tela ou
 *    está sem JS não recebe um zero falso.
 */
export function NumeroAnimado({
  valor,
  duracao = 0.9,
}: {
  valor: number;
  duracao?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const visivel = useInView(ref, { once: true, margin: "-40px" });
  const reduzir = useReducedMotion();

  const bruto = useMotionValue(valor);
  const arredondado = useTransform(bruto, (v) => Math.round(v));

  useEffect(() => {
    if (!visivel) return;

    if (reduzir) {
      bruto.jump(valor);
      return;
    }

    bruto.jump(0);
    const controle = animate(bruto, valor, { duration: duracao, ease: "easeOut" });
    return () => controle.stop();
  }, [visivel, reduzir, valor, duracao, bruto]);

  return (
    <span ref={ref} aria-label={String(valor)}>
      <motion.span aria-hidden>{arredondado}</motion.span>
    </span>
  );
}
