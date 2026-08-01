import { EmConstrucao } from "@/componentes/painel/em-construcao";

export const metadata = { title: "Mensagens — Plena Contábil" };

export default function Pagina() {
  return (
    <EmConstrucao
      titulo="Mensagens"
      descricao="Converse com a Plena sem perder o histórico."
      vaiTer={[
        "Conversa ligada ao seu processo, sem misturar assunto",
        "Anexo de documento direto na conversa",
        "Histórico que não some, diferente do WhatsApp",
        "Aviso quando a Plena responder",
      ]}
      hoje="Fale com a Plena pelo WhatsApp ou por e-mail, como já faz. O que existe hoje aqui no painel é o acompanhamento das etapas, que mostra em que pé está cada trabalho sem você precisar perguntar."
    />
  );
}
