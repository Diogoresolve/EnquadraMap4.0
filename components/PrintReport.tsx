"use client";

import React from 'react';
import { CheckItem } from '../hooks/usePortariaChecks';
import { CheckCircle2, XCircle, Clock, Footprints, Bus } from 'lucide-react';

interface PrintReportProps {
    checklist: CheckItem[];
    terrainAddress: string;
    onClose: () => void;
}

export const PrintReport = ({ checklist, terrainAddress, onClose }: PrintReportProps) => {

    const successCount = checklist.filter(i => i.status === 'success').length;
    const failCount = checklist.filter(i => i.status === 'fail').length;
    const pendingCount = checklist.filter(i => i.status === 'pending').length;
    const allDone = pendingCount === 0;
    const isApto = allDone && failCount === 0;

    const groupedItems = checklist.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, CheckItem[]>);

    const today = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });

    return (
        <>
            {/* Print Overlay */}
            <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-start justify-center p-6 overflow-y-auto" id="print-overlay">

                {/* Action buttons (hidden during print) */}
                <div className="no-print fixed top-4 right-4 z-[201] flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-lg"
                    >
                        🖨️ Imprimir / Salvar PDF
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl text-sm shadow-lg"
                    >
                        ✕ Fechar
                    </button>
                </div>

                {/* A4-like report card */}
                <div className="bg-white text-gray-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden printable-area">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-600 to-cyan-700 p-6 text-white">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">EnquadraMap</h1>
                                <p className="text-emerald-100 text-sm mt-0.5">Relatório de Inserção Urbana — Portaria MCID Nº 725/2023</p>
                            </div>
                            <div className="text-right text-sm text-emerald-100">
                                <p>{today}</p>
                                <p className="font-bold text-white text-base mt-1">
                                    {isApto
                                        ? '✅ APTO'
                                        : allDone
                                            ? '❌ NÃO APTO'
                                            : '⏳ INCOMPLETO'}
                                </p>
                            </div>
                        </div>

                        {/* Terrain */}
                        <div className="mt-4 bg-white/10 rounded-xl px-4 py-3">
                            <p className="text-[10px] text-emerald-200 uppercase font-bold tracking-widest">Terreno Analisado</p>
                            <p className="text-white font-semibold mt-0.5">{terrainAddress || 'Não informado'}</p>
                        </div>
                    </div>

                    {/* Summary row */}
                    <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
                        <div className="py-4 text-center">
                            <p className="text-2xl font-bold text-green-600">{successCount}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Conformes</p>
                        </div>
                        <div className="py-4 text-center">
                            <p className="text-2xl font-bold text-red-600">{failCount}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Não Conformes</p>
                        </div>
                        <div className="py-4 text-center">
                            <p className="text-2xl font-bold text-gray-400">{pendingCount}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Pendentes</p>
                        </div>
                    </div>

                    {/* Checklist by category */}
                    <div className="p-6 space-y-6">
                        {Object.entries(groupedItems).map(([category, items]) => (
                            <div key={category}>
                                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-1 mb-3">
                                    {category}
                                </h2>
                                <div className="space-y-2">
                                    {items.map(item => (
                                        <div key={item.id} className={`flex items-start gap-3 p-3 rounded-xl border
                                            ${item.status === 'success' ? 'bg-green-50 border-green-100' :
                                                item.status === 'fail' ? 'bg-red-50 border-red-100' :
                                                    'bg-gray-50 border-gray-100'}`}>

                                            {/* Status Icon */}
                                            <div className="mt-0.5 shrink-0">
                                                {item.status === 'success'
                                                    ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                    : item.status === 'fail'
                                                        ? <XCircle className="w-5 h-5 text-red-600" />
                                                        : <div className="w-5 h-5 rounded-full border-2 border-gray-300" />}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-baseline gap-2">
                                                    <span className="font-semibold text-gray-800 text-sm">{item.label}</span>
                                                    {item.type === 'manual' && (
                                                        <span className="text-[9px] bg-gray-200 text-gray-500 px-1.5 rounded font-bold">MANUAL</span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    {item.description}
                                                    {item.maxDistanceWalk && ` • Limite: ${item.maxDistanceWalk / 1000}km a pé`}
                                                    {item.maxTimeTransport && ` / ${item.maxTimeTransport}min ônibus`}
                                                </p>
                                                {item.address && (
                                                    <p className="text-[10px] text-gray-500 mt-1 italic truncate">📍 {item.address}</p>
                                                )}
                                            </div>

                                            {/* Result Metric */}
                                            {item.status !== 'pending' && item.currentDistance && (
                                                <div className={`shrink-0 text-right text-xs font-bold
                                                    ${item.status === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                                                    <div className="flex items-center gap-1 justify-end">
                                                        {item.modeUsed === 'TRANSIT'
                                                            ? <Bus className="w-3 h-3" />
                                                            : <Footprints className="w-3 h-3" />}
                                                        <span>{item.currentDistance}</span>
                                                    </div>
                                                    {item.currentDuration && (
                                                        <div className="flex items-center gap-1 justify-end mt-0.5 opacity-70 font-normal">
                                                            <Clock className="w-2.5 h-2.5" />
                                                            <span>{item.currentDuration}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Footer */}
                        <div className="pt-4 border-t border-gray-100 text-[9px] text-gray-400 text-center space-y-0.5">
                            <p>Documento gerado automaticamente pelo sistema EnquadraMap</p>
                            <p>Referência: Portaria MCID Nº 725, de 15 de junho de 2023 — Programa Minha Casa, Minha Vida (MCMV)</p>
                            <p>Este relatório é um instrumento auxiliar e não substitui a análise técnica do órgão competente.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print CSS  */}
            <style>{`
                @media print {
                    body > *:not(#print-overlay) { display: none !important; }
                    .no-print { display: none !important; }
                    #print-overlay {
                        position: static !important;
                        background: none !important;
                        padding: 0 !important;
                    }
                    .printable-area {
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        max-width: 100% !important;
                    }
                    @page { margin: 10mm; size: A4 portrait; }
                }
            `}</style>
        </>
    );
};
