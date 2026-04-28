import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Stop } from '../types';

interface RouteMapProps {
  coordinates: [number, number][];
  stops: Stop[];
  tripSummary?: {
    total_distance_miles: number;
    total_duration_hours: number;
  };
}

// Fix Leaflet marker icons
const defaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const pickupIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const dropoffIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const restIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const FitRouteBounds: React.FC<{ coordinates: [number, number][] }> = ({ coordinates }) => {
  const map = useMap();

  useEffect(() => {
    if (!coordinates || coordinates.length < 2) {
      return;
    }
    map.fitBounds(coordinates, { padding: [30, 30] });
  }, [coordinates, map]);

  return null;
};

const RouteMap: React.FC<RouteMapProps> = ({ coordinates, stops, tripSummary }) => {
  const [center, setCenter] = useState<[number, number]>([39, -95]);

  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      setCenter(coordinates[0]);
    }
  }, [coordinates]);

  const getMarkerIcon = (stopType: string) => {
    switch (stopType) {
      case 'pickup':
        return pickupIcon;
      case 'dropoff':
        return dropoffIcon;
      case 'rest':
      case 'fuel':
      case 'sleep':
        return restIcon;
      default:
        return defaultIcon;
    }
  };

  const formatTime = (timeStr: string): string => {
    try {
      return new Date(timeStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="premium-card interactive-lift animate-rise animate-delay-2 flex h-full flex-col overflow-hidden">
      {tripSummary && (
        <div className="bg-gradient-to-r from-[#0f2a47] via-[#18496f] to-[#1d8a8a] p-4 text-white">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide opacity-80">Total Distance</p>
              <p className="text-2xl font-bold">{tripSummary.total_distance_miles.toFixed(1)} miles</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide opacity-80">Estimated Duration</p>
              <p className="text-2xl font-bold">{tripSummary.total_duration_hours.toFixed(1)} hours</p>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <MapContainer
          center={center}
          zoom={5}
          style={{ height: '100%', minHeight: '480px' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />

          {coordinates.length > 0 && (
            <>
              <FitRouteBounds coordinates={coordinates} />
              <Polyline positions={coordinates} color="#f97316" weight={5} opacity={0.92} />
            </>
          )}

          {stops.map((stop, idx) => (
            <Marker
              key={idx}
              position={[stop.lat, stop.lng]}
              icon={getMarkerIcon(stop.type)}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">{stop.location_name}</p>
                  <p>{stop.type}</p>
                  <p className="text-xs">
                    {formatTime(stop.arrival_time)} - {formatTime(stop.departure_time)}
                  </p>
                  <p className="text-xs italic">{stop.notes}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl bg-white/88 px-3 py-2 text-xs shadow-lg backdrop-blur-sm animate-fade">
          <p className="mb-1 font-semibold text-[#0f2a47]">Map Legend</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600">
            <span>Green: Pickup</span>
            <span>Red: Dropoff</span>
            <span>Orange: Rest/Fuel</span>
            <span>Line: Planned Route</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteMap;
