import { convertToModelMessages, type UIMessage } from "ai";
import { variavelOpcional } from "@/kernel/ia/agente";
import { getAssistenteContabil } from "@/dominio/ia/assistente";

/** VoltAgent depende de APIs de Node (OpenTelemetry), então não roda no Edge. */
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
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
