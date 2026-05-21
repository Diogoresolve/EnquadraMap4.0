import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EnquadraMap 4.0 — Análise de Inserção Urbana",
  description:
    "Plataforma de análise de inserção urbana para empreendimentos habitacionais de interesse social. Portaria MCID Nº 725/2023.",
  keywords: ["MCMV", "inserção urbana", "portaria 725", "MCID", "habitação"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
