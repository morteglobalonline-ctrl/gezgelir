import React from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function FitBounds({ points }) {
  const map = useMap();
  React.useEffect(() => {
    if (points && points.length > 1) {
      map.fitBounds(points, { padding: [26, 26] });
    }
  }, [points, map]);
  return null;
}

export default function RouteMap({ points = [], height = 176 }) {
  if (!points || points.length < 2) return null;
  const start = points[0];
  const end = points[points.length - 1];
  const center = points[Math.floor(points.length / 2)];

  return (
    <div
      className="rounded-2xl overflow-hidden border border-gg-line relative"
      style={{ height }}
      data-testid="route-map"
    >
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        dragging={true}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%", background: "#E6F7F0" }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        <Polyline positions={points} pathOptions={{ color: "#00C27A", weight: 5, opacity: 0.95 }} />
        <CircleMarker center={start} radius={7}
          pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#00C27A", fillOpacity: 1 }} />
        <CircleMarker center={end} radius={7}
          pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#1A1F23", fillOpacity: 1 }} />
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}
