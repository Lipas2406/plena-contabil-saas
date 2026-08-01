import { EmConstrucao } from "@/componentes/painel/em-construcao";

export const metadata = { title: "Configurações — Plena Contábil" };

export default function Pagina() {
  return (
    <EmConstrucao
      titulo="Configurações"
      descricao="Dados da empresa, responsáveis e preferências de aviso."
      vaiTer={[
        "Correção dos dados da sua empresa sem precisar pedir para a Plena",
        "Quem mais da empresa pode entrar e o que cada um enxerga",
        "Escolha de como quer ser avisado: aqui, por e-mail ou pelos dois",
        "Troca de senha e saída da conta",
      ]}
      hoje="Se algum dado da sua empresa estiver errado ou faltando, avise a Plena e ela corrige. O que está faltando no seu cadastro aparece listado no Dashboard, no cartão 'Cadastro'."
    />
  );
}
