import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, Satellite } from "lucide-react";
import type { MapMarker } from "./MapCanvas";

const MapCanvas = lazy(() => import("./MapCanvas"));

const GOOGLE_KEY = import.meta.env["VITE_GOOGLE_MAPS_API_KEY"] as string | undefined;

export type { MapMarker };

/**
 * Interactive map. Uses OpenStreetMap tiles by default (no key required).
 * When VITE_GOOGLE_MAPS_API_KEY is configured, a Google Maps view is offered too.
 * Both providers degrade to a plain skeleton/list rather than breaking the page.
 */
export function ComplaintMap({
  markers = [],
  center,
  zoom = 13,
  onPick,
  className = "h-80",
}: {
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
}) {
  const [provider, setProvider] = useState<"osm" | "google">("osm");
  const focus = center ?? (markers[0] ? [markers[0].lat, markers[0].lng] : [20.5937, 78.9629]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-muted ${className}`}>
      {GOOGLE_KEY && (
        <div className="absolute right-3 top-3 z-10 flex gap-1 rounded-xl glass p-1">
          <Button
            size="sm"
            variant={provider === "osm" ? "default" : "ghost"}
            onClick={() => setProvider("osm")}
          >
            <MapIcon className="size-4" /> Open map
          </Button>
          <Button
            size="sm"
            variant={provider === "google" ? "default" : "ghost"}
            onClick={() => setProvider("google")}
          >
            <Satellite className="size-4" /> Google
          </Button>
        </div>
      )}

      {provider === "google" && GOOGLE_KEY ? (
        <iframe
          title="Complaint location"
          className="size-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps/embed/v1/view?key=${GOOGLE_KEY}&center=${focus[0]},${focus[1]}&zoom=${zoom}`}
        />
      ) : (
        <ClientOnly fallback={<Skeleton className="size-full" />}>
          <Suspense fallback={<Skeleton className="size-full" />}>
            <MapCanvas
              markers={markers}
              center={[focus[0] as number, focus[1] as number]}
              zoom={zoom}
              onPick={onPick}
            />
          </Suspense>
        </ClientOnly>
      )}
    </div>
  );
}
