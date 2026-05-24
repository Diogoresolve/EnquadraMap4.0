"use client";

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { GoogleMap, Marker, DirectionsRenderer, DrawingManager, Polygon, InfoWindow } from '@react-google-maps/api';
import { Satellite, Map, Search, X, Star, Loader2 } from 'lucide-react';
import { getMapIcon } from '../utils/mapIcons';

type LatLng = { lat: number; lng: number };

export interface RouteData {
    id: string;
    directions: google.maps.DirectionsResult;
    color: string;
    targetAddress: string;
    label: string;
    note?: string;
    abbrev: string;
}

interface MapDisplayProps {
    center?: LatLng;
    origin: LatLng | null;
    target: LatLng | null;
    routes: RouteData[];
    activeRouteId: string | null;
    polygonPath?: LatLng[];
    isDrawingMode?: boolean;
    onMapClick?: (lat: number, lng: number, placeId?: string) => void;
    onRouteClick?: (routeId: string) => void;
    onPolygonComplete?: (path: LatLng[]) => void;
}

const containerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: -23.5505, lng: -46.6333 };

const fmtDist = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;

export const MapDisplay = ({
    center: propCenter,
    origin, target, routes, activeRouteId,
    polygonPath, isDrawingMode, onMapClick, onRouteClick, onPolygonComplete
}: MapDisplayProps) => {
    const center = useMemo(() => origin || propCenter || defaultCenter, [origin, propCenter]);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [isSatellite, setIsSatellite] = useState(false);

    useEffect(() => {
        if (!map) return;
        if (origin) {
            map.panTo(origin);
            map.setZoom(17);
        } else if (propCenter) {
            map.panTo(propCenter);
            map.setZoom(14);
        }
    }, [map, origin, propCenter]);

    const [searchText, setSearchText] = useState('');
    const [isSearchingNearby, setIsSearchingNearby] = useState(false);
    const [searchResults, setSearchResults] = useState<google.maps.places.PlaceResult[]>([]);
    const [activeResult, setActiveResult] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    const calcOriginPosition = useMemo(() => {
        if (polygonPath && polygonPath.length > 0 && typeof window !== 'undefined' && window.google) {
            const bounds = new window.google.maps.LatLngBounds();
            polygonPath.forEach(p => bounds.extend(p));
            return { lat: bounds.getCenter().lat(), lng: bounds.getCenter().lng() };
        }
        return origin;
    }, [polygonPath, origin]);

    const options = useMemo(() => ({
        disableDefaultUI: true, zoomControl: true, mapId: "4504f8b37365c3d0",
    }), []);

    useEffect(() => {
        if (!map || !inputRef.current || autocompleteRef.current) return;
        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
            componentRestrictions: { country: 'br' },
            fields: ['geometry', 'name'],
        });
        autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current!.getPlace();
            if (place.geometry?.location) {
                map.panTo(place.geometry.location);
                map.setZoom(17);
                setSearchText('');
                setSearchResults([]);
                inputRef.current?.blur();
            }
        });
    }, [map]);

    const searchNearby = () => {
        if (!map || !searchText.trim()) return;
        const mapCenter = map.getCenter();
        if (!mapCenter) return;
        setIsSearchingNearby(true);
        setSearchResults([]);
        setActiveResult(null);
        const svc = new google.maps.places.PlacesService(map);
        svc.textSearch({
            query: searchText,
            location: mapCenter,
            radius: 3000,
        }, (results, status) => {
            setIsSearchingNearby(false);
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                setSearchResults(results.slice(0, 10));
            }
        });
    };

    const clearSearch = () => {
        setSearchText('');
        setSearchResults([]);
        setActiveResult(null);
        inputRef.current?.focus();
    };

    const toggleSatellite = () => {
        if (!map) return;
        const next = !isSatellite;
        map.setMapTypeId(next ? 'hybrid' : 'roadmap');
        setIsSatellite(next);
    };

    const handleMapClick = (e: google.maps.MapMouseEvent) => {
        if (isDrawingMode) return;
        setActiveResult(null);
        if (e.latLng && onMapClick) {
            // @ts-ignore
            onMapClick(e.latLng.lat(), e.latLng.lng(), e.placeId);
        }
    };

    const handlePolygonComplete = (polygon: google.maps.Polygon) => {
        if (onPolygonComplete) {
            const path = polygon.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
            onPolygonComplete(path);
            polygon.setMap(null);
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '0.5rem', overflow: 'hidden' }}>
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={center} zoom={14}
                options={options}
                onClick={handleMapClick}
                onLoad={setMap}
            >
                {calcOriginPosition && (
                    <Marker position={calcOriginPosition}
                        zIndex={999}
                        icon={{
                            url: getMapIcon({ status: 'terrain', label: 'TER' }),
                            scaledSize: new window.google.maps.Size(40, 48),
                            anchor: new window.google.maps.Point(20, 48)
                        }}
                    />
                )}

                {polygonPath && (
                    <Polygon paths={polygonPath}
                        options={{ fillColor: "#10b981", fillOpacity: 0.3, strokeColor: "#10b981", strokeWeight: 2 }}
                    />
                )}

                <DrawingManager
                    onPolygonComplete={handlePolygonComplete}
                    options={{
                        drawingControl: false,
                        polygonOptions: { fillColor: "#10b981", fillOpacity: 0.3, strokeWeight: 2, clickable: false, editable: true, zIndex: 1 },
                    }}
                    drawingMode={isDrawingMode ? google.maps.drawing.OverlayType.POLYGON : null}
                />

                {routes.map((route, index) => {
                    const isActive = route.id === activeRouteId;
                    return (
                        <React.Fragment key={route.id}>
                            {route.directions.routes[0]?.legs[0]?.end_location && (
                                <Marker
                                    position={route.directions.routes[0].legs[0].end_location}
                                    zIndex={isActive ? 900 : (100 + index)}
                                    onClick={() => onRouteClick && onRouteClick(route.id)}
                                    icon={{
                                        url: getMapIcon({ status: (route.color === '#F07D00' || route.color === '#ef4444') ? 'fail' : 'success', label: route.abbrev }),
                                        scaledSize: new window.google.maps.Size(40, 48),
                                        anchor: new window.google.maps.Point(20, 48)
                                    }}
                                />
                            )}
                            <DirectionsRenderer
                                directions={route.directions}
                                options={{
                                    suppressMarkers: true,
                                    preserveViewport: index > 0,
                                    polylineOptions: { strokeColor: route.color, strokeWeight: isActive ? 12 : 7, strokeOpacity: isActive ? 1.0 : 0.7, zIndex: isActive ? 50 : 10, clickable: true }
                                }}
                                // @ts-ignore
                                onDirectionsChanged={() => { }}
                            />
                        </React.Fragment>
                    );
                })}

                {searchResults.map((result, i) => {
                    if (!result.geometry?.location) return null;
                    const isActive = activeResult === i;
                    return (
                        <React.Fragment key={`sr-${i}`}>
                            <Marker
                                position={result.geometry.location}
                                zIndex={isActive ? 800 : 200 + i}
                                onClick={() => setActiveResult(isActive ? null : i)}
                                label={{ text: String(i + 1), color: "white", fontWeight: "bold", fontSize: "11px" }}
                                icon={{
                                    path: google.maps.SymbolPath.CIRCLE,
                                    scale: isActive ? 18 : 14,
                                    fillColor: "#005CA9",
                                    fillOpacity: 1,
                                    strokeColor: "#ffffff",
                                    strokeWeight: isActive ? 4 : 2,
                                }}
                            />
                            {isActive && (
                                <InfoWindow
                                    position={result.geometry.location}
                                    onCloseClick={() => setActiveResult(null)}
                                >
                                    <div style={{ fontFamily: 'sans-serif', maxWidth: 220, padding: '2px 0' }}>
                                        <strong style={{ fontSize: 13, color: '#111' }}>{result.name}</strong>
                                        {result.vicinity && <p style={{ fontSize: 11, color: '#555', margin: '4px 0 0' }}>{result.vicinity}</p>}
                                        <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 11, color: '#444' }}>
                                            {result.rating && (
                                                <span>⭐ {result.rating.toFixed(1)}{result.user_ratings_total ? ` (${result.user_ratings_total})` : ''}</span>
                                            )}
                                            {origin && result.geometry?.location && (
                                                <span>📍 {fmtDist(google.maps.geometry.spherical.computeDistanceBetween(
                                                    new google.maps.LatLng(origin),
                                                    result.geometry.location
                                                ))}</span>
                                            )}
                                        </div>
                                    </div>
                                </InfoWindow>
                            )}
                        </React.Fragment>
                    );
                })}
            </GoogleMap>

            {/* ── Search Box ─────────────────────────────────────────────── */}
            <div style={{
                position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)',
                zIndex: 20, width: 'min(440px, calc(100vw - 180px))',
                display: 'flex', flexDirection: 'column',
                filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center',
                    background: 'rgba(10,12,18,0.92)', backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderRadius: searchResults.length > 0 ? '14px 14px 0 0' : 14,
                    border: '1px solid rgba(255,255,255,0.13)',
                    borderBottom: searchResults.length > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined,
                    overflow: 'hidden',
                }}>
                    <div style={{ padding: '0 12px', color: '#6b7280', flexShrink: 0, display: 'flex' }}>
                        {isSearchingNearby
                            ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            : <Search size={16} />}
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchText}
                        onChange={e => { setSearchText(e.target.value); if (searchResults.length > 0) { setSearchResults([]); setActiveResult(null); } }}
                        placeholder="Navegar ou buscar ao redor… (Enter = buscar)"
                        style={{
                            flex: 1, background: 'transparent', border: 'none', outline: 'none',
                            color: '#fff', fontSize: 13, padding: '11px 4px',
                            fontFamily: 'inherit', minWidth: 0,
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); searchNearby(); }
                            if (e.key === 'Escape') clearSearch();
                        }}
                    />
                    {searchText && (
                        <button onClick={searchNearby} style={{
                            padding: '0 10px', background: 'rgba(0,92,169,0.85)', border: 'none',
                            cursor: 'pointer', color: '#fff', fontSize: 11, fontWeight: 700,
                            fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
                            height: '100%', flexShrink: 0, letterSpacing: '0.04em',
                        }}>
                            <Search size={12} /> BUSCAR
                        </button>
                    )}
                    {(searchText || searchResults.length > 0) && (
                        <button onClick={clearSearch} style={{
                            padding: '0 12px', background: 'none', border: 'none',
                            cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', flexShrink: 0,
                        }}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                {searchResults.length > 0 && (
                    <div style={{
                        background: 'rgba(10,12,18,0.95)', backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.13)', borderTop: 'none',
                        borderRadius: '0 0 14px 14px',
                        maxHeight: 280, overflowY: 'auto',
                    }}>
                        <p style={{ padding: '6px 14px', fontSize: 10, color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                            {searchResults.length} resultado{searchResults.length > 1 ? 's' : ''} encontrado{searchResults.length > 1 ? 's' : ''}
                        </p>
                        {searchResults.map((result, i) => {
                            const dist = (origin && result.geometry?.location)
                                ? google.maps.geometry.spherical.computeDistanceBetween(
                                    new google.maps.LatLng(origin), result.geometry.location)
                                : null;
                            const isActive = activeResult === i;
                            return (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setActiveResult(isActive ? null : i);
                                        if (result.geometry?.location && map) map.panTo(result.geometry.location);
                                    }}
                                    style={{
                                        width: '100%', textAlign: 'left', background: isActive ? 'rgba(0,92,169,0.18)' : 'transparent',
                                        border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)',
                                        padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,92,169,0.12)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = isActive ? 'rgba(0,92,169,0.18)' : 'transparent')}
                                >
                                    <span style={{
                                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                        background: '#005CA9', color: '#fff', fontSize: 11, fontWeight: 700,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>{i + 1}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#f3f4f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {result.name}
                                        </p>
                                        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {result.vicinity || result.formatted_address || ''}
                                        </p>
                                    </div>
                                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                        {dist !== null && (
                                            <p style={{ margin: 0, fontSize: 11, color: '#F07D00', fontWeight: 700 }}>{fmtDist(dist)}</p>
                                        )}
                                        {result.rating && (
                                            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#fbbf24' }}>
                                                ⭐ {result.rating.toFixed(1)}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Satellite toggle ──────────────────────────────────────── */}
            <button
                onClick={toggleSatellite}
                title={isSatellite ? 'Voltar ao mapa padrão' : 'Ver imagem de satélite'}
                style={{
                    position: 'absolute', bottom: 24, left: 12, zIndex: 10,
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 13px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.35)', transition: 'all 0.2s',
                    background: isSatellite ? 'rgba(16,185,129,0.95)' : 'rgba(15,15,20,0.82)',
                    color: '#fff', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                }}
            >
                {isSatellite ? <><Map size={14} /> Mapa</> : <><Satellite size={14} /> Satélite</>}
            </button>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};
