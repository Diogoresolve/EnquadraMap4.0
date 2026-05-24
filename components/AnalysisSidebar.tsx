import React from 'react';
import { CheckItem } from '../hooks/usePortariaChecks';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Bus, Footprints, MapPin, ChevronRight, X, PenLine, Crosshair } from 'lucide-react';

// ── Cores institucionais Caixa Econômica Federal ──────────────────────────────
// Azul:    #005CA9  →  aprovado / ativo
// Laranja: #F07D00  →  reprovado / alerta
// ─────────────────────────────────────────────────────────────────────────────

interface AnalysisSidebarProps {
    checklist: CheckItem[];
    activeItemId: string | null;
    onItemSelect: (id: string, category: string) => void;
    onManualUpdate: (id: string, status: boolean) => void;
    onClearItem: (id: string) => void;
    isProcessing: boolean;
    // Terreno
    originAddress?: string;
    polygonPath?: { lat: number; lng: number }[];
    isDrawingMode?: boolean;
    isRemarkingTerrain?: boolean;
    onRemarkTerrain?: () => void;
    onTogglePolygon?: () => void;
}

export const AnalysisSidebar = ({ checklist, activeItemId, onItemSelect, onManualUpdate, onClearItem, isProcessing, originAddress, polygonPath, isDrawingMode, isRemarkingTerrain, onRemarkTerrain, onTogglePolygon }: AnalysisSidebarProps) => {

    const groupedItems = checklist.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, CheckItem[]>);

    const getStatusIcon = (status: string, isActive: boolean, loading: boolean) => {
        if (loading) return <Loader2 style={{ color: '#005CA9' }} className="w-5 h-5 animate-spin" />;
        switch (status) {
            // Azul Caixa = aprovado
            case 'success': return <CheckCircle2 style={{ color: '#005CA9' }} className="w-5 h-5" />;
            // Laranja Caixa = reprovado
            case 'fail':    return <XCircle style={{ color: '#F07D00' }} className="w-5 h-5" />;
            case 'warning': return <AlertCircle className="text-yellow-400 w-5 h-5" />;
            default: return isActive
                ? <div className="w-5 h-5 rounded-full animate-pulse" style={{ background: '#005CA9' }} />
                : <div className="w-5 h-5 rounded-full border-2 border-gray-600" />;
        }
    };

    const formatLimit = (item: CheckItem): string => {
        const parts: string[] = [];
        if (item.maxDistanceWalk)  parts.push(`${(item.maxDistanceWalk / 1000).toFixed(1).replace('.0', '')}km a pé`);
        if (item.maxTimeTransport) parts.push(`${item.maxTimeTransport}min ônibus`);
        return parts.join(' / ');
    };

    const successCount = checklist.filter(i => i.status === 'success').length;
    const failCount    = checklist.filter(i => i.status === 'fail').length;
    const progress     = Math.round((checklist.filter(i => i.status !== 'pending').length / checklist.length) * 100);

    return (
        <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur-md border-l border-white/10 w-96 shadow-2xl">

            {/* ── Terreno ──────────────────────────────────────────────── */}
            <div className="px-4 pt-4 pb-3 border-b border-white/10 flex-shrink-0"
                style={{ background: 'rgba(0,92,169,0.06)' }}>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Terreno</p>
                <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: '#005CA9' }} />
                    <p className="text-xs text-gray-300 truncate flex-1" title={originAddress}>
                        {originAddress || 'Pin definido no mapa'}
                    </p>
                </div>
                <div className="flex gap-2">
                    {/* Remarcar Centro */}
                    <button
                        onClick={onRemarkTerrain}
                        title="Clicar no mapa para reposicionar o centro do terreno"
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold rounded-lg border transition-all"
                        style={isRemarkingTerrain
                            ? { background: 'rgba(240,125,0,0.2)', color: '#F07D00', borderColor: 'rgba(240,125,0,0.4)' }
                            : { background: 'rgba(0,92,169,0.08)', color: '#005CA9', borderColor: 'rgba(0,92,169,0.25)' }
                        }
                    >
                        <Crosshair className="w-3.5 h-3.5" />
                        {isRemarkingTerrain ? 'Clique no mapa...' : 'Remarcar Centro'}
                    </button>
                    {/* Polígono */}
                    <button
                        onClick={onTogglePolygon}
                        title="Desenhar ou redesenhar o polígono do terreno"
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold rounded-lg border transition-all"
                        style={isDrawingMode
                            ? { background: 'rgba(234,179,8,0.15)', color: '#eab308', borderColor: 'rgba(234,179,8,0.35)' }
                            : { background: 'rgba(0,92,169,0.08)', color: '#005CA9', borderColor: 'rgba(0,92,169,0.25)' }
                        }
                    >
                        <PenLine className="w-3.5 h-3.5" />
                        {isDrawingMode ? 'Desenhando...' : polygonPath?.length ? 'Redesenhar' : 'Polígono'}
                    </button>
                </div>

                {/* Orientação — só aparece antes de ter polígono */}
                {!polygonPath?.length && (
                    <div className="mt-2.5 flex flex-col gap-1">
                        <div className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5"
                                style={{ background: 'rgba(0,92,169,0.25)', color: '#005CA9' }}>1</span>
                            <p className="text-[10px] text-gray-500 leading-snug">
                                Clique no mapa para marcar o <span className="text-gray-400 font-semibold">ponto central</span> do terreno em análise
                            </p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5"
                                style={{ background: 'rgba(0,92,169,0.25)', color: '#005CA9' }}>2</span>
                            <p className="text-[10px] text-gray-500 leading-snug">
                                Use o botão <span className="text-gray-400 font-semibold">Polígono</span> para desenhar o contorno do terreno
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="p-5 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="text-white text-xs px-2 py-0.5 rounded font-bold"
                            style={{ background: '#005CA9' }}>MCMV</span>
                        Relatório de Distâncias
                    </h2>
                </div>
                <p className="text-gray-400 text-xs mb-3">Portaria MCID Nº 725/2023</p>

                {/* Stats */}
                <div className="flex gap-3 mb-3 text-xs">
                    {/* Aprovados — Azul Caixa */}
                    <div className="flex-1 rounded-lg p-2 text-center border"
                        style={{ background: 'rgba(0,92,169,0.10)', borderColor: 'rgba(0,92,169,0.25)' }}>
                        <p className="font-bold text-base" style={{ color: '#005CA9' }}>{successCount}</p>
                        <p className="text-gray-400">Aprovados</p>
                    </div>
                    {/* Alertas — Laranja Caixa */}
                    <div className="flex-1 rounded-lg p-2 text-center border"
                        style={{ background: 'rgba(240,125,0,0.10)', borderColor: 'rgba(240,125,0,0.25)' }}>
                        <p className="font-bold text-base" style={{ color: '#F07D00' }}>{failCount}</p>
                        <p className="text-gray-400">Com Alerta</p>
                    </div>
                    {/* Pendentes */}
                    <div className="flex-1 bg-gray-500/10 border border-gray-500/20 rounded-lg p-2 text-center">
                        <p className="text-gray-300 font-bold text-base">{checklist.length - successCount - failCount}</p>
                        <p className="text-gray-400">Pendentes</p>
                    </div>
                </div>

                {/* Progress Bar — Azul → Laranja */}
                <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progresso</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{
                                width: `${progress}%`,
                                background: 'linear-gradient(90deg, #005CA9, #F07D00)',
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* ── Checklist ───────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-3 space-y-5">
                {Object.entries(groupedItems).map(([category, items]) => (
                    <div key={category}>
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">{category}</h3>
                        <div className="space-y-1.5">
                            {items.map(item => {
                                const isActive  = activeItemId === item.id;
                                const isLoading = isProcessing && isActive;

                                // Card border/bg por status
                                let cardStyle = 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20';
                                if (isActive)              cardStyle = 'border bg-blue-600/10 ring-1 ring-blue-500/40';
                                else if (item.status === 'success') cardStyle = 'border hover:opacity-90';
                                else if (item.status === 'fail')    cardStyle = 'border hover:opacity-90';

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => (item.type === 'search' || (item.type === 'manual' && item.maxDistanceWalk))
                                            ? onItemSelect(item.id, item.category)
                                            : null}
                                        className={`relative p-3 rounded-xl transition-all group ${cardStyle}
                                            ${(item.type === 'search' || (item.type === 'manual' && item.maxDistanceWalk)) ? 'cursor-pointer' : ''}`}
                                        style={
                                            isActive ? { borderColor: '#005CA9' }
                                            : item.status === 'success' ? { background: 'rgba(0,92,169,0.07)', borderColor: 'rgba(0,92,169,0.22)' }
                                            : item.status === 'fail'    ? { background: 'rgba(240,125,0,0.07)', borderColor: 'rgba(240,125,0,0.22)' }
                                            : {}
                                        }
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className="font-semibold text-sm text-gray-100 truncate">{item.label}</span>
                                                    {item.type === 'manual' && (
                                                        <span className="text-[9px] bg-gray-700 px-1 py-0.5 rounded text-gray-400 shrink-0">Manual</span>
                                                    )}
                                                </div>

                                                {/* Limit */}
                                                <p className="text-[10px] text-gray-600 mb-1">
                                                    Limite: {formatLimit(item) || item.description}
                                                </p>

                                                {/* Result Badge + Limpar */}
                                                {item.status !== 'pending' && item.type === 'search' && (
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold w-fit"
                                                            style={
                                                                item.status === 'success'
                                                                    ? { background: 'rgba(0,92,169,0.18)', color: '#005CA9' }
                                                                    : { background: 'rgba(240,125,0,0.18)', color: '#F07D00' }
                                                            }
                                                        >
                                                            {item.modeUsed === 'TRANSIT'
                                                                ? <Bus className="w-3 h-3" />
                                                                : <Footprints className="w-3 h-3" />
                                                            }
                                                            <span>{item.currentDistance}</span>
                                                            {item.currentDuration && <span className="opacity-70">• {item.currentDuration}</span>}
                                                        </div>
                                                        <button
                                                            title="Limpar resultado e redefinir"
                                                            onClick={(e) => { e.stopPropagation(); onClearItem(item.id); }}
                                                            className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                                                        >
                                                            <X className="w-3 h-3" /> Limpar
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Address */}
                                                {item.address && (
                                                    <p className="text-[10px] text-gray-500 mt-1 truncate flex items-center gap-1">
                                                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                                                        {item.address}
                                                    </p>
                                                )}

                                                {/* Manual Controls */}
                                                {item.type === 'manual' && (
                                                    <div className="mt-2 space-y-1.5">
                                                        {/* Distance badge for infra items */}
                                                        {item.maxDistanceWalk && item.status !== 'pending' && item.currentDistance && (
                                                            <div
                                                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold w-fit"
                                                                style={
                                                                    item.status === 'success'
                                                                        ? { background: 'rgba(0,92,169,0.18)', color: '#005CA9' }
                                                                        : { background: 'rgba(240,125,0,0.18)', color: '#F07D00' }
                                                                }
                                                            >
                                                                <Footprints className="w-3 h-3" />
                                                                <span>{item.currentDistance}</span>
                                                                {item.currentDuration && <span className="opacity-70">• {item.currentDuration}</span>}
                                                            </div>
                                                        )}
                                                        {/* Map button */}
                                                        {item.maxDistanceWalk && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onItemSelect(item.id, item.category); }}
                                                                className="w-full py-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
                                                                style={isActive
                                                                    ? { background: '#005CA9', color: '#fff' }
                                                                    : { background: 'rgba(0,92,169,0.15)', color: '#005CA9' }
                                                                }
                                                            >
                                                                <MapPin className="w-3 h-3" />
                                                                {isActive ? 'Clique no mapa para marcar...' : 'Marcar no mapa'}
                                                            </button>
                                                        )}
                                                        {/* Existente / Ausente toggles */}
                                                        {!item.maxDistanceWalk && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onManualUpdate(item.id, true); }}
                                                                    className="flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors border"
                                                                    style={item.status === 'success'
                                                                        ? { background: 'rgba(0,92,169,0.20)', color: '#005CA9', borderColor: 'rgba(0,92,169,0.45)' }
                                                                        : { background: 'rgba(0,92,169,0.05)', color: 'rgba(0,92,169,0.65)', borderColor: 'rgba(0,92,169,0.18)' }
                                                                    }
                                                                >
                                                                    Existente
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onManualUpdate(item.id, false); }}
                                                                    className="flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors border"
                                                                    style={item.status === 'fail'
                                                                        ? { background: 'rgba(240,125,0,0.20)', color: '#F07D00', borderColor: 'rgba(240,125,0,0.45)' }
                                                                        : { background: 'rgba(240,125,0,0.05)', color: 'rgba(240,125,0,0.65)', borderColor: 'rgba(240,125,0,0.18)' }
                                                                    }
                                                                >
                                                                    Ausente
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Status icon */}
                                            <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
                                                {getStatusIcon(item.status, isActive, isLoading)}
                                                {item.type === 'search' && item.status === 'pending' && !isActive && (
                                                    <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-400 transition-colors" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Active pulse overlay */}
                                        {isActive && item.status === 'pending' && (
                                            <div className="absolute inset-0 rounded-xl animate-pulse pointer-events-none"
                                                style={{ background: 'rgba(0,92,169,0.08)' }} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Footer ──────────────────────────────────────────────────────── */}
            <div className="p-3 bg-black/40 border-t border-white/10 text-[10px] text-gray-600 text-center flex-shrink-0">
                Clique num item para localizar no mapa • Infra marcada manualmente
            </div>
        </div>
    );
};
