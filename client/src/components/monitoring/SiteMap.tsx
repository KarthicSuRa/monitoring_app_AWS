import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MonitoredSite } from '../../types';

// Safely parse checked_at — the DynamoDB SK may be "2026-04-06T12:00:00.000Z#abc12345"
const parseCheckedAt = (raw: string | undefined | null): string => {
    if (!raw) return 'N/A';
    const clean = raw.includes('#') ? raw.split('#')[0] : raw;
    try {
        return new Date(clean).toLocaleString();
    } catch {
        return raw;
    }
};

// Inject ping animation CSS once
if (typeof document !== 'undefined' && !document.getElementById('mcm-map-style')) {
    const style = document.createElement('style');
    style.id = 'mcm-map-style';
    style.textContent = `@keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }`;
    document.head.appendChild(style);
}

const createStatusIcon = (status: 'online' | 'offline' | 'unknown') => {
    const color = status === 'online' ? '#22c55e' : status === 'offline' ? '#ef4444' : '#9ca3af';
    const pulse = status === 'offline'
        ? `<span style="position:absolute;top:-4px;left:-4px;width:24px;height:24px;border-radius:50%;background:${color};opacity:0.4;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>`
        : '';
    const html = `
        <span style="position:relative;display:inline-block;width:16px;height:16px;">
            ${pulse}
            <span style="position:relative;background-color:${color};width:16px;height:16px;border-radius:50%;display:block;border:2.5px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4);"></span>
        </span>`;
    return new L.DivIcon({ html, className: 'bg-transparent', iconSize: [16, 16], iconAnchor: [8, 8] });
};

interface SiteMapProps {
    sites: MonitoredSite[];
    loading: boolean;
    error: string | null;
    center: L.LatLngExpression;
    zoom: number;
}

const ChangeView = ({ center, zoom }: { center: L.LatLngExpression; zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, zoom, { animate: true, duration: 0.8 });
    }, [center, zoom, map]);
    return null;
};

export default function SiteMap({ sites, loading, error, center, zoom }: SiteMapProps) {
    const [currentTheme, setCurrentTheme] = useState(
        document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    );
    const [tileLayerKey, setTileLayerKey] = useState(Date.now());

    useEffect(() => {
        const observer = new MutationObserver(() => {
            const newTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
            if (newTheme !== currentTheme) {
                setCurrentTheme(newTheme);
                setTileLayerKey(Date.now());
            }
        });
        observer.observe(document.documentElement, { attributes: true });
        return () => observer.disconnect();
    }, [currentTheme]);

    const mapUrl = currentTheme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <p className="text-slate-400 text-sm">Loading map…</p>
        </div>
    );
    if (error) return (
        <div className="flex items-center justify-center h-full">
            <p className="text-red-500 text-sm">Error: {error}</p>
        </div>
    );

    const displayedSites = sites.filter(s => s.latitude && s.longitude);

    return (
        <MapContainer center={center} zoom={zoom} scrollWheelZoom={false}
            className="h-full w-full bg-card rounded-lg shadow-inner z-0">
            <ChangeView center={center} zoom={zoom} />
            <TileLayer key={tileLayerKey} url={mapUrl} attribution={attribution} />
            {displayedSites.map(site => {
                const status = (site.status as 'online' | 'offline' | 'unknown') ?? 'unknown';
                const checkedAt = parseCheckedAt(
                    (site.latest_ping as any)?.checked_at_iso
                    ?? site.latest_ping?.checked_at
                    ?? (site as any).last_checked_at
                );
                return (
                    <Marker key={site.id} position={[site.latitude!, site.longitude!]} icon={createStatusIcon(status)}>
                        <Popup>
                            <div style={{ minWidth: 180, fontSize: 13 }}>
                                <b style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>{site.name}</b>
                                <span style={{
                                    fontWeight: 600,
                                    color: status === 'online' ? '#16a34a' : status === 'offline' ? '#dc2626' : '#6b7280'
                                }}>
                                    ● {status}
                                </span>
                                {site.latest_ping?.response_time_ms != null && (
                                    <span style={{ marginLeft: 8, color: '#6b7280', fontSize: 11 }}>
                                        {site.latest_ping.response_time_ms}ms
                                    </span>
                                )}
                                <br />
                                <span style={{ color: '#6b7280', fontSize: 11 }}>
                                    Last checked: {checkedAt}
                                </span>
                                {site.url && (
                                    <>
                                        <br />
                                        <a href={site.url} target="_blank" rel="noopener noreferrer"
                                            style={{ color: '#3b82f6', fontSize: 11, wordBreak: 'break-all' }}>
                                            {site.url}
                                        </a>
                                    </>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}
