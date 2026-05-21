"use client";

import React, { useState, useEffect } from "react";
import {
  Search, Calendar, MapPin, Building, User, ChevronRight,
  Loader2, AlertCircle, Plus, FileText, ArrowLeft, RefreshCw,
  Building2, Landmark, Smartphone
} from "lucide-react";
import Link from "next/link";

interface VistoriaItem {
  id: string;
  nome: string;
  promotor: string;
  num_unidades: string;
  programa: string;
  numero_chamado: string;
  endereco: string;
  latitude: number;
  longitude: number;
  criado_em: string;
  atualizado_em: string;
}

export default function HistoricoVistorias() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vistorias, setVistorias] = useState<VistoriaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Fetch vistorias from API
  const fetchVistorias = async (chamadoFilter = "") => {
    try {
      const url = chamadoFilter
        ? `/api/vistorias?chamado=${encodeURIComponent(chamadoFilter)}`
        : "/api/vistorias";
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Erro ao buscar histórico do servidor.");
      }
      const data = await res.json();
      setVistorias(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVistorias();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchVistorias(searchQuery);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchVistorias(searchQuery);
  };

  // Format date utility
  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-20 font-sans">
      {/* Dynamic background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #34d399 0%, transparent 70%)" }} />
        <div className="absolute top-1/3 -left-40 w-96 h-96 rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur-md border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 rounded-lg bg-white/5 border border-white/8 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Histórico de Vistorias
            </h1>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Painel do Escritório • Compliance</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="p-2.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-40"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/"
            className="btn-cta py-2 px-4 flex items-center gap-1.5 text-xs text-white"
          >
            <Plus className="w-4 h-4" />
            Nova Análise
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 mt-8 space-y-6">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por Nº do Chamado ou Nome do Empreendimento..."
              className="w-full bg-white/4 border border-white/8 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:bg-white/6 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shrink-0"
          >
            Buscar
          </button>
        </form>

        {/* List Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
            <p className="text-gray-400 text-xs">Carregando histórico de vistorias...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-1">Falha na Conexão</h3>
            <p className="text-gray-400 text-xs max-w-sm mx-auto">{error}</p>
          </div>
        ) : vistorias.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-2xl py-16 text-center text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold text-gray-400">Nenhuma vistoria encontrada</p>
            <p className="text-xs text-gray-600 mt-1 max-w-xs mx-auto">
              Inicie uma nova análise ou altere os termos de busca para encontrar registros cadastrados.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {vistorias.map((v) => (
              <div
                key={v.id}
                className="glass-card p-5 border border-white/5 bg-gray-900/30 hover:bg-gray-900/50 transition-all rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="space-y-2.5 min-w-0 flex-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                      {v.nome || "Empreendimento Sem Nome"}
                    </h3>
                    {v.programa && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold shrink-0">
                        {v.programa}
                      </span>
                    )}
                    {v.numero_chamado && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold shrink-0">
                        {v.numero_chamado}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 leading-snug flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span className="truncate">{v.endereco}</span>
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-600" />
                      Criado em: {formatDate(v.criado_em)}
                    </span>
                    {v.atualizado_em !== v.criado_em && (
                      <span className="flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 text-gray-600" />
                        Atualizado: {formatDate(v.atualizado_em)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 border-t border-white/5 pt-3 md:border-t-0 md:pt-0">
                  <Link
                    href={`/v/${v.id}`}
                    target="_blank"
                    className="px-3.5 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 text-purple-400 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Vistoria
                  </Link>

                  <Link
                    href={`/edit/${v.id}`}
                    className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/8 hover:bg-white/12 hover:border-emerald-500/30 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    Editar ✏️
                  </Link>

                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/3 text-gray-600 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-all ml-1">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
