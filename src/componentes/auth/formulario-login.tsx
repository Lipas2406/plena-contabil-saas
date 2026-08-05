"use client";

import { useActionState } from "react";
import { KeyRound, Mail } from "lucide-react";
import { Botao } from "@/kernel/ui/botao";
import { Campo } from "@/kernel/ui/campo";
import { entrar, type EstadoLogin } from "@/dominio/acoes/auth";

/**
 * Formulário de entrada.
 *
 * `useActionState` cuida dos três estados sem estado manual: a ação roda no
 * servidor, o erro volta como valor de retorno, e `pendente` desabilita o botão
 * enquanto ela corre.
 *
 * O botão desabilitado importa mais aqui do que em outras telas: o hash de
 * senha leva cerca de 140ms de propósito, e sem o bloqueio dá tempo de clicar
 * duas vezes e abrir duas sessões.
 */
export function FormularioLogin() {
  const [estado, acao, pendente] = useActionState<EstadoLogin | undefined, FormData>(
    entrar,
    undefined,
  );

  return (
    <form action={acao} className="space-y-4">
      <Campo
        name="email"
        type="email"
        rotulo="E-mail"
        placeholder="voce@exemplo.com"
        autoComplete="username"
        // O campo volta preenchido quando a senha erra: reescrever o e-mail a
        // cada tentativa é atrito puro, ainda mais no celular.
        defaultValue={estado?.email}
        required
        autoFocus
        iconeEsquerda={<Mail className="size-4" />}
      />

      <Campo
        name="senha"
        type="password"
        rotulo="Senha"
        placeholder="••••••••"
        autoComplete="current-password"
        required
        iconeEsquerda={<KeyRound className="size-4" />}
        // O erro fica no campo de senha, e não solto no topo: é onde a pessoa
        // está olhando quando erra.
        erro={estado?.erro}
      />

      <Botao
        type="submit"
        variante="primario"
        tamanho="lg"
        className="w-full"
        disabled={pendente}
      >
        {pendente ? "Entrando..." : "Entrar"}
      </Botao>
    </form>
  );
}
