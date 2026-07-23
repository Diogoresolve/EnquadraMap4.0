"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled client-side exception:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5 animate-pulse">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>

      <h1 className="text-xl font-bold mb-2">Ops! Ocorreu um erro na aplicação</h1>
      <p className="text-gray-400 text-xs max-w-md mb-6 leading-relaxed">
        {error?.message || "Ocorreu um erro inesperado no navegador. Tente recarregar a página."}
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold transition-all flex items-center gap-2 text-white"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Tentar Novamente
        </button>
        <Link
          href="/"
          className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-300 transition-all flex items-center gap-2"
        >
          <Home className="w-3.5 h-3.5" />
          Início
        </Link>
      </div>
    </div>
  );
}
