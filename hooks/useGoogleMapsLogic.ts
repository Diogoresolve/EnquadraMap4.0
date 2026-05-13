"use client";

import { useCallback } from 'react';

type LatLng = { lat: number; lng: number };

export const useGoogleMapsLogic = (isLoaded: boolean) => {

    const geocodeAddress = useCallback(async (query: string): Promise<{ location: LatLng; formattedAddress: string } | null> => {
        if (!isLoaded || !window.google) return null;

        // 1. Try Places Text Search First (Better for "Faculdade X", "Padaria Y")
        const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));

        try {
            const placeResult: any = await new Promise((resolve) => {
                placesService.findPlaceFromQuery({
                    query: query,
                    fields: ['name', 'geometry', 'formatted_address']
                }, (results, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
                        resolve(results[0]);
                    } else {
                        resolve(null);
                    }
                });
            });

            if (placeResult) {
                console.log("Found via Places:", placeResult);
                return {
                    location: { lat: placeResult.geometry.location.lat(), lng: placeResult.geometry.location.lng() },
                    formattedAddress: `${placeResult.name} - ${placeResult.formatted_address}`
                };
            }
        } catch (e) {
            console.warn("Places search failed, falling back to Geocoder", e);
        }

        // 2. Fallback to Standard Geocoder (Better for strict addresses "Rua X, 123")
        const geocoder = new window.google.maps.Geocoder();
        return new Promise((resolve, reject) => {
            geocoder.geocode({ address: query }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    const location = results[0].geometry.location;
                    resolve({
                        location: { lat: location.lat(), lng: location.lng() },
                        formattedAddress: results[0].formatted_address,
                    });
                } else {
                    console.error("Geocoding failed: " + status);
                    if (status === 'REQUEST_DENIED' || status === 'ZERO_RESULTS') {
                        console.warn("API Error or No Results:", status);
                        resolve(null);
                    } else {
                        resolve(null);
                    }
                }
            });
        });
    }, [isLoaded]);

    const getRoute = useCallback(async (origin: LatLng, destination: LatLng, mode: 'WALKING' | 'TRANSIT' = 'WALKING'): Promise<{ directions: google.maps.DirectionsResult; distanceText: string; durationText: string; distanceValue: number; durationValue: number } | null> => {
        if (!isLoaded || !window.google) return null;

        const directionsService = new window.google.maps.DirectionsService();
        const travelMode = mode === 'TRANSIT' ? window.google.maps.TravelMode.TRANSIT : window.google.maps.TravelMode.WALKING;

        return new Promise((resolve, reject) => {
            directionsService.route(
                {
                    origin,
                    destination,
                    travelMode: travelMode,
                },
                (result, status) => {
                    if (status === 'OK' && result) {
                        const leg = result.routes[0].legs[0];
                        resolve({
                            directions: result,
                            distanceText: leg.distance?.text || '',
                            durationText: leg.duration?.text || '',
                            distanceValue: leg.distance?.value || 0, // meters
                            durationValue: leg.duration?.value || 0 // seconds
                        });
                    } else {
                        console.error(`Directions request failed (${mode}): ` + status);
                        resolve(null);
                    }
                }
            );
        });
    }, [isLoaded]);

    return { geocodeAddress, getRoute };
};
