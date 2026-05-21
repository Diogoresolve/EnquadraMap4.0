"use client";

import React, { useState, useEffect, use } from "react";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { UrbanAnalysisEditor } from "../../../components/UrbanAnalysisEditor";
import { CheckItem } from "../../../hooks/usePortariaChecks";

interface ProjetoInfo {
  nome: string;
  promotor: string;
  numUnidades: string;
  programa: string;
  numeroChamado: string;
}

interface VistoriaData {
  id: string;
  nome: string;
  promotor: string;
  num_unidades: string;
  programa: string;
  numero_chamado: string;
  endereco: string;
  latitude: number;
  longitude: number;
  payload: {
    projetoInfo?: ProjetoInfo;
    checklist?: CheckItem[];
    polygonPath?: { lat: number; lng: number }[];
    checkLocations?: Record<string, { lat: number; lng: number }>;
  };
}

export default function EditVistoriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vistoria, setVistoria] = useState<VistoriaData | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/vistorias/${id}`);
        if (!res.ok) {
          throw new Error("Não foi possível encontrar esta análise no banco de dados.");
        }
        const data = await res.json();
        setVistoria(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro interno");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
          <div className="text-center">
            <p className="text-white font-semibold">Carregando análise...</p>
            <p className="text-gray-500 text-sm mt-1">Carregando dados salvos</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !vistoria) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-950 text-white px-6 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4 animate-bounce" />
        <h2 className="text-lg font-bold text-white mb-2">Erro de Carregamento</h2>
        <p className="text-gray-400 text-sm max-w-xs mb-6">{error || "Vistoria inválida."}</p>
        <div className="flex gap-3">
          <Link href="/historico" className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-white text-xs font-semibold">
            Voltar para Histórico
          </Link>
          <Link href="/" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white text-xs font-semibold">
            Ir para Página Inicial
          </Link>
        </div>
      </div>
    );
  }

  // Pre-configured info to pass to the Editor
  const projetoInfo: ProjetoInfo = {
    nome: vistoria.nome || "",
    promotor: vistoria.promotor || "",
    numUnidades: vistoria.num_unidades || "",
    programa: vistoria.programa || "",
    numeroChamado: vistoria.numero_chamado || "",
  };

  const origin = {
    lat: vistoria.latitude,
    lng: vistoria.longitude,
  };

  return (
    <UrbanAnalysisEditor
      initialVistoriaId={vistoria.id}
      initialProjetoInfo={projetoInfo}
      initialOrigin={origin}
      initialOriginAddress={vistoria.endereco}
      initialPolygonPath={vistoria.payload?.polygonPath}
      initialChecklist={vistoria.payload?.checklist}
      initialCheckLocations={vistoria.payload?.checkLocations}
      initialAppPhase="editor" // Directly skip onboarding into map editor
    />
  );
}
