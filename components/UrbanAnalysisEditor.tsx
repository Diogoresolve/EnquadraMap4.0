"use client";

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { MapPin, Loader2, PenLine, X, RotateCcw, FileText, Download, Upload, Link2, Check, Copy, ArrowLeft } from 'lucide-react';
import { useGoogleMapsLogic } from '../hooks/useGoogleMapsLogic';
import { MapDisplay, RouteData } from '../components/MapDisplay';
import { usePortariaChecks, CheckItem, Requirement } from '../hooks/usePortariaChecks';
import { AnalysisSidebar } from '../components/AnalysisSidebar';
import { PrintReport } from '../components/PrintReport';
import { OnboardingFlow, ProjetoInfo } from '../components/OnboardingFlow';
import Link from 'next/link';

const LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ["places", "drawing", "geometry"];

type LatLng = { lat: number; lng: number };
interface PlaceSuggestion { name: string; address: string; location: LatLng; }

export interface UrbanAnalysisEditorProps {
  initialVistoriaId?: string | null;
  initialProjetoInfo?: ProjetoInfo;
  initialOrigin?: LatLng | null;
  initialOriginAddress?: string;
  initialPolygonPath?: LatLng[];
  initialChecklist?: CheckItem[];
  initialCheckLocations?: Record<string, LatLng>;
  initialAppPhase?: 'onboarding' | 'editor';
}

