"use client";

import React, { useState, useEffect, use, useRef } from "react";
import {
  Camera, CheckCircle2, XCircle, AlertCircle, Loader2, ArrowLeft,
  MapPin, Check, Save, User, Building, Landmark, Image as ImageIcon,
  Compass, ChevronDown, ChevronUp, FileText, Smartphone, Calendar, Download
} from "lucide-react";
import Link from "next/link";

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface VistoriaFoto {
  id: string;
  item_id: string;
  blob_url: string;
  blob_pathname: string;
  criado_em: string;
}

interface ProjetoInfo {
  nome: string;
  promotor: string;
  numUnidades: string;
  programa: string;
  numeroChamado: string;
}

interface CheckItem {
  id: string;
  category: string;
  label: string;
  type: "search" | "manual";
  measurementPoint: "center" | "edge";
  maxDistanceWalk?: number;
  maxTimeTransport?: number;
  description: string;
  abbrev: string;
  // State from payload
  status: "pending" | "success" | "fail" | "warning";
  currentDistance?: string;
  currentDuration?: string;
  address?: string;
  modeUsed?: "WALKING" | "TRANSIT";
  notes?: string; // Observações de campo
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
    checkLocations?: Record<string, { lat: number; lng: number }>;
  };
  criado_em: string;
  atualizado_em: string;
  fotos: VistoriaFoto[];
}

const REQUIREMENTS_DEFAULT: Array<{
  id: string;
  category: string;
  label: string;
  type: "search" | "manual";
  maxDistanceWalk?: number;
  description: string;
}> = [
  { id: "infra_drainage", category: "Infraestrutura", label: "Drenagem Pluvial", type: "manual", description: "Boca de lobo / Galeria pluvial existente no entorno imediato" },
  { id: "infra_sewage", category: "Infraestrutura", label: "Rede de Esgoto", type: "manual", description: "Poço de visita / Rede coletora de esgoto no entorno imediato" },
  { id: "infra_water", category: "Infraestrutura", label: "Rede de Água", type: "manual", description: "Ponto de abastecimento / Hidrômetro próximo no entorno imediato" },
  { id: "infra_paving", category: "Infraestrutura", label: "Pavimentação", type: "manual", maxDistanceWalk: 500, description: "Via pavimentada no entorno imediato — marque o ponto na via" },
  { id: "infra_lighting", category: "Infraestrutura", label: "Iluminação Pública", type: "manual", maxDistanceWalk: 500, description: "Ponto de iluminação pública no entorno imediato — marque o ponto na rede" },
  { id: "school_creche", category: "Educação", label: "Educação Infantil (Creche/Pré)", type: "search", description: "Creche ou Pré-escola pública (0-5 anos) a até 1.0km" },
  { id: "school_fund1", category: "Educação", label: "Ens. Fund. Ciclo I (6-10 anos)", type: "search", description: "Escola Ens. Fundamental I pública a até 1.5km" },
  { id: "school_fund2", category: "Educação", label: "Ens. Fund. Ciclo II (11-14 anos)", type: "search", description: "Escola Ens. Fundamental II pública a até 1.5km" },
  { id: "school_medio", category: "Educação", label: "Ensino Médio (15-17 anos)", type: "search", description: "Escola de Ensino Médio pública a até 1.5km" },
  { id: "ubs", category: "Saúde", label: "UBS / Saúde da Família", type: "search", description: "Unidade Básica de Saúde ou UPA a até 1.0km" },
  { id: "cras", category: "Assistência Social", label: "CRAS", type: "search", description: "Centro de Referência de Assistência Social a até 2.0km" },
  { id: "commerce_daily", category: "Comércio e Serviços", label: "Comércio Cotidiano", type: "search", description: "Padaria, farmácia, mercadinho ou mercearia a até 1.0km" },
  { id: "commerce_occasional", category: "Comércio e Serviços", label: "Comércio Eventual", type: "search", description: "Supermercado, banco, lotérica ou correios a até 1.5km" },
  { id: "bus_stop", category: "Mobilidade", label: "Ponto de Ônibus / Terminal", type: "search", description: "Ponto de embarque de transporte coletivo a até 500m" }
];

