import { convertToModelMessages, type UIMessage } from "ai";
import { variavelOpcional } from "@/kernel/ia/agente";
import { getAssistenteContabil } from "@/dominio/ia/assistente";
import { sessaoAtual } from "@/dominio/auth/sessao";

/** VoltAgent depende de APIs de Node (OpenTelemetry), então não roda no Edge. */
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  // Esta é a única rota de API do projeto, e até 10/08/2026 ela era pública.
  // Enquanto não havia chave em produção o 503 abaixo barrava tudo por
  // acidente; com a chave configurada, uma rota aberta é a conta da OpenAI
  // exposta na internet: sem login e sem limite, qualquer POST queima crédito,
  // e o `maxDuration` de 30s torna cada chamada cara.
  //
  // 401 em JSON, e não `exigirSessao()`: aquela função faz `redirect("/entrar")`,
  // que devolveria HTML para um cliente que espera um stream de mensagens.
  //
  // A checagem vem ANTES da chave de propósito: quem não está logado não
  // precisa saber se o assistente está configurado.
  const usuario = await sessaoAtual();
  if (!usuario) {
    return Response.json(
      { erro: "Sessão necessária para usar o assistente." },
      { status: 401 },
    );
  }

  // 503 explícito em vez de 500 genérico: sem a chave o painel inteiro
  // funciona e só o chat cai, e isso precisa ficar claro na tela.
  if (!variavelOpcional("OPENAI_API_KEY")) {
    return Response.json(
      {
        erro: "OPENAI_API_KEY não configurada. Defina em .env.local para habilitar o assistente.",
      },
      { status: 503 },
    );
  }

  let messages: UIMessage[];
  try {
    ({ messages } = await req.json());
    if (!Array.isArray(messages)) throw new Error("formato inválido");
  } catch {
    return Response.json(
      {
        erro: "Corpo da requisição inválido. Esperado { messages: UIMessage[] }.",
      },
      { status: 400 },
    );
  }

  // No AI SDK 6 essa conversão é assíncrona (pode baixar anexo remoto).
  const stream = await getAssistenteContabil().streamText(
    await convertToModelMessages(messages),
  );

  return stream.toUIMessageStreamResponse();
}
