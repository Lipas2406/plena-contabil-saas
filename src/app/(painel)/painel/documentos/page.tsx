import { EmConstrucao } from "@/componentes/painel/em-construcao";

export const metadata = { title: "Documentos — Plena Contábil" };

export default function Pagina() {
  return (
    <EmConstrucao
      titulo="Documentos"
      descricao="Envie notas e recibos, e acompanhe a classificação."
      vaiTer={[
        "Envio arrastando o arquivo para a tela, ou pelo celular",
        "Classificação automática do tipo de documento, com o valor identificado",
        "Aviso quando a Plena precisar que você confirme alguma coisa",
        "Histórico do que já foi enviado e lançado",
      ]}
      hoje="Continue mandando as notas e recibos como já faz, por WhatsApp ou e-mail, direto para a Plena. Nada muda para você até esta tela existir, e nada se perde no caminho."
    />
  );
}
