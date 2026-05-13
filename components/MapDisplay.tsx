"use client";

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { GoogleMap, Marker, DirectionsRenderer, DrawingManager, Polygon } from '@react-google-maps/api';

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
    origin: LatLng | null;
    target: LatLng | null;
    routes: RouteData[];
    activeRouteId: string | null;
    polygonPath?: LatLng[]; // Path for the polygon
    isDrawingMode?: boolean; // Toggle drawing mode
    onMapClick?: (lat: number, lng: number, placeId?: string) => void;
    onRouteClick?: (routeId: string) => void;
    onPolygonComplete?: (path: LatLng[]) => void;
}

const containerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '0.5rem',
};

const defaultCenter = {
    lat: -23.5505, // Sao Paulo
    lng: -46.6333,
};

export const MapDisplay = ({
    origin,
    target,
    routes,
    activeRouteId,
    polygonPath,
    isDrawingMode,
    onMapClick,
    onRouteClick,
    onPolygonComplete
}: MapDisplayProps) => {
    const center = useMemo(() => origin || defaultCenter, [origin]);
    const [map, setMap] = useState<google.maps.Map | null>(null);

    const calcOriginPosition = useMemo(() => {
        if (polygonPath && polygonPath.length > 0 && typeof window !== 'undefined' && window.google) {
            const bounds = new window.google.maps.LatLngBounds();
            polygonPath.forEach(p => bounds.extend(p));
            return { lat: bounds.getCenter().lat(), lng: bounds.getCenter().lng() };
        }
        return origin;
    }, [polygonPath, origin]);

    const options = useMemo(() => ({
        disableDefaultUI: true,
        zoomControl: true,
        mapId: "4504f8b37365c3d0",
    }), []);

    const handleMapClick = (e: google.maps.MapMouseEvent) => {
        if (isDrawingMode) return; // Don't handle click if drawing
        if (e.latLng && onMapClick) {
            // @ts-ignore
            onMapClick(e.latLng.lat(), e.latLng.lng(), e.placeId);
        }
    };

    const handlePolygonComplete = (polygon: google.maps.Polygon) => {
        if (onPolygonComplete) {
            const path = polygon.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
            onPolygonComplete(path);
            polygon.setMap(null); // Remove the drawn instance, let React render it via props
        }
    };

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={14}
            options={options}
            onClick={handleMapClick}
            onLoad={setMap}
        >
            {/* Origin Marker (Reference Point 1) - Centered in polygon, or fallback to origin */}
            {calcOriginPosition && (
                <Marker
                    position={calcOriginPosition}
                    label={{
                        text: "TER",
                        color: "white",
                        fontWeight: "bold",
                        fontSize: "12px",
                    }}
                    title="Ponto de Referência (Origem)"
                    zIndex={999}
                    icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 18,
                        fillColor: "#10b981",
                        fillOpacity: 1,
                        strokeColor: "#ffffff",
                        strokeWeight: 4,
                    }}
                />
            )}

            {/* Polygon Rendering */}
            {polygonPath && (
                <Polygon
                    paths={polygonPath}
                    options={{
                        fillColor: "#10b981",
                        fillOpacity: 0.3,
                        strokeColor: "#10b981",
                        strokeWeight: 2,
                    }}
                />
            )}

            {/* Drawing Manager */}
            <DrawingManager
                onPolygonComplete={handlePolygonComplete}
                options={{
                    drawingControl: false,
                    polygonOptions: {
                        fillColor: "#10b981",
                        fillOpacity: 0.3,
                        strokeWeight: 2,
                        clickable: false,
                        editable: true,
                        zIndex: 1,
                    },
                }}
                drawingMode={isDrawingMode ? google.maps.drawing.OverlayType.POLYGON : null}
            />

            {/* Render Multiple Routes with Different Colors & Markers */}
            {routes.map((route, index) => {
                const markerLabel = route.abbrev;
                const isActive = route.id === activeRouteId;

                return (
                    <React.Fragment key={route.id}>
                        {route.directions.routes[0]?.legs[0]?.end_location && (
                            <Marker
                                position={route.directions.routes[0].legs[0].end_location}
                                label={{
                                    text: markerLabel,
                                    color: "white",
                                    fontWeight: "bold",
                                    fontSize: "10px",
                                }}
                                title={`Destino ${markerLabel}`}
                                zIndex={isActive ? 900 : (100 + index)}
                                onClick={() => onRouteClick && onRouteClick(route.id)}
                                icon={{
                                    path: google.maps.SymbolPath.CIRCLE,
                                    scale: 16,
                                    fillColor: route.color,
                                    fillOpacity: 1,
                                    strokeColor: "#ffffff",
                                    strokeWeight: 3,
                                }}
                            />
                        )}

                        <DirectionsRenderer
                            directions={route.directions}
                            options={{
                                suppressMarkers: true,
                                preserveViewport: index > 0,
                                polylineOptions: {
                                    strokeColor: route.color,
                                    strokeWeight: isActive ? 12 : 7,
                                    strokeOpacity: isActive ? 1.0 : 0.7,
                                    zIndex: isActive ? 50 : 10,
                                    clickable: true,
                                }
                            }}
                            // @ts-ignore 
                            onDirectionsChanged={() => { }}
                        />
                    </React.Fragment>
                );
            })}
        </GoogleMap>
    );
};
