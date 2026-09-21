import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  tone?: "primary" | "warning" | "critical" | "success";
  href?: string;
};

const TONE_COLORS: Record<string, string> = {
  primary: "#2f5bd7",
  warning: "#d98a1a",
  critical: "#d14033",
  success: "#1f9d6b",
};

function pinIcon(tone: string) {
  const color = TONE_COLORS[tone] ?? TONE_COLORS["primary"];
  return L.divIcon({
    className: "civic-pin",
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${color};box-shadow:0 0 0 4px ${color}33,0 2px 6px rgba(0,0,0,.35)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center[0], center[1], zoom, map]);
  return null;
}

function ClickCapture({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export default function MapCanvas({
  markers = [],
  center = [20.5937, 78.9629],
  zoom = 5,
  onPick,
}: {
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  onPick?: ((lat: number, lng: number) => void) | undefined;
}) {
  const key = useMemo(() => `${center[0]}-${center[1]}`, [center]);
  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom className="size-full" key={key}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} zoom={zoom} />
      {onPick && <ClickCapture onPick={onPick} />}
      {markers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={pinIcon(m.tone ?? "primary")}>
          <Popup>
            <span className="text-sm font-semibold">{m.title}</span>
            {m.subtitle && <span className="block text-xs text-muted-foreground">{m.subtitle}</span>}
            {m.href && (
              <a className="mt-1 block text-xs font-semibold text-primary" href={m.href}>
                Open complaint
              </a>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
