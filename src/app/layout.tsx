import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { ProvedorToast } from "@/kernel/ui/toast";
import "./globals.css";

// `variable` em vez de `className`: as fontes viram custom properties, o
// globals.css as consome dentro do @theme, e aí `font-display` e `font-sans`
// funcionam como utilitário Tailwind normal em qualquer componente.
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--fonte-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--fonte-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Plena Contábil — Painel",
  description:
    "Plataforma da Plena Contábil: obrigações fiscais, documentos e atendimento em um só lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* O provedor de toast fica na raiz para qualquer tela poder notificar. */}
        <ProvedorToast>{children}</ProvedorToast>
      </body>
    </html>
  );
}
