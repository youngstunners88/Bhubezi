import React, { useEffect, useState, useRef, useMemo } from 'react';
import type { ActivePing } from '../types';
import { TAXI_RANKS } from '../constants';

// Leaflet type declaration for window object
declare global {
  interface Window {
    L: typeof import('leaflet');
  }
}

interface Props {
  originId?: string;
  destinationId?: string;
  activePings?: ActivePing[];
  activeRoutePath?: { x: number; y: number }[];
  userCoords?: { x: number; y: number } | null;
  otherDrivers?: { id: string; name: string; coords: {x: number, y: number} }[];
}

const percentToLatLng = (x: number, y: number) => {
  const lat = -26.3 + (1 - y / 100) * 0.2;
  const lng = 27.9 + (x / 100) * 0.3;
  return [lat, lng] as [number, number];
};

const RouteMap: React.FC<Props> = ({
  originId,
  destinationId,
  activePings = [],
  activeRoutePath,
  userCoords,
  otherDrivers = []
}) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);

  // Memoize props to prevent unnecessary re-renders
  const memoizedPings = useMemo(() => activePings, [activePings]);
  const memoizedOtherDrivers = useMemo(() => otherDrivers, [otherDrivers]);
  const memoizedRoutePath = useMemo(() => activeRoutePath, [activeRoutePath]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    
    if (!window.L) {
      return;
    }

    const map = window.L.map(containerRef.current, {
      center: [-26.2041, 28.0473],
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 250);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle resize
  useEffect(() => {
    if (mapReady && mapRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      });
      if (containerRef.current) resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [mapReady]);

  // Update origin/destination markers - only when originId/destinationId changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    
    const map = mapRef.current;
    
    // Only clear origin/destination markers
    map.eachLayer((layer: any) => {
      if ((layer as any)._isOriginDestMarker) {
        map.removeLayer(layer);
      }
    });

    TAXI_RANKS.forEach(rank => {
      const isOrigin = rank.id === originId;
      const isDest = rank.id === destinationId;
      
      if (isOrigin || isDest) {
        const [lat, lng] = percentToLatLng(rank.coords.x, rank.coords.y);
        const icon = window.L.divIcon({
          className: '',
          html: `<div class="${isOrigin ? 'bg-yellow-400' : 'bg-red-500'} p-2 rounded-full border-2 border-black shadow-lg scale-125 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            ${isDest ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="3"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>'}
          </div>`,
          iconSize: [0, 0]
        });
        const marker = window.L.marker([lat, lng], { icon }).addTo(map);
        (marker as any)._isOriginDestMarker = true;
        if (isOrigin) map.panTo([lat, lng]);
      }
    });
  }, [mapReady, originId, destinationId]);

  // Draw route path - only when activeRoutePath changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    
    const map = mapRef.current;
    
    // Clear only route layers
    map.eachLayer((layer: any) => {
      if ((layer as any)._isRouteLayer) {
        map.removeLayer(layer);
      }
    });

    if (memoizedRoutePath && memoizedRoutePath.length > 1) {
      const latLngs = memoizedRoutePath.map(p => percentToLatLng(p.x, p.y));
      const routeLayer = window.L.polyline(latLngs, {
        color: '#3b82f6',
        weight: 6,
        opacity: 0.8,
        lineCap: 'round'
      }).addTo(map);
      (routeLayer as any)._isRouteLayer = true;
    }
  }, [mapReady, memoizedRoutePath]);

  // Update user location marker - only when userCoords changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    
    const map = mapRef.current;
    
    // Clear only user marker
    map.eachLayer((layer: any) => {
      if ((layer as any)._isUserMarker) {
        map.removeLayer(layer);
      }
    });

    if (userCoords) {
      const [lat, lng] = percentToLatLng(userCoords.x, userCoords.y);
      const icon = window.L.divIcon({
        className: '',
        html: `<div class="w-8 h-8 bg-blue-600 rounded-full border-4 border-white shadow-2xl flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>`,
        iconSize: [0, 0]
      });
      const marker = window.L.marker([lat, lng], { icon }).addTo(map);
      (marker as any)._isUserMarker = true;
    }
  }, [mapReady, userCoords]);

  // Update ping markers - only when activePings changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    
    const map = mapRef.current;
    
    // Clear only ping markers
    map.eachLayer((layer: any) => {
      if ((layer as any)._isPingMarker) {
        map.removeLayer(layer);
      }
    });

    memoizedPings.forEach(p => {
      const coords = p.customCoords || TAXI_RANKS.find(r => r.id === p.rankId)?.coords;
      if (coords) {
        const [lat, lng] = percentToLatLng(coords.x, coords.y);
        const icon = window.L.divIcon({
          className: '',
          html: `<div class="p-2 rounded-full border-2 border-black shadow-xl ${p.isCustom ? 'bg-blue-500' : 'bg-green-500'} transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>`,
          iconSize: [0, 0]
        });
        const marker = window.L.marker([lat, lng], { icon }).addTo(map);
        (marker as any)._isPingMarker = true;
      }
    });
  }, [mapReady, memoizedPings]);

  // Update other driver markers - only when otherDrivers changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    
    const map = mapRef.current;
    
    // Clear only driver markers
    map.eachLayer((layer: any) => {
      if ((layer as any)._isDriverMarker) {
        map.removeLayer(layer);
      }
    });

    memoizedOtherDrivers.forEach(driver => {
      const [lat, lng] = percentToLatLng(driver.coords.x, driver.coords.y);
      const icon = window.L.divIcon({
        className: '',
        html: `<div class="w-6 h-6 bg-orange-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><rect x="3" y="4" width="18" height="12" rx="2"/><line x1="6" x2="6" y1="8" y2="8"/><line x1="6" x2="6" y1="12" y2="12"/></svg>
        </div>`,
        iconSize: [0, 0]
      });
      const marker = window.L.marker([lat, lng], { icon }).addTo(map);
      (marker as any)._isDriverMarker = true;
    });
  }, [mapReady, memoizedOtherDrivers]);

  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden rounded-[2.5rem]">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl border-2 border-black pointer-events-none shadow-xl z-[1000]">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
          <span className="text-[11px] font-black text-black uppercase tracking-widest leading-none">JOZI LIVE NETWORK</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(RouteMap);
