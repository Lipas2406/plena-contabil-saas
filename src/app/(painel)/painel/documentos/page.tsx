import { EmConstrucao } from "@/componentes/painel/em-construcao";

export const metadata = { title: "Documentos — Plena Contábil" };

export default function Pagina() {
  return (
    <EmConstrucao
      titulo="Documentos"
      descricao="Envie notas e recibos por arrastar e soltar, e acompanhe a classificação."
    />
  );
}
