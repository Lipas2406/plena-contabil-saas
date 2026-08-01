import { EmConstrucao } from "@/componentes/painel/em-construcao";

export const metadata = { title: "Configurações — Plena Contábil" };

export default function Pagina() {
  return (
    <EmConstrucao
      titulo="Configurações"
      descricao="Dados da empresa, responsáveis e preferências de notificação."
    />
  );
}
