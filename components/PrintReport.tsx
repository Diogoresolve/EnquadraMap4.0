"use client";

import React from 'react';
import { CheckItem } from '../hooks/usePortariaChecks';
import { CheckCircle2, XCircle, Footprints, Bus, Clock, Download } from 'lucide-react';

type LatLng = { lat: number; lng: number };

interface PrintReportProps {
    checklist: CheckItem[];
    terrainAddress: string;
    origin?: LatLng | null;
    checkLocations?: Record<string, LatLng>;
    onClose: () => void;
}

export const PrintReport = ({ checklist, terrainAddress, origin, checkLocations, onClose }: PrintReportProps) => {

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

    // ─── Exportar KML para Google Maps ───────────────────────────────────────
    const exportKML = () => {
        const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');

        const styles = `
    <Style id="terrain">
      <IconStyle>
        <color>ff1faa00</color>
        <scale>1.2</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/grn-stars.png</href></Icon>
      </IconStyle>
    </Style>
    <Style id="ok">
      <IconStyle>
        <color>ff00aa00</color>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/go.png</href></Icon>
      </IconStyle>
    </Style>
    <Style id="fail">
      <IconStyle>
        <color>ff0000ff</color>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/stop.png</href></Icon>
      </IconStyle>
    </Style>
    <Style id="pending">
      <IconStyle>
        <color>ff00aaff</color>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/ylw-circle.png</href></Icon>
      </IconStyle>
    </Style>`;

        const terrainMark = origin
            ? `
    <Placemark>
      <name>🏠 TERRENO</name>
      <description><![CDATA[<b>${terrainAddress}</b><br/>Ponto de referência do terreno analisado.]]></description>
      <styleUrl>#terrain</styleUrl>
      <Point><coordinates>${origin.lng},${origin.lat},0</coordinates></Point>
    </Placemark>`
            : '';

        const itemMarks = checklist
            .filter(item => checkLocations?.[item.id])
            .map(item => {
                const loc = checkLocations![item.id];
                const style = item.status === 'success' ? 'ok' : item.status === 'fail' ? 'fail' : 'pending';
                const modeText = item.modeUsed === 'TRANSIT' ? '🚌 Ônibus' : '🚶 A pé';
                const distText = item.currentDistance ? `${modeText}: ${item.currentDistance}` : '';
                const statusText = item.status === 'success' ? '✅ CONFORME' : item.status === 'fail' ? '❌ NÃO CONFORME' : '⏳ PENDENTE';

                return `
    <Placemark>
      <name>${item.abbrev} — ${item.label}</name>
      <description><![CDATA[
        <b>${statusText}</b><br/>
        ${item.address || ''}<br/>
        ${distText}<br/>
        <i>Limite: ${item.maxDistanceWalk ? `${item.maxDistanceWalk / 1000}km a pé` : ''}${item.maxTimeTransport ? ` / ${item.maxTimeTransport}min ônibus` : ''}</i>
      ]]></description>
      <styleUrl>#${style}</styleUrl>
      <Point><coordinates>${loc.lng},${loc.lat},0</coordinates></Point>
    </Placemark>`;
            }).join('');

        const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>EnquadraMap — ${terrainAddress}</name>
    <description>Relatório de Inserção Urbana — Portaria MCID Nº 725/2023 — ${today}</description>
    ${styles}
    ${terrainMark}
    ${itemMarks}
  </Document>
</kml>`;

        const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `EnquadraMap_${dateStr}.kml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <div
                id="print-overlay"
                className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-start justify-center p-6 overflow-y-auto"
            >
                <div className="no-print fixed top-4 right-4 z-[201] flex gap-2">
                    <button
                        onClick={exportKML}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-lg"
                        title="Exportar pontos para Google Maps (.kml)"
                    >
                        <Download className="w-4 h-4" /> Exportar KML
                    </button>
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

                <div id="enquadramap-report" className="bg-white text-gray-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden">

                    <div className="bg-gradient-to-r from-emerald-600 to-cyan-700 print:bg-none print:bg-white print:border-b-2 print:border-black p-5 text-white print:text-black">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">EnquadraMap</h1>
                                <p className="text-emerald-100 print:text-gray-600 text-xs mt-0.5">Relatório de Inserção Urbana — Portaria MCID Nº 725/2023</p>
                            </div>
                            <div className="text-right text-xs text-emerald-100 print:text-gray-600">
                                <p>{today}</p>
                                <p className="font-bold text-white print:text-black text-sm mt-1">
                                    {isApto ? '✅ APTO' : allDone ? '❌ NÃO APTO' : '⏳ INCOMPLETO'}
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 bg-white/10 print:bg-transparent print:border print:border-gray-400 rounded-lg px-3 py-2">
                            <p className="text-[9px] text-emerald-200 print:text-gray-500 uppercase font-bold tracking-widest">Terreno Analisado</p>
                            <p className="text-white print:text-black font-semibold text-sm mt-0.5">{terrainAddress || 'Não informado'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-gray-100 print:divide-gray-400 border-b border-gray-100 print:border-gray-400">
                        <div className="py-3 text-center">
                            <p className="text-xl font-bold text-green-600 print:text-black">{successCount}</p>
                            <p className="text-xs text-gray-500 print:text-gray-600 mt-0.5">Conformes</p>
                        </div>
                        <div className="py-3 text-center">
                            <p className="text-xl font-bold text-red-600 print:text-black">{failCount}</p>
                            <p className="text-xs text-gray-500 print:text-gray-600 mt-0.5">Não Conformes</p>
                        </div>
                        <div className="py-3 text-center">
                            <p className="text-xl font-bold text-gray-400 print:text-gray-500">{pendingCount}</p>
                            <p className="text-xs text-gray-500 print:text-gray-600 mt-0.5">Pendentes</p>
                        </div>
                    </div>

                    <div className="p-4 space-y-4">
                        {Object.entries(groupedItems).map(([category, items]) => (
                            <div key={category}>
                                <h2 className="text-[9px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-1 mb-2">
                                    {category}
                                </h2>
                                <div className={`grid gap-1.5 ${items.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    {items.map(item => (
                                        <div key={item.id} className={`flex items-start gap-2 p-2 rounded-lg border text-[10px] print:bg-transparent print:border-gray-400
                                            ${item.status === 'success' ? 'bg-green-50 border-green-100' :
                                              item.status === 'fail'    ? 'bg-red-50 border-red-100' :
                                                                          'bg-gray-50 border-gray-100'}`}>
                                            <div className="mt-0.5 shrink-0">
                                                {item.status === 'success'
                                                    ? <CheckCircle2 className="w-4 h-4 text-green-600 print:text-black" />
                                                    : item.status === 'fail'
                                                        ? <XCircle className="w-4 h-4 text-red-600 print:text-black" />
                                                        : <div className="w-4 h-4 rounded-full border-2 border-gray-300 print:border-gray-500" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-baseline gap-1">
                                                    <span className="font-semibold text-gray-800">{item.label}</span>
                                                    {item.type === 'manual' && (
                                                        <span className="text-[8px] bg-gray-200 text-gray-500 px-1 rounded font-bold">MANUAL</span>
                                                    )}
                                                </div>
                                                <p className="text-gray-400 mt-0.5 leading-snug">
                                                    {item.maxDistanceWalk && `Limite: ${item.maxDistanceWalk / 1000}km a pé`}
                                                    {item.maxDistanceWalk && item.maxTimeTransport && ' / '}
                                                    {item.maxTimeTransport && `${item.maxTimeTransport}min ônibus`}
                                                </p>
                                                {/* Endereço completo — sem truncate para ser pesquisável */}
                                                {item.address && (
                                                    <p className="text-gray-500 mt-1 italic leading-snug break-words">
                                                        📍 {item.address}
                                                    </p>
                                                )}
                                            </div>
                                            {item.status !== 'pending' && item.currentDistance && (
                                                <div className={`shrink-0 text-right font-bold
                                                    ${item.status === 'success' ? 'text-green-700 print:text-black' : 'text-red-600 print:text-black'}`}>
                                                    <div className="flex items-center gap-0.5 justify-end">
                                                        {item.modeUsed === 'TRANSIT'
                                                            ? <Bus className="w-3 h-3" />
                                                            : <Footprints className="w-3 h-3" />}
                                                        <span>{item.currentDistance}</span>
                                                    </div>
                                                    {item.currentDuration && (
                                                        <div className="flex items-center gap-0.5 justify-end mt-0.5 opacity-70 font-normal">
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

                        <div className="pt-3 border-t border-gray-100 text-[8px] text-gray-400 text-center space-y-0.5">
                            <p>Documento gerado automaticamente pelo sistema EnquadraMap</p>
                            <p>Referência: Portaria MCID Nº 725, de 15 de junho de 2023 — Programa Minha Casa, Minha Vida (MCMV)</p>
                            <p>Este relatório é um instrumento auxiliar e não substitui a análise técnica do órgão competente.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══ CSS DE IMPRESSÃO — sem duplicação de página ══ */}
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }

                    /* 1. Esconde tudo no body */
                    body * {
                        visibility: hidden;
                    }

                    /* 2. Reseta overflow e height dos containers principais para permitir múltiplas páginas */
                    html, body, main, #print-overlay {
                        height: auto !important;
                        min-height: auto !important;
                        overflow: visible !important;
                        position: static !important;
                    }

                    /* 3. Mostra o relatório e o overlay */
                    #print-overlay, #print-overlay * {
                        visibility: visible;
                    }

                    /* 4. Ajusta o overlay e relatório para o topo */
                    #print-overlay {
                        background: transparent !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        display: block !important;
                    }

                    #enquadramap-report {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100% !important;
                        max-width: 100% !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* 5. Evita quebrar itens no meio */
                    #enquadramap-report > div > div {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }

                    /* 6. Força a impressão das cores de fundo */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* 7. Esconde botões */
                    .no-print, .no-print * {
                        display: none !important;
                        visibility: hidden !important;
                    }
                }
            `}</style>
        </>
    );
};
