"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapPin, Navigation } from 'lucide-react';
import { useJsApiLoader, GoogleMap, MarkerF } from '@react-google-maps/api';

type Point = {
    l: string; // label
    a: string; // address
    lat: number;
    lng: number;
};

type Data = {
    t: { a: string; lat: number; lng: number } | null;
    p: Point[];
};

const LIBRARIES: ("geometry")[] = ["geometry"];

function DriverContent() {
    const searchParams = useSearchParams();
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState(false);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: LIBRARIES,
    });

    useEffect(() => {
        const d = searchParams.get('data');
        if (d) {
            try {
                const parsed = JSON.parse(decodeURIComponent(atob(d)));
                setData(parsed);
            } catch (e) {
                console.error("Error parsing driver data", e);
                setError(true);
            }
        }
    }, [searchParams]);

    if (error) {
        return <div className="p-6 text-center text-red-500 font-bold mt-10">Link inválido ou corrompido.</div>;
    }

    if (!data) {
        return <div className="p-6 text-center text-gray-500 mt-10 font-bold animate-pulse">Carregando rotas...</div>;
    }

    const wazeUrl = (lat: number, lng: number) => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    const mapsUrl = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    const onLoad = (map: google.maps.Map) => {
        if (data.p.length > 0 || data.t) {
            const bounds = new window.google.maps.LatLngBounds();
            if (data.t) bounds.extend(data.t);
            data.p.forEach(pt => bounds.extend(pt));
            map.fitBounds(bounds, 40); // 40px padding
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 font-sans">
            <header className="bg-emerald-600 text-white p-4 shadow-md sticky top-0 z-20">
                <h1 className="text-lg font-bold flex items-center gap-2">
                    <Navigation className="w-5 h-5" />
                    EnquadraMap - Motorista
                </h1>
                {data.t && (
                    <p className="text-[11px] mt-1 text-emerald-100 opacity-90 line-clamp-2 leading-snug">
                        📍 Origem: {data.t.a || "Terreno não informado"}
                    </p>
                )}
            </header>

            {/* Mapa Macro */}
            <div className="w-full h-64 bg-gray-200 relative z-10 border-b border-gray-300 shadow-sm">
                {!isLoaded ? (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm">Carregando mapa...</div>
                ) : (
                    <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        options={{
                            disableDefaultUI: true,
                            zoomControl: true,
                            gestureHandling: 'greedy' // Permite arrastar com 1 dedo
                        }}
                        onLoad={onLoad}
                    >
                        {data.t && (
                            <MarkerF
                                position={{ lat: data.t.lat, lng: data.t.lng }}
                                icon={typeof window !== 'undefined' && window.google?.maps ? {
                                    url: 'https://maps.google.com/mapfiles/kml/paddle/grn-stars.png',
                                    scaledSize: new window.google.maps.Size(40, 40)
                                } : 'https://maps.google.com/mapfiles/kml/paddle/grn-stars.png'}
                            />
                        )}
                        {data.p.map((pt, i) => (
                            <MarkerF
                                key={i}
                                position={{ lat: pt.lat, lng: pt.lng }}
                                icon={typeof window !== 'undefined' && window.google?.maps ? {
                                    url: 'https://maps.google.com/mapfiles/kml/paddle/red-circle.png',
                                    scaledSize: new window.google.maps.Size(32, 32)
                                } : 'https://maps.google.com/mapfiles/kml/paddle/red-circle.png'}
                                label={{
                                    text: pt.l.substring(0, 1).toUpperCase(),
                                    color: '#000',
                                    fontWeight: 'bold',
                                    fontSize: '11px'
                                }}
                            />
                        ))}
                    </GoogleMap>
                )}
            </div>

            <main className="p-4 space-y-4 max-w-md mx-auto mt-2">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Destinos da Vistoria ({data.p.length})</p>
                
                {data.p.map((pt, i) => (
                    <div key={i} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                        <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="font-bold text-sm text-gray-800">{pt.l}</h2>
                            {pt.a && <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{pt.a}</p>}
                        </div>
                        <div className="flex divide-x divide-gray-100">
                            <a 
                                href={wazeUrl(pt.lat, pt.lng)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-3 text-center text-[#33ccff] font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12.01 24c-2.4 0-4.8-.7-6.8-2L4.6 22l.5-2.2C2 17.6.7 14.8.7 11.9.7 5.3 6.1 0 12.01 0c5.9 0 11.3 5.3 11.3 11.9 0 6.6-5.4 12.1-11.3 12.1zm-4.3-15c-.6 0-1.2.4-1.2 1.1 0 .7.6 1.2 1.2 1.2.7 0 1.2-.5 1.2-1.2 0-.7-.5-1.1-1.2-1.1zm8.5 0c-.6 0-1.2.4-1.2 1.1 0 .7.6 1.2 1.2 1.2.7 0 1.2-.5 1.2-1.2 0-.7-.5-1.1-1.2-1.1zm-4.2 8.4c-2.5 0-4.5-.8-4.5-.8l-.8-1.4s1.7 1 5.3 1c3.5 0 5.2-1 5.2-1l-.8 1.4s-1.9.8-4.4.8z"/>
                                </svg>
                                Ir com Waze
                            </a>
                            <a 
                                href={mapsUrl(pt.lat, pt.lng)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-3 text-center text-emerald-600 font-bold hover:bg-green-50 transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <MapPin className="w-4 h-4" />
                                G. Maps
                            </a>
                        </div>
                    </div>
                ))}
                
                {data.p.length === 0 && (
                    <div className="text-center text-gray-400 py-10 font-medium">
                        Nenhum destino registrado.
                    </div>
                )}
            </main>
        </div>
    );
}

export default function MotoristaPage() {
    return (
        <Suspense fallback={<div className="p-6 text-center text-gray-500 mt-10">Carregando...</div>}>
            <DriverContent />
        </Suspense>
    );
}