export default function VistoriaPortal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vistoria, setVistoria] = useState<VistoriaData | null>(null);
  const [checklist, setChecklist] = useState<CheckItem[]>([]);
  const [fotos, setFotos] = useState<VistoriaFoto[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch Vistoria Data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/vistorias/${id}`);
        if (!res.ok) {
          throw new Error("Não foi possível carregar a vistoria. ID inexistente ou erro no servidor.");
        }
        const data: VistoriaData = await res.json();
        setVistoria(data);
        setFotos(data.fotos || []);

        // Reconstruct checklist merging default requirements with database payload
        const dbChecklist = data.payload?.checklist || [];
        const mergedChecklist: CheckItem[] = REQUIREMENTS_DEFAULT.map((req) => {
          const matched = dbChecklist.find((dbItem) => dbItem.id === req.id);
          return {
            ...req,
            measurementPoint: (matched?.measurementPoint || "edge") as "center" | "edge",
            abbrev: matched?.abbrev || req.id.substring(0, 3).toUpperCase(),
            status: matched?.status || "pending",
            currentDistance: matched?.currentDistance,
            currentDuration: matched?.currentDuration,
            address: matched?.address,
            modeUsed: matched?.modeUsed,
            notes: matched?.notes || "",
          };
        });

        setChecklist(mergedChecklist);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  // Toggle item expanded state
  const toggleExpand = (itemId: string) => {
    setExpandedItem(expandedItem === itemId ? null : itemId);
  };

  // Status handler (Override status on mobile portal)
  const handleStatusChange = (itemId: string, newStatus: "success" | "fail" | "pending") => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status: newStatus } : item))
    );
  };

  // Notes/Observations handler
  const handleNotesChange = (itemId: string, text: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, notes: text } : item))
    );
  };

  // Helper to compress images client-side before uploading (prevents Vercel 4.5MB payload limit)
  const compressImage = (file: File, maxW = 1200, maxH = 1200, quality = 0.85): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        return resolve(file); // Don't compress non-images
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxW) {
              height = Math.round((height * maxW) / width);
              width = maxW;
            }
          } else {
            if (height > maxH) {
              width = Math.round((width * maxH) / height);
              height = maxH;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(file);
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Photo Upload Handler (capture="environment")
  const handlePhotoUpload = async (itemId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = event.target.files?.[0];
    if (!rawFile) return;

    setUploadingItem(itemId);

    try {
      // Compress the image before uploading
      const compressedBlob = await compressImage(rawFile).catch((err) => {
        console.error("Compression failed, using raw file:", err);
        return rawFile;
      });

      const fileToUpload = new File([compressedBlob], rawFile.name, {
        type: "image/jpeg",
        lastModified: Date.now()
      });

      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("item_id", itemId);

      const res = await fetch(`/api/vistorias/${id}/fotos`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Falha no upload da foto.");
      }

      const newFoto: VistoriaFoto = await res.json();
      setFotos((prev) => [...prev, newFoto]);

      // Expand to show newly uploaded photo
      setExpandedItem(itemId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao enviar foto");
    } finally {
      setUploadingItem(null);
    }
  };

  // Helper to force photo download in mobile and desktop browsers (saving to gallery)
  const handleDownloadPhoto = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const localUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = localUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(localUrl);
    } catch (err) {
      console.error("Erro ao baixar foto:", err);
      // Fallback: open in new tab
      window.open(url, "_blank");
    }
  };

  // Helper to generate a clean, structured filename for compliance archiving
  const getPhotoDownloadName = (item: CheckItem, fotoId: string) => {
    const cleanStr = (s: string) => {
      return s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")
        .replace(/__+/g, "_")
        .replace(/^_+|_+$/g, "");
    };

    const abbrev = item.abbrev || item.id.substring(0, 3).toUpperCase();
    const itemLabel = cleanStr(item.label);
    const projName = cleanStr(vistoria?.nome || "VISTORIA");
    const shortId = fotoId.substring(0, 8);
    
    return `${abbrev}_${itemLabel}_${projName}_${shortId}.jpg`;
  };

  // Save changes to Server
  const handleSave = async () => {
    if (!vistoria) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      // Merge checklist update back into payload
      const updatedPayload = {
        ...vistoria.payload,
        checklist,
      };

      const res = await fetch(`/api/vistorias/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payload: updatedPayload,
        }),
      });

      if (!res.ok) {
        throw new Error("Não foi possível salvar os dados da vistoria.");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar vistoria");
    } finally {
      setSaving(false);
    }
  };

  // Filter photos by item
  const getFotosForItem = (itemId: string) => {
    return fotos.filter((f) => f.item_id === itemId);
  };

  // Loading indicator
  if (loading) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-gray-950 text-white px-6">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
        <p className="text-gray-400 text-sm">Carregando portal de vistoria...</p>
      </div>
    );
  }

  // Error screen
  if (error || !vistoria) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-gray-950 text-white px-6 text-center">
        <XCircle className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
        <h2 className="text-lg font-bold text-white mb-2">Erro de Carregamento</h2>
        <p className="text-gray-400 text-sm max-w-xs mb-6">{error || "Vistoria inválida."}</p>
        <Link href="/" className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-white text-xs font-semibold">
          Ir para Página Inicial
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-28 font-sans">
      {/* Background soft gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #a855f7 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-gray-900/90 backdrop-blur-md border-b border-white/8 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Smartphone className="w-5 h-5 text-emerald-400" />
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Portal do Vistoriador</h1>
            <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Vistoria de Campo • ID: {vistoria.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {vistoria.numero_chamado && (
            <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400">
              {vistoria.numero_chamado}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-5 space-y-4">
        {/* Project Profile Card */}
        <div className="glass-card p-5 border border-white/8 rounded-2xl relative overflow-hidden bg-gray-900/50">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">Empreendimento</span>
              <h2 className="text-lg font-black text-white mt-1 leading-tight">{vistoria.nome || "Não Nomeado"}</h2>
            </div>
            {vistoria.programa && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold shrink-0">
                {vistoria.programa}
              </span>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3 text-xs">
            {vistoria.promotor && (
              <div className="flex items-center gap-2 text-gray-400">
                <User className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <span className="truncate">{vistoria.promotor}</span>
              </div>
            )}
            {vistoria.num_unidades && (
              <div className="flex items-center gap-2 text-gray-400">
                <Building className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <span>{vistoria.num_unidades} u.h.</span>
              </div>
            )}
          </div>

          {vistoria.endereco && (
            <div className="mt-3.5 flex items-start gap-2 text-xs text-gray-400 bg-white/4 rounded-xl p-3 border border-white/5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <p className="leading-snug">{vistoria.endereco}</p>
            </div>
          )}
        </div>

        {/* Instructions banner */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3 items-start">
          <Compass className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-gray-300 leading-relaxed">
            <p className="font-semibold text-white mb-0.5">Instruções de Vistoria</p>
            Verifique as condições reais do local para cada item do checklist abaixo. Você pode registrar fotos e incluir observações diretamente do celular.
          </div>
        </div>

        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 pt-2 px-1">Checklist de Itens ({checklist.length})</h3>

        {/* Checklist Accordion */}
        <div className="space-y-2.5">
          {checklist.map((item) => {
            const itemFotos = getFotosForItem(item.id);
            const isExpanded = expandedItem === item.id;
            const statusStyle =
              item.status === "success"
                ? { bg: "bg-emerald-500/10 border-emerald-500/25", text: "text-emerald-400", dot: "bg-emerald-400", label: "Atende" }
                : item.status === "fail"
                ? { bg: "bg-red-500/10 border-red-500/25", text: "text-red-400", dot: "bg-red-400", label: "Não Atende" }
                : { bg: "bg-gray-800 border-white/6", text: "text-gray-400", dot: "bg-gray-500", label: "Pendente" };

            return (
              <div
                key={item.id}
                className={`glass-card rounded-xl border overflow-hidden transition-all duration-200 ${
                  isExpanded ? "border-emerald-500/30 bg-gray-900/60 shadow-lg" : "border-white/5 bg-gray-900/30 hover:bg-gray-900/40"
                }`}
              >
                {/* Header click bar */}
                <div
                  onClick={() => toggleExpand(item.id)}
                  className="px-4 py-3.5 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusStyle.dot}`} />
                    <div className="min-w-0">
                      <span className="text-[9px] uppercase tracking-wider font-semibold text-gray-500 block leading-none mb-1">
                        {item.category}
                      </span>
                      <h4 className="text-sm font-semibold text-white truncate leading-tight pr-4">
                        {item.label}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Tiny overlapping photo thumbnails stack */}
                    {itemFotos.length > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="flex -space-x-1.5 mr-1">
                          {itemFotos.slice(0, 3).map((foto, idx) => (
                            <div key={foto.id} className="w-5 h-5 rounded-full border border-gray-950 overflow-hidden shrink-0 shadow-md" style={{ zIndex: 10 - idx }}>
                              <img src={foto.blob_url} alt="Mini preview" className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {itemFotos.length > 3 && (
                            <div className="w-5 h-5 rounded-full bg-gray-800 border border-gray-950 flex items-center justify-center text-[7px] font-bold text-gray-400 z-0">
                              +{itemFotos.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Badge status */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${statusStyle.bg} ${statusStyle.text}`}>
                      {statusStyle.label}
                    </span>

                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="px-4 pb-5 pt-1 border-t border-white/5 bg-black/10 space-y-4 animate-fade-up">
                    <p className="text-xs text-gray-400 leading-relaxed">{item.description}</p>

                    {/* Georoute metadata from desk analysis */}
                    {(item.currentDistance || item.address) && (
                      <div className="bg-white/4 border border-white/5 rounded-xl p-3 text-xs space-y-1.5">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Cálculo de Escritório</p>
                        {item.address && (
                          <p className="text-gray-300 font-medium leading-snug flex items-start gap-1">
                            <span className="shrink-0 mt-0.5">📍</span> {item.address}
                          </p>
                        )}
                        {(item.currentDistance || item.currentDuration) && (
                          <p className="text-emerald-400 font-semibold">
                            📏 Rota: {item.currentDistance} {item.currentDuration ? `(${item.currentDuration})` : ""}
                            {item.modeUsed && ` — ${item.modeUsed === "WALKING" ? "A pé" : "Ônibus"}`}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Field inspector overrides */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Resultado em Campo</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, "success")}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border
                            ${item.status === "success" 
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" 
                              : "bg-white/4 text-gray-400 border-transparent hover:bg-white/8"}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Atende
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, "fail")}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border
                            ${item.status === "fail" 
                              ? "bg-red-500/20 text-red-400 border-red-500/40" 
                              : "bg-white/4 text-gray-400 border-transparent hover:bg-white/8"}`}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Não Atende
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, "pending")}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border
                            ${item.status === "pending" 
                              ? "bg-gray-800 text-gray-300 border-white/10" 
                              : "bg-white/4 text-gray-400 border-transparent hover:bg-white/8"}`}
                        >
                          <AlertCircle className="w-3.5 h-3.5" /> Pendente
                        </button>
                      </div>
                    </div>

                    {/* Observation Field Notes */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Observações de Vistoria</label>
                      <textarea
                        value={item.notes || ""}
                        onChange={(e) => handleNotesChange(item.id, e.target.value)}
                        placeholder="Descreva as condições reais encontradas..."
                        rows={2}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>

                    {/* Photo upload / native camera triggers */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Registro Fotográfico</label>
                      
                      {/* Photo Gallery if photos exist */}
                      {itemFotos.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                          {itemFotos.map((foto) => (
                            <div key={foto.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-gray-800 group/photo">
                              <img
                                src={foto.blob_url}
                                alt="Foto vistoria"
                                className="w-full h-full object-cover animate-fade-in"
                              />
                              {/* Download overlay button (Save to phone gallery) */}
                              <button
                                type="button"
                                onClick={() => handleDownloadPhoto(foto.blob_url, getPhotoDownloadName(item, foto.id))}
                                className="absolute bottom-1 right-1 p-1 bg-black/75 hover:bg-black rounded-lg text-emerald-400 border border-white/10 shadow-md transition-all active:scale-95 flex items-center justify-center"
                                title="Salvar na galeria do celular"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Camera Button */}
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          id={`camera-${item.id}`}
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(item.id, e)}
                          disabled={uploadingItem === item.id}
                        />
                        <label
                          htmlFor={`camera-${item.id}`}
                          className={`w-full py-3.5 px-4 bg-white/6 hover:bg-white/12 border border-dashed border-white/15 hover:border-emerald-500/40 rounded-xl cursor-pointer flex items-center justify-center gap-2 text-xs font-bold text-gray-300 transition-all
                            ${uploadingItem === item.id ? "opacity-50 pointer-events-none" : ""}`}
                        >
                          {uploadingItem === item.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                              <span>Enviando foto...</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-4 h-4 text-emerald-400" />
                              <span>Tirar Foto (Câmera Nativa)</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating Bottom Save Action Bar */}
      <footer className="fixed bottom-0 inset-x-0 bg-gray-900/90 backdrop-blur-md border-t border-white/8 p-4 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="text-left shrink-0">
            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block">Status Geral</span>
            <p className="text-xs text-gray-300 font-semibold">
              {checklist.filter((i) => i.status !== "pending").length} de {checklist.length} preenchidos
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 btn-cta py-3.5 px-5 flex items-center justify-center gap-2 text-sm disabled:opacity-40"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gravando no Servidor...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Salvo com Sucesso!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Notas de Campo</span>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
