"use client";
// CAMPO CHAMADO: numeroChamado é armazenado no banco e no payload para futura
// reconciliação/anexação com o aplicativo interno de compliance do parecer final.

import React, { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Building2, MapPin, Users, ChevronRight, ArrowLeft,
  Search, Loader2, CheckCircle2, Sparkles, Link2,
  RotateCcw, AlertCircle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProjetoInfo {
  nome: string;
  promotor: string;
  numUnidades: string;
  programa: string;
  /** Nº do chamado interno — chave de reconciliação com o sistema de compliance */
  numeroChamado: string;
}

export type OnboardingStep = "hero" | "projeto" | "localizacao";

interface AddressResult {
  lat: number;
  lng: number;
  address: string;
}

interface OnboardingFlowProps {
  isMapLoaded: boolean;
  onComplete: (
    projeto: ProjetoInfo,
    origin: { lat: number; lng: number },
    address: string
  ) => void;
  savedProjects?: Array<{ id: string; nome: string; endereco: string }>;
  onLoadSaved?: (id: string) => void;
}

// ─── Animated Background Orbs ────────────────────────────────────────────────

function BackgroundOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {/* Orb 1 — Emerald, top-left */}
      <div
        className="animate-orb1 absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full opacity-[0.13]"
        style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }}
      />
      {/* Orb 2 — Cyan, bottom-right */}
      <div
        className="animate-orb2 absolute -bottom-48 -right-24 w-[680px] h-[680px] rounded-full opacity-[0.10]"
        style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }}
      />
      {/* Orb 3 — Indigo, center */}
      <div
        className="animate-orb3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-[0.07]"
        style={{ background: "radial-gradient(circle, #818cf8 0%, transparent 70%)" }}
      />
      {/* Fine grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: OnboardingStep }) {
  const steps: OnboardingStep[] = ["hero", "projeto", "localizacao"];
  const idx = steps.indexOf(step);
  return (
    <div className="flex items-center gap-1.5" aria-label="Progresso do cadastro">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`step-dot ${i === idx ? "active" : i < idx ? "done" : ""}`}
        />
      ))}
    </div>
  );
}

// ─── Radar Pulse ──────────────────────────────────────────────────────────────

function RadarPulse() {
  return (
    <div className="relative flex items-center justify-center w-10 h-10">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="radar-ring absolute inset-0 rounded-full border border-emerald-400 opacity-0"
          style={{ animationDelay: `${i * 0.6}s` }}
        />
      ))}
      <MapPin className="w-4 h-4 text-emerald-400 relative z-10" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OnboardingFlow({
  isMapLoaded,
  onComplete,
  savedProjects = [],
  onLoadSaved,
}: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>("hero");
  const [slideDir, setSlideDir] = useState<"right" | "left">("right");

  const [projeto, setProjeto] = useState<ProjetoInfo>({
    nome: "",
    promotor: "",
    numUnidades: "",
    programa: "",
    numeroChamado: "",
  });
  const [projetoErrors, setProjetoErrors] = useState<{ nome?: string }>({});

  const [addressInput, setAddressInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [addressResult, setAddressResult] = useState<AddressResult | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  const addressInputRef = useRef<HTMLInputElement>(null);

  // ── Navegação entre steps ────────────────────────────────────────────────

  const goTo = useCallback((next: OnboardingStep, dir: "right" | "left" = "right") => {
    setSlideDir(dir);
    setStep(next);
  }, []);

  useEffect(() => {
    if (step === "localizacao") {
      setTimeout(() => addressInputRef.current?.focus(), 200);
    }
  }, [step]);

  // ── Submit do passo Projeto ──────────────────────────────────────────────

  const handleProjetoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projeto.nome.trim()) {
      setProjetoErrors({ nome: "Nome do empreendimento é obrigatório." });
      return;
    }
    setProjetoErrors({});
    goTo("localizacao", "right");
  };

  // ── Busca de endereço ────────────────────────────────────────────────────

  const searchAddress = useCallback(async () => {
    if (!addressInput.trim()) return;
    if (!isMapLoaded || !window.google) {
      setAddressError("Aguarde o mapa carregar...");
      return;
    }
    setIsSearching(true);
    setAddressResult(null);
    setAddressError(null);

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: addressInput, region: "BR" }, (results, status) => {
      setIsSearching(false);
      if (status === "OK" && results?.[0]) {
        const loc = results[0].geometry.location;
        setAddressResult({
          lat: loc.lat(),
          lng: loc.lng(),
          address: results[0].formatted_address,
        });
      } else {
        setAddressError("Endereço não encontrado. Tente ser mais específico.");
      }
    });
  }, [addressInput, isMapLoaded]);

  const handleAddressKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); searchAddress(); }
  };

  // ── Confirmar e entrar na análise ────────────────────────────────────────

  const handleConfirm = () => {
    if (!addressResult) return;
    onComplete(projeto, { lat: addressResult.lat, lng: addressResult.lng }, addressResult.address);
  };

  // ── Renders por step ─────────────────────────────────────────────────────

  const slideClass = slideDir === "right" ? "animate-slide-right" : "animate-slide-left";

  // ═══════════════════════════════════════════════════════════════════════════
  // HERO
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === "hero") {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <BackgroundOrbs />

        {/* Logo */}
        <div className="animate-fade-up relative z-10 mb-2" style={{ animationDelay: "0.05s" }}>
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="text-[10px] font-bold tracking-[0.25em] text-emerald-400/70 uppercase">
              Portaria MCID Nº 725/2023
            </span>
          </div>
          <div className="flex items-end justify-center gap-3 mb-4">
            <h1
              className="text-6xl sm:text-7xl font-black tracking-tight"
              style={{
                background: "linear-gradient(135deg, #f1f5f9 0%, #34d399 50%, #22d3ee 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              EnquadraMap
            </h1>
            <span className="mb-2 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-lg font-bold">
              4.0
            </span>
          </div>
          <p className="text-gray-400 text-lg sm:text-xl font-light max-w-md mx-auto leading-relaxed">
            Análise de Inserção Urbana para{" "}
            <span className="text-gray-200 font-medium">Habitação de Interesse Social</span>
          </p>
        </div>

        {/* CTA Principal */}
        <div
          className="animate-fade-up relative z-10 flex flex-col items-center gap-4 mt-12 w-full max-w-sm"
          style={{ animationDelay: "0.2s" }}
        >
          <button
            id="btn-nova-analise"
            onClick={() => goTo("projeto", "right")}
            className="btn-cta w-full py-4 px-8 flex items-center justify-center gap-3 text-base"
          >
            <Sparkles className="w-5 h-5" />
            Iniciar Nova Análise
            <ChevronRight className="w-5 h-5" />
          </button>

          <Link
            href="/historico"
            className="w-full py-3 px-8 flex items-center justify-center gap-2 text-sm font-bold bg-white/5 border border-white/8 hover:bg-white/10 hover:border-emerald-500/30 text-gray-300 hover:text-white rounded-xl transition-all"
          >
            📋 Ver Histórico de Vistorias
          </Link>

          {savedProjects.length > 0 && onLoadSaved && (
            <button
              onClick={() => onLoadSaved(savedProjects[0].id)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors mt-1"
            >
              <Link2 className="w-4 h-4" />
              Retomar análise salva
            </button>
          )}
        </div>

        {/* Feature pills */}
        <div
          className="animate-fade-up relative z-10 flex flex-wrap justify-center gap-2 mt-14 max-w-lg"
          style={{ animationDelay: "0.35s" }}
        >
          {[
            "13 requisitos da Portaria",
            "Rotas a pé + ônibus",
            "Upload de fotos em campo",
            "Histórico de vistorias",
            "Link de vistoria",
            "Exportar PDF",
          ].map((f) => (
            <span
              key={f}
              className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/8 text-gray-400"
            >
              {f}
            </span>
          ))}
        </div>

        {/* Bottom decoration */}
        <div
          className="animate-fade-in absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 opacity-30"
          style={{ animationDelay: "0.6s" }}
        >
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-white/40" />
          <span className="text-[10px] tracking-widest text-white/40 uppercase">scroll</span>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJETO
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === "projeto") {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen px-4">
        <BackgroundOrbs />

        <div className={`${slideClass} relative z-10 w-full max-w-lg`}>
          {/* Top nav */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => goTo("hero", "left")}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <StepIndicator step="projeto" />
            <span className="text-xs text-gray-600">1 de 2</span>
          </div>

          {/* Card */}
          <div className="glass-card glass-card-glow p-8">
            <div className="flex items-center gap-3 mb-7">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Dados do Projeto</h2>
                <p className="text-xs text-gray-500 mt-0.5">Identificação do empreendimento</p>
              </div>
            </div>

            <form onSubmit={handleProjetoSubmit} className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 tracking-wide uppercase">
                  Nome do Empreendimento <span className="text-emerald-500">*</span>
                </label>
                <input
                  id="input-nome-empreendimento"
                  autoFocus
                  type="text"
                  className="input-premium"
                  placeholder="Ex: Residencial Novo Horizonte"
                  value={projeto.nome}
                  onChange={(e) => setProjeto((p) => ({ ...p, nome: e.target.value }))}
                />
                {projetoErrors.nome && (
                  <p className="flex items-center gap-1 mt-1.5 text-xs text-red-400">
                    <AlertCircle className="w-3 h-3" />
                    {projetoErrors.nome}
                  </p>
                )}
              </div>

              {/* Proponente */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 tracking-wide uppercase">
                  Proponente / Empresa
                </label>
                <input
                  id="input-promotor"
                  type="text"
                  className="input-premium"
                  placeholder="Ex: Construtora Exemplo Ltda"
                  value={projeto.promotor}
                  onChange={(e) => setProjeto((p) => ({ ...p, promotor: e.target.value }))}
                />
              </div>

              {/* Nº do Chamado Interno */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 tracking-wide uppercase">
                  Nº do Chamado Interno
                </label>
                <div className="relative">
                  <input
                    id="input-numero-chamado"
                    type="text"
                    className="input-premium pr-28"
                    placeholder="Ex: CHM-2024-0381"
                    value={projeto.numeroChamado}
                    onChange={(e) => setProjeto((p) => ({ ...p, numeroChamado: e.target.value }))}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 whitespace-nowrap">
                    Compliance
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-gray-600 flex items-center gap-1">
                  <span className="opacity-60">🔗</span>
                  Usado para vincular ao sistema de parecer final
                </p>
              </div>

              {/* Unidades + Programa */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 tracking-wide uppercase">
                    Nº de Unidades
                  </label>
                  <input
                    id="input-num-unidades"
                    type="number"
                    min="1"
                    className="input-premium"
                    placeholder="Ex: 96"
                    value={projeto.numUnidades}
                    onChange={(e) => setProjeto((p) => ({ ...p, numUnidades: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 tracking-wide uppercase">
                    Programa
                  </label>
                  <select
                    id="select-programa"
                    className="input-premium select-premium"
                    value={projeto.programa}
                    onChange={(e) => setProjeto((p) => ({ ...p, programa: e.target.value }))}
                  >
                    <option value="">Selecionar</option>
                    <option value="MCMV Faixa 1">MCMV Faixa 1</option>
                    <option value="MCMV Faixa 2">MCMV Faixa 2</option>
                    <option value="MCMV Faixa 3">MCMV Faixa 3</option>
                    <option value="FAR">FAR</option>
                    <option value="FDS">FDS</option>
                    <option value="FNHIS">FNHIS</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <button
                id="btn-continuar-localizacao"
                type="submit"
                className="btn-cta w-full py-3.5 flex items-center justify-center gap-2 mt-2"
              >
                Continuar para Localização
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Hint */}
          <p className="text-center text-xs text-gray-600 mt-4">
            Apenas o nome é obrigatório. Os demais campos enriquecem o relatório PDF.
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCALIZAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4">
      <BackgroundOrbs />

      <div className={`${slideClass} relative z-10 w-full max-w-lg`}>
        {/* Top nav */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => goTo("projeto", "left")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <StepIndicator step="localizacao" />
          <span className="text-xs text-gray-600">2 de 2</span>
        </div>

        {/* Card */}
        <div className="glass-card glass-card-glow p-8">
          {/* Header com nome do projeto */}
          <div className="flex items-start gap-3 mb-7">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white">Localização do Terreno</h2>
              <div className="flex items-center gap-2 mt-1">
                <Building2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-400 font-medium truncate">{projeto.nome}</p>
                {projeto.programa && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shrink-0">
                    {projeto.programa}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Input de endereço */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 tracking-wide uppercase">
              Endereço Completo do Terreno
            </label>
            <div className="flex gap-2">
              <input
                id="input-endereco-terreno"
                ref={addressInputRef}
                type="text"
                className="input-premium flex-1"
                placeholder="Rua, número, bairro, cidade – UF"
                value={addressInput}
                onChange={(e) => {
                  setAddressInput(e.target.value);
                  setAddressResult(null);
                  setAddressError(null);
                }}
                onKeyDown={handleAddressKeyDown}
              />
              <button
                id="btn-buscar-endereco"
                type="button"
                onClick={searchAddress}
                disabled={isSearching || !addressInput.trim()}
                className="px-4 py-2 rounded-xl bg-white/8 border border-white/10 text-gray-300 hover:bg-white/14 hover:text-white disabled:opacity-40 transition-all shrink-0"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Buscando... */}
            {isSearching && (
              <div className="flex items-center gap-3 px-1">
                <RadarPulse />
                <span className="text-sm text-gray-400">Localizando endereço...</span>
              </div>
            )}

            {/* Erro */}
            {addressError && (
              <div className="flex items-center gap-2 text-sm text-red-400 px-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {addressError}
              </div>
            )}

            {/* Resultado confirmado */}
            {addressResult && (
              <div className="animate-fade-up rounded-xl bg-emerald-500/8 border border-emerald-500/25 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-emerald-400 mb-0.5 uppercase tracking-wide">
                      Terreno localizado
                    </p>
                    <p className="text-sm text-gray-200 leading-snug">{addressResult.address}</p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {addressResult.lat.toFixed(6)}, {addressResult.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botão confirmar */}
          <button
            id="btn-iniciar-analise"
            onClick={handleConfirm}
            disabled={!addressResult}
            className="btn-cta w-full py-4 mt-6 flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none"
          >
            <Sparkles className="w-5 h-5" />
            Iniciar Análise
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Hint */}
          {!addressResult && (
            <p className="text-center text-xs text-gray-600 mt-3">
              Digite o endereço e pressione Enter ou clique em 🔍
            </p>
          )}
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {[
            { icon: "🗺️", text: "Polígono do terreno desenhável no mapa" },
            { icon: "📐", text: "13 critérios da Portaria 725/2023" },
          ].map((item) => (
            <div
              key={item.text}
              className="glass-card p-3 flex items-center gap-2.5"
            >
              <span className="text-lg">{item.icon}</span>
              <p className="text-xs text-gray-500 leading-snug">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
