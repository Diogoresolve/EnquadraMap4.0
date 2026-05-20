"use client";

import React, { useCallback, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { MapPin, Loader2, PenLine, X, RotateCcw, FileText } from 'lucide-react';
import { useGoogleMapsLogic } from '../hooks/useGoogleMapsLogic';
import { MapDisplay, RouteData } from '../components/MapDisplay';
import { usePortariaChecks, CheckItem } from '../hooks/usePortariaChecks';
import { AnalysisSidebar } from '../components/AnalysisSidebar';
import { PrintReport } from '../components/PrintReport';

const LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ["places", "drawing", "geometry"];

// ─── Filtro de escolas públicas ───────────────────────────────────────────────
// IDs dos itens de educação que devem exibir somente escolas/creches públicas
const EDUCATION_PUBLIC_IDS = new Set(['school_creche', 'school_fund1', 'school_fund2']);

// Siglas e padrões de nome de escolas públicas brasileiras
const PUBLIC_SCHOOL_PATTERNS = [
  'EMEI', 'EMEF', 'EMEB', 'EMEIF', 'EMEJA',
  'CMEI', 'CEI', 'CEU', 'CEJA',
  'E.E.', 'E. E.',
  'ESCOLA ESTADUAL', 'ESCOLA MUNICIPAL',
  'CRECHE MUNICIPAL', 'CRECHE PÚBLICA', 'CRECHE PUBLICA',
  'ESCOLA PÚBLICA', 'ESCOLA PUBLICA',
  'MUNICIPAL DE EDUCA', 'ESTADUAL DE EDUCA',
];

const isPublicSchool = (name: string): boolean => {
  const upper = name.toUpperCase();
  return PUBLIC_SCHOOL_PATTERNS.some(p => upper.includes(p));
};

// ─── Types ───────────────────────────────────────────────────────────────────
type LatLng = { lat: number; lng: number };

interface PlaceSuggestion {
  name: string;
  address: string;
  location: LatLng;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Home() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  const { geocodeAddress, getRoute } = useGoogleMapsLogic(isLoaded);
  const { checklist, updateCheckResult, updateManualStatus, resetChecklist } = usePortariaChecks();

  // ── Terrain / Origin state ──────────────────────────────────────────────
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [originAddress, setOriginAddress] = useState<string>('');
  const [polygonPath, setPolygonPath] = useState<LatLng[] | undefined>(undefined);
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  // ── Routes / check state ───────────────────────────────────────────────
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null);

  // ── Compute true center of the polygon ───────────────────────────────────
  const polygonCenter = React.useMemo(() => {
    if (polygonPath && polygonPath.length > 0 && typeof window !== 'undefined' && window.google) {
      const bounds = new window.google.maps.LatLngBounds();
      polygonPath.forEach(p => bounds.extend(p));
      return { lat: bounds.getCenter().lat(), lng: bounds.getCenter().lng() };
    }
    return origin;
  }, [polygonPath, origin]);

  // ── Text input ──────────────────────────────────────────────────────────
  const [textInput, setTextInput] = useState('');

  // ── Places auto-suggestions ─────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // ── Confirmation modal ──────────────────────────────────────────────────
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);

  // ── Print Report ──────────────────────────────────────────────────
  const [showReport, setShowReport] = useState(false);
  // Coordenadas de cada item verificado (para exportar KML)
  const [checkLocations, setCheckLocations] = useState<Record<string, LatLng>>({});

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /** Find the polygon vertex closest to a target location (for 'edge' measurement) */
  const getOriginForCheck = useCallback((checkItem: CheckItem, targetLoc: LatLng): LatLng | null => {
    if (polygonPath && checkItem.measurementPoint === 'edge' && window.google) {
      let closestVertex = polygonPath[0];
      let minDist = Number.MAX_VALUE;
      polygonPath.forEach(vertex => {
        const dist = google.maps.geometry.spherical.computeDistanceBetween(
          new google.maps.LatLng(vertex),
          new google.maps.LatLng(targetLoc)
        );
        if (dist < minDist) { minDist = dist; closestVertex = vertex; }
      });
      return closestVertex;
    }
    return polygonCenter;
  }, [polygonPath, polygonCenter]);

  /** Color the route line based on compliance result */
  const getCheckColor = (item: CheckItem, result: { distanceValue: number; durationValue: number }, mode: 'WALKING' | 'TRANSIT') => {
    let isValid = false;
    if (mode === 'WALKING' && item.maxDistanceWalk && result.distanceValue <= item.maxDistanceWalk) isValid = true;
    if (mode === 'TRANSIT' && item.maxTimeTransport && (result.durationValue / 60) <= item.maxTimeTransport) isValid = true;

    if (!isValid) return "#ef4444";
    return item.category === 'Infraestrutura' ? "#0ea5e9" : "#10b981";
  };

  /** Calculate and store the route for a check item */
  const computeCheckRoute = useCallback(async (
    checkItem: CheckItem,
    targetLocation: LatLng,
    targetAddress: string
  ) => {
    const startPoint = getOriginForCheck(checkItem, targetLocation);
    if (!startPoint) return;

    let routeResult = await getRoute(startPoint, targetLocation, 'WALKING');
    let modeUsed: 'WALKING' | 'TRANSIT' = 'WALKING';

    if (!routeResult) return;

    // Auto-fallback to Transit if walking exceeds limit and transit is allowed
    if (checkItem.maxDistanceWalk && routeResult.distanceValue > checkItem.maxDistanceWalk && checkItem.maxTimeTransport) {
      const transitResult = await getRoute(startPoint, targetLocation, 'TRANSIT');
      if (transitResult) { routeResult = transitResult; modeUsed = 'TRANSIT'; }
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

    setRoutes(prev => {
      const filtered = prev.filter(r => r.id !== newRoute.id);
      return [...filtered, newRoute];
    });
    setActiveRouteId(newRoute.id);
    setCheckLocations(prev => ({ ...prev, [checkItem.id]: targetLocation }));
    setActiveCheckId(null);
    setSuggestions([]);
    setTextInput('');
  }, [getOriginForCheck, getRoute, updateCheckResult]);

  // ─── Places Auto-Search ───────────────────────────────────────────────────

  /** Search nearby places when user selects a check item */
  const searchNearbyPlaces = useCallback(async (checkItem: CheckItem) => {
    if (!polygonCenter || !isLoaded || !window.google) return;
    if (!checkItem.searchKeyword) return;

    setIsSearching(true);
    setSuggestions([]);

    const service = new window.google.maps.places.PlacesService(document.createElement('div'));
    const request: google.maps.places.TextSearchRequest = {
      query: checkItem.searchKeyword,
      location: polygonCenter,
      radius: checkItem.maxDistanceWalk || 2000,
    };

    // Timeout de segurança: garante que o spinner sempre some
    const searchTimeout = setTimeout(() => setIsSearching(false), 10_000);

    service.textSearch(request, (results, status) => {
      clearTimeout(searchTimeout);
      setIsSearching(false);

      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        // Para itens de educação, filtra para mostrar somente escolas/creches públicas
        let filtered = results;
        if (EDUCATION_PUBLIC_IDS.has(checkItem.id)) {
          const publicOnly = results.filter(p => isPublicSchool(p.name || ''));
          if (publicOnly.length > 0) filtered = publicOnly;
        }

        // Guarda contra resultados sem geometria (evita crash)
        const top3: PlaceSuggestion[] = filtered
          .filter(p => p.geometry?.location != null)
          .slice(0, 3)
          .map(p => ({
            name: p.name || 'Local',
            address: p.formatted_address || p.vicinity || '',
            location: {
              lat: p.geometry!.location!.lat(),
              lng: p.geometry!.location!.lng(),
            }
          }));
        setSuggestions(top3);
      }
    });
  }, [origin, isLoaded, polygonPath, getOriginForCheck]);

  /** Called when user clicks an item in AnalysisSidebar */
  const handleItemSelect = useCallback((id: string) => {
    setActiveCheckId(id);
    setIsDrawingMode(false);
    setSuggestions([]);
    setTextInput('');
    const item = checklist.find(i => i.id === id);
    if (item) searchNearbyPlaces(item);
  }, [checklist, searchNearbyPlaces]);

  // ─── Text Search ──────────────────────────────────────────────────────────

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

  // ─── Map Click Handler ────────────────────────────────────────────────────

  const handleMapClick = async (lat: number, lng: number) => {
    if (!window.google) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      const address = (status === 'OK' && results?.[0]) ? results[0].formatted_address : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setPendingLocation({ lat, lng, address });
    });
  };

  const confirmLocation = async (andDraw = false) => {
    if (!pendingLocation) return;
    const { lat, lng, address } = pendingLocation;

    if (activeCheckId && origin) {
      const checkItem = checklist.find(i => i.id === activeCheckId);
      if (checkItem) await computeCheckRoute(checkItem, { lat, lng }, address);
    } else {
      setOrigin({ lat, lng });
      setOriginAddress(address);
      if (andDraw) setIsDrawingMode(true);
      setRoutes([]);
      setCheckLocations({});
      resetChecklist();
    }
    setPendingLocation(null);
  };

  // ─── Suggestion Click ─────────────────────────────────────────────────────

  const handleSuggestionClick = async (suggestion: PlaceSuggestion) => {
    if (!activeCheckId) return;
    const checkItem = checklist.find(i => i.id === activeCheckId);
    if (!checkItem) return;
    await computeCheckRoute(checkItem, suggestion.location, `${suggestion.name} — ${suggestion.address}`);
  };

  // ─── Polygon Drawing ──────────────────────────────────────────────────────

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

  // ─── Clear All ────────────────────────────────────────────────────────────

  const clearAll = () => {
    setOrigin(null); setOriginAddress('');
    setPolygonPath(undefined); setIsDrawingMode(false);
    setRoutes([]); setActiveCheckId(null); setActiveRouteId(null);
    setSuggestions([]); setTextInput('');
    setCheckLocations({});
    resetChecklist();
  };

  // ─── Loading screen ───────────────────────────────────────────────────────

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-white">
        <Loader2 className="animate-spin h-10 w-10 text-blue-500" />
        <span className="ml-4 text-xl">Carregando Mapa...</span>
      </div>
    );
  }

  const activeCheckItem = checklist.find(i => i.id === activeCheckId);

  return (
    <main className="flex h-screen w-screen flex-col bg-gray-950 text-white font-sans overflow-hidden">

      <header className="absolute top-0 left-0 z-10 w-full px-6 pt-5 pb-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
            EnquadraMap
          </h1>
          <p className="text-[10px] text-gray-500 mt-0.5">Portaria MCID Nº 725/2023</p>
        </div>

        {originAddress && (
          <div className="pointer-events-auto bg-black/60 backdrop-blur rounded-xl border border-white/10 px-4 py-2.5 flex items-center gap-3">
            <div>
              <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wide">Terreno</p>
              <p className="text-sm font-semibold text-white max-w-[220px] truncate">{originAddress}</p>
            </div>
            <button
              onClick={() => setIsDrawingMode(v => !v)}
              title={isDrawingMode ? "Cancelar desenho" : "Redesenhar polígono do terreno"}
              className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all
                ${isDrawingMode ? 'bg-yellow-500 text-black animate-pulse' : 'bg-white/10 hover:bg-white/20 text-gray-300'}`}
            >
              <PenLine className="w-4 h-4" />
              {isDrawingMode ? 'Desenhando...' : 'Polígono'}
            </button>
            <button
              onClick={() => setShowReport(true)}
              title="Gerar relatório PDF"
              className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 transition-all flex items-center gap-1.5 text-xs font-bold"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={clearAll}
              title="Limpar tudo e recomeçar"
              className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-500 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      <div className="relative flex-1 w-full h-full">
        <MapDisplay
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
                  Limite: {activeCheckItem.maxDistanceWalk ? `${activeCheckItem.maxDistanceWalk / 1000}km` : ''}
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
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s)}
                      className="w-full text-left px-3 py-2 rounded-xl bg-white/5 hover:bg-white/15 transition-all flex flex-col group"
                    >
                      <span className="text-white text-sm font-semibold group-hover:text-blue-300">{s.name}</span>
                      <span className="text-gray-500 text-xs truncate">{s.address}</span>
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleTextSubmit} className="flex items-center gap-2 px-3 pb-3">
                <input
                  autoFocus
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                  placeholder="Ou busque manualmente..."
                />
                <button type="submit" className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-sm font-bold transition-all">
                  Ir
                </button>
              </form>
            </div>
          ) : !origin ? (
            <div className="bg-gray-900/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
              <form onSubmit={handleTextSubmit} className="flex items-center gap-2 p-3">
                <input
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  className="flex-1 bg-transparent text-lg text-white px-2 focus:outline-none placeholder-gray-600"
                  placeholder="Digite o endereço do terreno..."
                />
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white text-sm font-bold">
                  Confirmar
                </button>
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

        {pendingLocation && (
          <div className="absolute inset-x-0 top-28 mx-auto z-50 w-80 bg-black/90 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-2xl flex flex-col gap-3 pointer-events-auto">
            {!origin ? (
              <>
                <h3 className="text-white font-bold text-sm">Definir centro do terreno?</h3>
                <p className="text-gray-300 text-xs leading-relaxed">{pendingLocation.address}</p>
                <button onClick={() => confirmLocation(true)} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
                  <PenLine className="w-4 h-4" /> Confirmar centro + Desenhar Polígono
                </button>
                <button onClick={() => confirmLocation(false)} className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-xs transition-all">
                  Confirmar apenas como centro
                </button>
                <button onClick={() => setPendingLocation(null)} className="text-gray-600 hover:text-gray-400 text-xs text-center">
                  Cancelar
                </button>
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

        {origin && (
          <div className="absolute top-20 right-0 h-[calc(100vh-80px)] pointer-events-auto">
            <AnalysisSidebar
              checklist={checklist}
              activeItemId={activeCheckId}
              onItemSelect={handleItemSelect}
              onManualUpdate={updateManualStatus}
              isProcessing={isSearching}
            />
          </div>
        )}
      </div>

      {showReport && (
        <PrintReport
          checklist={checklist}
          terrainAddress={originAddress}
          origin={origin}
          checkLocations={checkLocations}
          onClose={() => setShowReport(false)}
        />
      )}
    </main>
  );
}
