import { EmConstrucao } from "@/componentes/painel/em-construcao";

export const metadata = { title: "Obrigações — Plena Contábil" };

export default function Pagina() {
  return (
    <EmConstrucao
      titulo="Obrigações"
      descricao="Todas as guias e tributos da sua empresa, com histórico e comprovantes."
    />
  );
}
