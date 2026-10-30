"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Layers, ExternalLink, Search, Loader2 } from "lucide-react";

// Fix default marker icon for Next.js / Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom styled farm pin icon
const farmMarkerIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface LocationData {
  lat: number;
  lng: number;
  village?: string;
  district?: string;
  state?: string;
  pincode?: string;
  fullAddress?: string;
}

export interface MapPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationChange: (data: LocationData) => void;
  className?: string;
}

// Reverse geocode lat/lng
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<Omit<LocationData, "lat" | "lng">> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return {};

    const data = await res.json();
    const addr = data.address ?? {};

    return {
      village: addr.village || addr.suburb || addr.town || addr.city || undefined,
      district: addr.county || addr.state_district || addr.district || undefined,
      state: addr.state || undefined,
      pincode: addr.postcode || undefined,
      fullAddress: data.display_name || undefined,
    };
  } catch (err) {
    console.error("Reverse geocode failed:", err);
    return {};
  }
}

// Forward geocode by pincode or place query
export async function geocodeByPincode(
  pincode: string
): Promise<LocationData | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(
        pincode.trim()
      )}&country=India&format=json&addressdetails=1&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return null;

    const results = await res.json();
    if (!results || results.length === 0) return null;

    const item = results[0];
    const addr = item.address ?? {};

    return {
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      village: addr.village || addr.suburb || addr.town || addr.city || undefined,
      district: addr.county || addr.state_district || addr.district || undefined,
      state: addr.state || undefined,
      pincode: addr.postcode || pincode,
      fullAddress: item.display_name || undefined,
    };
  } catch (err) {
    console.error("Pincode geocode failed:", err);
    return null;
  }
}

// Search by query (village, district, town)
export async function searchLocationQuery(query: string): Promise<LocationData | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query.trim() + ", India"
      )}&format=json&addressdetails=1&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return null;
    const results = await res.json();
    if (!results || results.length === 0) return null;

    const item = results[0];
    const addr = item.address ?? {};

    return {
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      village: addr.village || addr.suburb || addr.town || addr.city || undefined,
      district: addr.county || addr.state_district || addr.district || undefined,
      state: addr.state || undefined,
      pincode: addr.postcode || undefined,
      fullAddress: item.display_name || undefined,
    };
  } catch (err) {
    console.error("Location search failed:", err);
    return null;
  }
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const prevRef = useRef({ lat, lng });

  useEffect(() => {
    if (lat !== prevRef.current.lat || lng !== prevRef.current.lng) {
      map.setView([lat, lng], 14, { animate: true });
      prevRef.current = { lat, lng };
    }
  }, [lat, lng, map]);

  return null;
}

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;
const LOCATED_ZOOM = 14;

export default function MapPicker({
  latitude,
  longitude,
  onLocationChange,
  className,
}: MapPickerProps) {
  const hasInitialCoords = latitude !== undefined && longitude !== undefined;

  const [position, setPosition] = useState<[number, number]>(
    hasInitialCoords ? [latitude, longitude] : INDIA_CENTER
  );
  const [mapType, setMapType] = useState<"satellite" | "street">("satellite");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const onLocationChangeRef = useRef(onLocationChange);
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    if (latitude !== undefined && longitude !== undefined) {
      setPosition([latitude, longitude]);
    }
  }, [latitude, longitude]);

  const handlePositionChange = useCallback(
    async (lat: number, lng: number) => {
      setPosition([lat, lng]);
      setIsGeocoding(true);
      try {
        const details = await reverseGeocode(lat, lng);
        onLocationChangeRef.current({ lat, lng, ...details });
      } catch {
        onLocationChangeRef.current({ lat, lng });
      } finally {
        setIsGeocoding(false);
      }
    },
    []
  );

  const handleMarkerDragEnd = useCallback(
    (e: L.DragEndEvent) => {
      const marker = e.target as L.Marker;
      const { lat, lng } = marker.getLatLng();
      handlePositionChange(lat, lng);
    },
    [handlePositionChange]
  );

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        handlePositionChange(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setIsLocating(false);
        console.warn("Location error:", err);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const result = await searchLocationQuery(searchQuery);
      if (result) {
        handlePositionChange(result.lat, result.lng);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const googleMapsUrl = `https://www.google.com/maps?q=${position[0]},${position[1]}`;

  return (
    <div
      className={`relative w-full rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm bg-slate-900 ${
        className ?? ""
      }`}
    >
      {/* Top Map Action Bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Search bar */}
        <form
          onSubmit={handleSearch}
          className="pointer-events-auto flex items-center bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/80 px-3 py-1.5 flex-1 max-w-xs transition-all focus-within:ring-2 focus-within:ring-emerald-500"
        >
          <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search village, mandal, district..."
            className="w-full text-xs font-inter bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
          />
          {isSearching && <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin ml-1" />}
        </form>

        {/* Action Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {/* Map Layer Switcher */}
          <button
            type="button"
            onClick={() => setMapType((prev) => (prev === "satellite" ? "street" : "satellite"))}
            className="bg-white/95 hover:bg-white text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-lg border border-slate-200 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
            title="Toggle Satellite / Normal View"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">
              {mapType === "satellite" ? "🛰️ Google Satellite" : "🗺️ Standard Map"}
            </span>
          </button>

          {/* GPS Locate Button */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 disabled:opacity-70"
            title="Locate my farm using GPS"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">GPS Auto-Detect</span>
          </button>

          {/* Direct Google Maps link */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/95 hover:bg-white text-slate-700 text-xs font-medium p-2 rounded-xl shadow-lg border border-slate-200 flex items-center justify-center transition-all hover:scale-105"
            title="Open exact spot in Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
          </a>
        </div>
      </div>

      {/* Geocoding notification banner */}
      {isGeocoding && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-xl backdrop-blur-md flex items-center gap-2 border border-slate-700 animate-pulse">
          <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          <span>Pinpointing address & coordinates...</span>
        </div>
      )}

      {/* Map Hint */}
      <div className="absolute bottom-3 left-3 z-[1000] pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md text-emerald-300 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-slate-700/60 shadow flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span>Click anywhere or drag marker to set exact field boundary</span>
        </div>
      </div>

      <MapContainer
        center={hasInitialCoords ? [latitude, longitude] : INDIA_CENTER}
        zoom={hasInitialCoords ? LOCATED_ZOOM : DEFAULT_ZOOM}
        scrollWheelZoom
        className="w-full h-full min-h-[340px] z-0"
        style={{ minHeight: "340px" }}
      >
        {mapType === "satellite" ? (
          // Google Hybrid / Satellite Tiles (Satellite Imagery + Roads/Labels)
          <TileLayer
            attribution='&copy; <a href="https://maps.google.com">Google Maps</a> Imagery'
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            maxZoom={20}
          />
        ) : (
          // OpenStreetMap Standard Map
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        )}

        <Marker
          position={position}
          draggable
          icon={farmMarkerIcon}
          eventHandlers={{ dragend: handleMarkerDragEnd }}
        />
        <MapClickHandler onClick={handlePositionChange} />
        <RecenterMap lat={position[0]} lng={position[1]} />
      </MapContainer>
    </div>
  );
}
