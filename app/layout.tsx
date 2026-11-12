import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gentileza circula · Correio de Gentilezas",
  description: "Uma gentileza. Um e-mail. Um dia melhor. Envie palavras de carinho aos colegas do CRO-MG.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
