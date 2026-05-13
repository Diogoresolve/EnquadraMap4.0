
import React from 'react';
import { CheckItem } from '../hooks/usePortariaChecks';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Bus, Footprints, MapPin, ChevronRight } from 'lucide-react';

interface AnalysisSidebarProps {
    checklist: CheckItem[];
    activeItemId: string | null;
    onItemSelect: (id: string, category: string) => void;
    onManualUpdate: (id: string, status: boolean) => void;
    isProcessing: boolean;
}

export const AnalysisSidebar = ({ checklist, activeItemId, onItemSelect, onManualUpdate, isProcessing }: AnalysisSidebarProps) => {

    // Group items by Category
    const groupedItems = checklist.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, CheckItem[]>);

    const getStatusIcon = (status: string, isActive: boolean, loading: boolean) => {
        if (loading) return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
        switch (status) {
            case 'success': return <CheckCircle2 className="text-green-400 w-5 h-5" />;
            case 'fail': return <XCircle className="text-red-400 w-5 h-5" />;
            case 'warning': return <AlertCircle className="text-yellow-400 w-5 h-5" />;
            default: return isActive
                ? <div className="w-5 h-5 rounded-full bg-blue-500 animate-pulse" />
                : <div className="w-5 h-5 rounded-full border-2 border-gray-600" />;
        }
    };

    const formatLimit = (item: CheckItem): string => {
        const parts: string[] = [];
        if (item.maxDistanceWalk) {
            parts.push(`${(item.maxDistanceWalk / 1000).toFixed(1).replace('.0', '')}km a pé`);
        }
        if (item.maxTimeTransport) {
            parts.push(`${item.maxTimeTransport}min ônibus`);
        }
        return parts.join(' / ');
    };

    const totalSearchable = checklist.filter(i => i.type === 'search').length;
    const successCount = checklist.filter(i => i.status === 'success').length;
    const failCount = checklist.filter(i => i.status === 'fail').length;
    const progress = Math.round((checklist.filter(i => i.status !== 'pending').length / checklist.length) * 100);

    // Verdict badges removed due to portaria compliance rules outside of this app

    return (
        <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur-md border-l border-white/10 w-96 shadow-2xl">

            {/* Header */}
            <div className="p-5 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded font-bold">MCMV</span>
                        Relatório de Distâncias
                    </h2>
                </div>
                <p className="text-gray-400 text-xs mb-3">Portaria MCID Nº 725/2023</p>

                {/* Stats */}
                <div className="flex gap-3 mb-3 text-xs">
                    <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center">
                        <p className="text-green-400 font-bold text-base">{successCount}</p>
                        <p className="text-gray-400">Lançados</p>
                    </div>
                    <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-center">
                        <p className="text-red-400 font-bold text-base">{failCount}</p>
                        <p className="text-gray-400">Com Alerta</p>
                    </div>
                    <div className="flex-1 bg-gray-500/10 border border-gray-500/20 rounded-lg p-2 text-center">
                        <p className="text-gray-300 font-bold text-base">{checklist.length - successCount - failCount}</p>
                        <p className="text-gray-400">Pendentes</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progresso</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-emerald-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Checklist */}
            <div className="flex-1 overflow-y-auto p-3 space-y-5">
                {Object.entries(groupedItems).map(([category, items]) => (
                    <div key={category}>
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">{category}</h3>
                        <div className="space-y-1.5">
                            {items.map(item => {
                                const isActive = activeItemId === item.id;
                                const isLoading = isProcessing && isActive;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => (item.type === 'search' || (item.type === 'manual' && item.maxDistanceWalk))
                                            ? onItemSelect(item.id, item.category)
                                            : null}
                                        className={`
                                            relative p-3 rounded-xl border transition-all group
                                            ${isActive
                                                ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500/40'
                                                : item.status === 'success'
                                                    ? 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10'
                                                    : item.status === 'fail'
                                                        ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                            }
                                            ${(item.type === 'search' || (item.type === 'manual' && item.maxDistanceWalk)) ? 'cursor-pointer' : ''}
                                        `}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className="font-semibold text-sm text-gray-100 truncate">{item.label}</span>
                                                    {item.type === 'manual' && (
                                                        <span className="text-[9px] bg-gray-700 px-1 py-0.5 rounded text-gray-400 shrink-0">Manual</span>
                                                    )}
                                                </div>

                                                {/* Limit Line */}
                                                <p className="text-[10px] text-gray-600 mb-1">
                                                    Limite: {formatLimit(item) || item.description}
                                                </p>

                                                {/* Result Badge */}
                                                {item.status !== 'pending' && item.type === 'search' && (
                                                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold w-fit
                                                        ${item.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`
                                                    }>
                                                        {item.modeUsed === 'TRANSIT'
                                                            ? <Bus className="w-3 h-3" />
                                                            : <Footprints className="w-3 h-3" />
                                                        }
                                                        <span>{item.currentDistance}</span>
                                                        {item.currentDuration && <span className="opacity-70">• {item.currentDuration}</span>}
                                                    </div>
                                                )}

                                                {/* Address line */}
                                                {item.address && (
                                                    <p className="text-[10px] text-gray-500 mt-1 truncate flex items-center gap-1">
                                                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                                                        {item.address}
                                                    </p>
                                                )}

                                                {/* Manual Controls */}
                                                {item.type === 'manual' && (
                                                    <div className="mt-2 space-y-1.5">
                                                        {/* For infra items with distance: show map button */}
                                                        {item.maxDistanceWalk && item.status !== 'pending' && item.currentDistance && (
                                                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold w-fit
                                                                ${item.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                                                            >
                                                                <Footprints className="w-3 h-3" />
                                                                <span>{item.currentDistance}</span>
                                                                {item.currentDuration && <span className="opacity-70">• {item.currentDuration}</span>}
                                                            </div>
                                                        )}
                                                        {item.maxDistanceWalk && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onItemSelect(item.id, item.category); }}
                                                                className={`w-full py-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5
                                                                    ${isActive ? 'bg-blue-600 text-white' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'}`}
                                                            >
                                                                <MapPin className="w-3 h-3" />
                                                                {isActive ? 'Clique no mapa para marcar...' : 'Marcar no mapa'}
                                                            </button>
                                                        )}
                                                        {/* For infra items without distance (e.g. Paving, Lighting): show manual toggle buttons */}
                                                        {!item.maxDistanceWalk && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onManualUpdate(item.id, true); }}
                                                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors border
                                                                        ${item.status === 'success'
                                                                            ? 'bg-green-500/20 text-green-400 border-green-500/50'
                                                                            : 'bg-green-500/5 text-green-500/70 border-green-500/20 hover:bg-green-500/10'}`}
                                                                >
                                                                    Existente
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onManualUpdate(item.id, false); }}
                                                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors border
                                                                        ${item.status === 'fail'
                                                                            ? 'bg-red-500/20 text-red-400 border-red-500/50'
                                                                            : 'bg-red-500/5 text-red-500/70 border-red-500/20 hover:bg-red-500/10'}`}
                                                                >
                                                                    Ausente
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Status Icon */}
                                            <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
                                                {getStatusIcon(item.status, isActive, isLoading)}
                                                {item.type === 'search' && item.status === 'pending' && !isActive && (
                                                    <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-400 transition-colors" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Active pulse overlay */}
                                        {isActive && item.status === 'pending' && (
                                            <div className="absolute inset-0 bg-blue-600/10 rounded-xl animate-pulse pointer-events-none" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="p-3 bg-black/40 border-t border-white/10 text-[10px] text-gray-600 text-center flex-shrink-0">
                Clique num item para localizar no mapa • Infra marcada manualmente
            </div>
        </div>
    );
};