export function UrbanAnalysisEditor(props: UrbanAnalysisEditorProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  const { geocodeAddress, getRoute } = useGoogleMapsLogic(isLoaded);
  const { checklist, updateCheckResult, updateManualStatus, resetChecklist, resetItem, loadChecklist } = usePortariaChecks();

  // ── Onboarding / Editor Phase state ────────────────────────────────────────
  const [appPhase, setAppPhase] = useState<'onboarding' | 'editor'>(props.initialAppPhase || 'onboarding');
  const [projetoInfo, setProjetoInfo] = useState<ProjetoInfo>(props.initialProjetoInfo || {
    nome: '', promotor: '', numUnidades: '', programa: '', numeroChamado: '',
  });

  // ── Terrain / Origin state ──────────────────────────────────────────────────
  const [origin, setOrigin]               = useState<LatLng | null>(props.initialOrigin || null);
  const [originAddress, setOriginAddress] = useState<string>(props.initialOriginAddress || '');
  const [mapCenter, setMapCenter]         = useState<LatLng>(props.initialOrigin || { lat: -14.235, lng: -51.925 });
  const [polygonPath, setPolygonPath]     = useState<LatLng[] | undefined>(props.initialPolygonPath);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isRemarkingTerrain, setIsRemarkingTerrain] = useState(false);

  // ── Routes / Check state ────────────────────────────────────────────────────
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null);

  // ── Vistoria ID / Save state ────────────────────────────────────────────────
  const [vistoriaId, setVistoriaId] = useState<string | null>(props.initialVistoriaId || null);
  const [isSaving, setIsSaving] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [vistoriaLink, setVistoriaLink] = useState('');

  // ── Other UI states ─────────────────────────────────────────────────────────
  const [textInput, setTextInput] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [checkLocations, setCheckLocations] = useState<Record<string, LatLng>>(props.initialCheckLocations || {});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Preload initial checklist if provided ──────────────────────────────────
  useEffect(() => {
    if (props.initialChecklist && props.initialChecklist.length > 0) {
      loadChecklist(props.initialChecklist);
    }
  }, [props.initialChecklist]);

  // ── Polygon center ──────────────────────────────────────────────────────────
  const polygonCenter = React.useMemo(() => {
    if (polygonPath && polygonPath.length > 0 && typeof window !== 'undefined' && window.google) {
      const bounds = new window.google.maps.LatLngBounds();
      polygonPath.forEach(p => bounds.extend(p));
      return { lat: bounds.getCenter().lat(), lng: bounds.getCenter().lng() };
    }
    return origin;
  }, [polygonPath, origin]);

  // ─── Onboarding complete → enter editor ──────────────────────────────────
  const handleOnboardingComplete = useCallback((
    projeto: ProjetoInfo,
    cityLoc: LatLng,
    _address: string
  ) => {
    setProjetoInfo(projeto);
    // Centra o mapa na cidade — origin fica null até o usuário clicar no mapa
    setMapCenter(cityLoc);
    setOrigin(null);
    setOriginAddress('');
    setAppPhase('editor');
  }, []);

  // ─── Gerar / copiar link de vistoria ─────────────────────────────────────
  const handleGerarLink = async () => {
    setIsSaving(true);
    try {
      const payload = {
        projetoInfo,
        checklist,
        polygonPath,
        checkLocations,
      };
      const endpoint = vistoriaId ? `/api/vistorias/${vistoriaId}` : '/api/vistorias';
      const method = vistoriaId ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: projetoInfo.nome,
          promotor: projetoInfo.promotor,
          numUnidades: projetoInfo.numUnidades,
          programa: projetoInfo.programa,
          numeroChamado: projetoInfo.numeroChamado,
          endereco: originAddress,
          latitude: origin?.lat ?? 0,
          longitude: origin?.lng ?? 0,
          payload,
        }),
      });

      const data = await res.json();

      if (method === 'POST' && data.id) {
        setVistoriaId(data.id);
        const fullLink = `${window.location.origin}/v/${data.id}`;
        setVistoriaLink(fullLink);
        setShowLinkModal(true);
      } else if (method === 'PATCH' && data.ok) {
        setVistoriaLink(`${window.location.origin}/v/${vistoriaId}`);
        setShowLinkModal(true);
      }
    } catch (e) {
      console.error('Erro ao salvar vistoria:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(vistoriaLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    });
  };

  // ─── Route Computation helpers ───────────────────────────────────────────
  const getOriginForCheck = useCallback((checkItem: CheckItem, targetLoc: LatLng): LatLng | null => {
    if (polygonPath && checkItem.measurementPoint === 'edge' && window.google) {
      let closestVertex = polygonPath[0];
      let minDist = Number.MAX_VALUE;
      polygonPath.forEach(vertex => {
        const dist = google.maps.geometry.spherical.computeDistanceBetween(
          new google.maps.LatLng(vertex), new google.maps.LatLng(targetLoc)
        );
        if (dist < minDist) { minDist = dist; closestVertex = vertex; }
      });
      return closestVertex;
    }
    return polygonCenter;
  }, [polygonPath, polygonCenter]);

  // Cores institucionais Caixa Econômica Federal
  // Azul: #005CA9  |  Laranja: #F07D00
  const getCheckColor = (item: CheckItem, result: { distanceValue: number; durationValue: number }, mode: 'WALKING' | 'TRANSIT') => {
    let isValid = false;
    if (mode === 'WALKING' && item.maxDistanceWalk && result.distanceValue <= item.maxDistanceWalk) isValid = true;
    if (mode === 'TRANSIT' && item.maxTimeTransport && (result.durationValue / 60) <= item.maxTimeTransport) isValid = true;
    if (!isValid) return "#F07D00"; // Laranja Caixa → reprovado
    // Distingue as rotas aprovadas: Azul Caixa (#005CA9) para Infraestrutura e Verde Esmeralda (#10b981) para Equipamentos/Comércio/Saúde/Educação
    return item.category === 'Infraestrutura' ? "#005CA9" : "#10b981";
  };

  const computeCheckRoute = useCallback(async (checkItem: CheckItem, targetLocation: LatLng, targetAddress: string) => {
    const startPoint = getOriginForCheck(checkItem, targetLocation);
    if (!startPoint) return;
    let routeResult = await getRoute(startPoint, targetLocation, 'WALKING');
    let modeUsed: 'WALKING' | 'TRANSIT' = 'WALKING';
    if (!routeResult) return;
    if (checkItem.maxDistanceWalk && routeResult.distanceValue > checkItem.maxDistanceWalk && checkItem.maxTimeTransport) {
      const transitResult = await getRoute(startPoint, targetLocation, 'TRANSIT');
      if (transitResult) {
        const transitPasses = (transitResult.durationValue / 60) <= checkItem.maxTimeTransport;
        if (transitPasses) { routeResult = transitResult; modeUsed = 'TRANSIT'; }
      }
    }
    const color = getCheckColor(checkItem, routeResult, modeUsed);
    const newRoute: RouteData = {
      id: `check-${checkItem.id}`,
      directions: routeResult.directions,
      color,
      targetAddress,
      label: checkItem.label,
      note: `${modeUsed === 'WALKING' ? 'A pé' : 'Ônibus'} • ${checkItem.measurementPoint === 'edge' ? 'Borda' : 'Centro'} • ${routeResult.distanceText}`,
      abbrev: checkItem.abbrev,
    };
    updateCheckResult(checkItem.id, {
      distanceValue: routeResult.distanceValue,
      durationValue: routeResult.durationValue,
      distanceText: routeResult.distanceText,
      durationText: routeResult.durationText,
      address: targetAddress,
      mode: modeUsed,
    });
    setRoutes(prev => [...prev.filter(r => r.id !== newRoute.id), newRoute]);
    setActiveRouteId(newRoute.id);
    setCheckLocations(prev => ({ ...prev, [checkItem.id]: targetLocation }));
    setActiveCheckId(null);
    setSuggestions([]);
    setTextInput('');
  }, [getOriginForCheck, getRoute, updateCheckResult]);

  // ─── Auto-restore routes on load ──────────────────────────────────────────
  useEffect(() => {
    if (appPhase === 'editor' && isLoaded && Object.keys(checkLocations).length > 0 && routes.length === 0) {
      checklist.forEach(item => {
        const loc = checkLocations[item.id];
        if (loc && item.address) {
          computeCheckRoute(item, loc, item.address);
        }
      });
    }
  }, [appPhase, isLoaded, checkLocations]);

  // ─── Places Nearby Search ─────────────────────────────────────────────────
  // Dispara buscas paralelas para cada termo em searchKeywords (ou searchKeyword)
  // Consolida resultados sem duplicatas (por place_id) e ordena por distância real
  const searchNearbyPlaces = useCallback(async (checkItem: CheckItem) => {
    if (!polygonCenter || !isLoaded || !window.google) return;
    const terms = checkItem.searchKeywords?.length
      ? checkItem.searchKeywords
      : checkItem.searchKeyword
        ? [checkItem.searchKeyword]
        : [];
    if (terms.length === 0) return;

    setIsSearching(true);
    setSuggestions([]);

    const service = new window.google.maps.places.PlacesService(document.createElement('div'));
    const origin = polygonCenter;

    // Helper: wrap nearbySearch in a Promise
    const searchTerm = (keyword: string): Promise<google.maps.places.PlaceResult[]> =>
      new Promise(resolve => {
        service.nearbySearch(
          {
            location: origin,
            keyword,
            rankBy: window.google.maps.places.RankBy.DISTANCE,
          },
          (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
              resolve(results);
            } else {
              resolve([]);
            }
          }
        );
      });

    try {
      // Fire all keyword searches in parallel
      const allResultArrays = await Promise.all(terms.map(searchTerm));

      // Flatten and deduplicate by place_id
      const seen = new Set<string>();
      const combined: google.maps.places.PlaceResult[] = [];
      for (const arr of allResultArrays) {
        for (const place of arr) {
          const key = place.place_id || `${place.geometry?.location?.lat()},${place.geometry?.location?.lng()}`;
          if (!seen.has(key) && place.geometry?.location) {
            seen.add(key);
            combined.push(place);
          }
        }
      }

      // Sort by straight-line distance from terrain center
      const originLatLng = new window.google.maps.LatLng(origin);
      combined.sort((a, b) => {
        const da = window.google.maps.geometry.spherical.computeDistanceBetween(
          originLatLng, a.geometry!.location!
        );
        const db = window.google.maps.geometry.spherical.computeDistanceBetween(
          originLatLng, b.geometry!.location!
        );
        return da - db;
      });

      // Take top 6 after dedup + sort
      const topResults: PlaceSuggestion[] = combined
        .slice(0, 6)
        .map(p => ({
          name: p.name || 'Local',
          address: p.formatted_address || p.vicinity || '',
          location: { lat: p.geometry!.location!.lat(), lng: p.geometry!.location!.lng() },
        }));

      setSuggestions(topResults);
    } finally {
      setIsSearching(false);
    }
  }, [polygonCenter, isLoaded, polygonPath, getOriginForCheck]);

  const handleItemSelect = useCallback((id: string) => {
    setActiveCheckId(id);
    setIsDrawingMode(false);
    setSuggestions([]);
    setTextInput('');
    const item = checklist.find(i => i.id === id);
    if (item) searchNearbyPlaces(item);
  }, [checklist, searchNearbyPlaces]);

  // ─── Clear Item ──────────────────────────────────────────────────
  // Reseta um item para 'pending', remove a rota do mapa e a checkLocation salva
  const handleClearItem = useCallback((id: string) => {
    resetItem(id);
    setRoutes(prev => prev.filter(r => r.id !== `check-${id}`));
    setCheckLocations(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setActiveCheckId(prev => (prev === id ? null : prev));
    setActiveRouteId(prev => (prev === `check-${id}` ? null : prev));
  }, [resetItem]);

  // ─── Manual Text Search ──────────────────────────────────────────────────
  const handleTextSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim()) return;
    if (activeCheckId) {
      const checkItem = checklist.find(i => i.id === activeCheckId);
      if (!checkItem || !origin) return;
      const result = await geocodeAddress(textInput);
      if (result) await computeCheckRoute(checkItem, result.location, result.formattedAddress);
    } else {
      const result = await geocodeAddress(textInput);
      if (result) {
        setOrigin(result.location);
        setOriginAddress(result.formattedAddress);
        setTextInput('');
        setRoutes([]);
        setCheckLocations({});
        resetChecklist();
      }
    }
  };

  // ─── Map Click Handlers ──────────────────────────────────────────────────
  const handleMapClick = async (lat: number, lng: number) => {
    if (!window.google) return;
    // Modo de remarcar terreno ou terreno ainda não definido
    if (isRemarkingTerrain || !origin) {
      if (activeCheckId && origin && !isRemarkingTerrain) {
        // Selecionar local para o item ativo — deixa o fluxo normal
      } else {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          const address = (status === 'OK' && results?.[0]) ? results[0].formatted_address : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setPendingLocation({ lat, lng, address });
        });
        return;
      }
    }
    // Clique normal — geocode para item ativo
    if (activeCheckId && origin) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        const address = (status === 'OK' && results?.[0]) ? results[0].formatted_address : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setPendingLocation({ lat, lng, address });
      });
    }
  };

  const confirmLocation = async (andDraw = false) => {
    if (!pendingLocation) return;
    const { lat, lng, address } = pendingLocation;
    if (isRemarkingTerrain) {
      // Remarcar centro do terreno
      setOrigin({ lat, lng });
      setOriginAddress(address);
      setIsRemarkingTerrain(false);
      setPendingLocation(null);
      return;
    }
    if (activeCheckId && origin && !isRemarkingTerrain) {
      const checkItem = checklist.find(i => i.id === activeCheckId);
      if (checkItem) await computeCheckRoute(checkItem, { lat, lng }, address);
    } else {
      setOrigin({ lat, lng });
      setOriginAddress(address);
      // Polígono automático na primeira definição do terreno
      setIsDrawingMode(andDraw || !polygonPath);
      if (!polygonPath) {
        setRoutes([]);
        setCheckLocations({});
        resetChecklist();
      }
    }
    setPendingLocation(null);
  };

  const handleRemarkTerrain = () => {
    setIsRemarkingTerrain(true);
    setActiveCheckId(null);
    setIsDrawingMode(false);
    setSuggestions([]);
  };

  const handleTogglePolygon = () => {
    setIsDrawingMode(prev => !prev);
    setIsRemarkingTerrain(false);
    setActiveCheckId(null);
  };

  // ─── Selection click / Polygon draw / reset ──────────────────────────────
  const handleSuggestionClick = async (suggestion: PlaceSuggestion) => {
    if (!activeCheckId) return;
    const checkItem = checklist.find(i => i.id === activeCheckId);
    if (!checkItem) return;
    await computeCheckRoute(checkItem, suggestion.location, `${suggestion.name} — ${suggestion.address}`);
  };

  const handlePolygonComplete = (path: LatLng[]) => {
    setPolygonPath(path);
    setIsDrawingMode(false);
    if (!origin) {
      const lat = path.reduce((s, p) => s + p.lat, 0) / path.length;
      const lng = path.reduce((s, p) => s + p.lng, 0) / path.length;
      setOrigin({ lat, lng });
      setOriginAddress("Polígono do Terreno");
    }
    setRoutes([]);
    setCheckLocations({});
    resetChecklist();
  };

  const clearAll = () => {
    setOrigin(null); setOriginAddress('');
    setPolygonPath(undefined); setIsDrawingMode(false);
    setRoutes([]); setActiveCheckId(null); setActiveRouteId(null);
    setSuggestions([]); setTextInput('');
    setCheckLocations({});
    setVistoriaId(null);
    resetChecklist();
    setAppPhase('onboarding');
  };

  const handleSaveProject = () => {
    const projectData = { projetoInfo, origin, originAddress, polygonPath, checklist, checkLocations };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EnquadraMap_${projetoInfo.nome || originAddress.substring(0, 15).trim()}.json`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.checklist) {
          setProjetoInfo(data.projetoInfo || { nome: '', promotor: '', numUnidades: '', programa: '', numeroChamado: '' });
          setOrigin(data.origin || null);
          setOriginAddress(data.originAddress || '');
          setPolygonPath(data.polygonPath || undefined);
          loadChecklist(data.checklist);
          setRoutes([]);
          setCheckLocations(data.checkLocations || {});
          setIsDrawingMode(false);
          setActiveCheckId(null);
          setActiveRouteId(null);
          setSuggestions([]);
          setTextInput('');
          setAppPhase('editor');
        }
      } catch { alert("Erro ao carregar projeto. Arquivo inválido."); }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Page Render ──────────────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-emerald-500/20" />
            <div className="absolute inset-0 rounded-full border-t-2 border-emerald-400 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold">EnquadraMap 4.0</p>
            <p className="text-gray-500 text-sm mt-1">Carregando mapa...</p>
          </div>
        </div>
      </div>
    );
  }

  if (appPhase === 'onboarding') {
    return (
      <main className="min-h-screen bg-[#030712]">
        <OnboardingFlow
          isMapLoaded={isLoaded}
          onComplete={handleOnboardingComplete}
        />
      </main>
    );
  }

  const activeCheckItem = checklist.find(i => i.id === activeCheckId);

  return (
    <main className="flex h-screen w-screen flex-col bg-gray-950 text-white font-sans overflow-hidden">
      
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="absolute top-0 left-0 z-10 w-full px-5 pt-4 pb-3 bg-gradient-to-b from-black/85 to-transparent pointer-events-none flex justify-between items-start gap-4">
        <div className="flex flex-col gap-2">
          {/* Logo + project details */}
          <div className="flex items-center gap-2.5">
            <Link href="/historico" className="pointer-events-auto p-1.5 rounded-lg bg-black/60 border border-white/8 hover:bg-black/80 hover:text-emerald-400 text-gray-400 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-black tracking-tight"
                style={{ background: "linear-gradient(135deg,#f1f5f9,#34d399,#22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                EnquadraMap
              </h1>
              <p className="text-[9px] text-gray-600 mt-0 leading-none">Portaria MCID 725/2023</p>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold">4.0</span>
            {vistoriaId && (
              <span className="px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/25 text-blue-400 text-[10px] font-bold">Edição</span>
            )}
          </div>

          {/* Project Details Box */}
          {projetoInfo.nome && (
            <div className="flex items-center gap-2 pointer-events-auto">
              <div className="bg-black/60 backdrop-blur rounded-lg border border-white/8 px-3 py-1.5">
                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold leading-none mb-0.5">Empreendimento</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">{projetoInfo.nome}</p>
                  {projetoInfo.programa && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                      {projetoInfo.programa}
                    </span>
                  )}
                  {projetoInfo.numeroChamado && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">
                      {projetoInfo.numeroChamado}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Upload/Load files */}
          <div className="pointer-events-auto">
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleLoadProject} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 font-bold px-2 py-1 bg-white/5 rounded-lg border border-white/8 hover:bg-white/10 transition-all">
              <Upload className="w-3 h-3" /> Carregar JSON
            </button>
          </div>
        </div>

        {/* Action controls */}
        {originAddress && (
          <div className="pointer-events-auto bg-black/65 backdrop-blur rounded-xl border border-white/10 px-4 py-2.5 flex items-center gap-2.5">
            <div className="mr-1">
              <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wide">Terreno</p>
              <p className="text-sm font-semibold text-white max-w-[180px] truncate">{originAddress}</p>
            </div>

            <button onClick={handleSaveProject} title="Salvar Projeto Local"
              className="p-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/35 text-emerald-400 transition-all flex items-center gap-1.5 text-xs font-bold">
              <Download className="w-3.5 h-3.5" /> JSON
            </button>

            <button onClick={() => setIsDrawingMode(v => !v)}
              className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all
                ${isDrawingMode ? 'bg-yellow-500 text-black animate-pulse' : 'bg-white/8 hover:bg-white/16 text-gray-300'}`}>
              <PenLine className="w-3.5 h-3.5" />
              {isDrawingMode ? 'Desenhando...' : 'Polígono'}
            </button>

            <button onClick={() => setShowReport(true)} title="Gerar relatório PDF"
              className="p-2 rounded-lg bg-blue-500/15 hover:bg-blue-500/35 text-blue-400 transition-all flex items-center gap-1.5 text-xs font-bold">
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>

            <button onClick={handleGerarLink} disabled={isSaving}
              className="p-2 rounded-lg bg-purple-500/15 hover:bg-purple-500/35 text-purple-400 transition-all flex items-center gap-1.5 text-xs font-bold disabled:opacity-50">
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              {vistoriaId ? 'Atualizar' : 'Gerar Link'}
            </button>

            <button onClick={clearAll} title="Recomeçar"
              className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-500 transition-all">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </header>

      {/* Map display */}
      <div className="relative flex-1 w-full h-full">
        <MapDisplay
          center={mapCenter}
          origin={origin}
          target={null}
          routes={routes}
          activeRouteId={activeRouteId}
          polygonPath={polygonPath}
          isDrawingMode={isDrawingMode}
          onMapClick={handleMapClick}
          onRouteClick={setActiveRouteId}
          onPolygonComplete={handlePolygonComplete}
        />

        {/* Places and inputs overlay */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 pointer-events-auto space-y-2">
          {activeCheckId && activeCheckItem ? (
            <div className="bg-black/85 backdrop-blur-xl border border-blue-500/40 rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 p-3 border-b border-white/10">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <MapPin className="text-white w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-blue-400 text-[10px] font-bold uppercase tracking-wide">Localizando</p>
                  <p className="text-white text-sm font-semibold leading-tight">{activeCheckItem.label}</p>
                </div>
                <p className="text-[10px] text-gray-500 shrink-0">
                  {activeCheckItem.maxDistanceWalk ? `${activeCheckItem.maxDistanceWalk / 1000}km` : ''}
                  {activeCheckItem.maxTimeTransport ? ` / ${activeCheckItem.maxTimeTransport}min ônibus` : ''}
                </p>
                <button onClick={() => { setActiveCheckId(null); setSuggestions([]); }} className="text-gray-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isSearching && (
                <div className="flex items-center gap-2 px-4 py-3 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Buscando mais próximos...
                </div>
              )}

              {suggestions.length > 0 && !isSearching && (
                <div className="px-2 pt-1 pb-2 space-y-1">
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest px-2 pt-1">Sugestões próximas</p>
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => handleSuggestionClick(s)}
                      className="suggestion-card w-full text-left flex flex-col group"
                      style={{ animationDelay: `${i * 0.07}s` }}>
                      <span className="text-white text-sm font-semibold group-hover:text-blue-300">{s.name}</span>
                      <span className="text-gray-500 text-xs truncate">{s.address}</span>
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleTextSubmit} className="flex items-center gap-2 px-3 pb-3">
                <input autoFocus value={textInput} onChange={e => setTextInput(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                  placeholder="Ou busque manualmente..." />
                <button type="submit" className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-sm font-bold transition-all">
                  Ir
                </button>
              </form>
            </div>
          ) : !origin ? (
            <div className="bg-gray-900/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
              <form onSubmit={handleTextSubmit} className="flex items-center gap-2 p-3">
                <input value={textInput} onChange={e => setTextInput(e.target.value)}
                  className="flex-1 bg-transparent text-lg text-white px-2 focus:outline-none placeholder-gray-600"
                  placeholder="Digite o endereço do terreno..." />
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white text-sm font-bold">Confirmar</button>
              </form>
              <div className="px-4 pb-3 flex items-center gap-2 text-gray-600 text-xs">
                <span>ou</span>
                <button onClick={() => setIsDrawingMode(true)} className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold">
                  <PenLine className="w-3.5 h-3.5" /> Desenhar polígono no mapa
                </button>
              </div>
            </div>
          ) : null}

          {isDrawingMode && !activeCheckId && (
            <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <PenLine className="w-4 h-4 text-yellow-400 animate-pulse" />
                <p className="text-yellow-300 text-sm font-semibold">Clique no mapa para desenhar o polígono do terreno</p>
              </div>
              <button onClick={() => setIsDrawingMode(false)} className="text-yellow-600 hover:text-yellow-300 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Location selector popup */}
        {pendingLocation && (
          <div className="absolute inset-x-0 top-28 mx-auto z-50 w-80 bg-black/90 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-2xl flex flex-col gap-3 pointer-events-auto">
            {!origin ? (
              <>
                <h3 className="text-white font-bold text-sm">Definir centro do terreno?</h3>
                <p className="text-gray-300 text-xs leading-relaxed">{pendingLocation.address}</p>
                <button onClick={() => confirmLocation(true)} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
                  <PenLine className="w-4 h-4" /> Confirmar + Desenhar Polígono
                </button>
                <button onClick={() => confirmLocation(false)} className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-xs transition-all">
                  Confirmar apenas como centro
                </button>
                <button onClick={() => setPendingLocation(null)} className="text-gray-600 hover:text-gray-400 text-xs text-center">Cancelar</button>
              </>
            ) : (
              <>
                <h3 className="text-white font-bold text-sm">Confirmar local?</h3>
                <p className="text-gray-300 text-xs leading-relaxed">{pendingLocation.address}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPendingLocation(null)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm font-bold transition-all">Cancelar</button>
                  <button onClick={() => confirmLocation(false)} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-bold transition-all">Confirmar</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Checklist Sidebar */}
        {origin && (
          <div className="absolute top-20 right-0 h-[calc(100vh-80px)] pointer-events-auto">
          <AnalysisSidebar
              checklist={checklist}
              activeItemId={activeCheckId}
              onItemSelect={handleItemSelect}
              onManualUpdate={updateManualStatus}
              onClearItem={handleClearItem}
              isProcessing={isSearching}
              originAddress={originAddress}
              polygonPath={polygonPath}
              isDrawingMode={isDrawingMode}
              isRemarkingTerrain={isRemarkingTerrain}
              onRemarkTerrain={handleRemarkTerrain}
              onTogglePolygon={handleTogglePolygon}
            />
          </div>
        )}
      </div>

      {/* Share Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass-card glass-card-glow w-full max-w-md mx-4 p-7 animate-fade-up">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {vistoriaId ? 'Análise Atualizada' : 'Link de Vistoria Criado'}
                </h2>
                <p className="text-xs text-gray-500">Compartilhe com o vistoriador em campo</p>
              </div>
            </div>

            <div className="bg-white/4 border border-white/8 rounded-xl p-4 mb-4 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Empreendimento</span>
                <span className="text-white font-medium">{projetoInfo.nome}</span>
              </div>
              {projetoInfo.numeroChamado && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Nº Chamado</span>
                  <span className="text-amber-400 font-bold">{projetoInfo.numeroChamado}</span>
                </div>
              )}
              {projetoInfo.programa && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Programa</span>
                  <span className="text-emerald-400">{projetoInfo.programa}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mb-5">
              <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 truncate font-mono">
                {vistoriaLink}
              </div>
              <button onClick={copyLink}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5
                  ${linkCopied ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/30' : 'bg-white/8 hover:bg-white/16 text-gray-300 border border-white/10'}`}>
                {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {linkCopied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            <button onClick={() => setShowLinkModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-gray-400 text-sm font-medium transition-all">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* PDF Report render */}
      {showReport && (
        <PrintReport
          checklist={checklist}
          terrainAddress={originAddress}
          origin={origin}
          checkLocations={checkLocations}
          routes={routes}
          polygonPath={polygonPath}
          onClose={() => setShowReport(false)}
        />
      )}
    </main>
  );
}
