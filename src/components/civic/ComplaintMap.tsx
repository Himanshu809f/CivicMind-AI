import { ClientOnly } from "@tanstack/react-router";
import { Component, lazy, Suspense, useState, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, MapPinOff, RefreshCw, Satellite } from "lucide-react";
import type { MapMarker } from "./MapCanvas";

const MapCanvas = lazy(() => import("./MapCanvas"));

const GOOGLE_KEY = import.meta.env["VITE_GOOGLE_MAPS_API_KEY"] as string | undefined;

export type { MapMarker };

/**
 * Catches map render/load failures (e.g. tile library chunk failed to load)
 * and renders a coordinate list fallback with a retry action instead.
 */
class MapErrorBoundary extends Component<
  { children: ReactNode; markers: MapMarker[]; onRetry: () => void },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    console.error("Map failed to load:", error);
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MapPinOff className="size-6" />
        </span>
        <div className="space-y-1">
          <p className="font-display text-sm font-semibold">The map couldn't load</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            This is usually a temporary network hiccup. Choose{" "}
            <span className="font-medium text-foreground">Try again</span> below — the locations are
            also listed as coordinates so nothing is lost.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={() => {
            this.setState({ failed: false });
            this.props.onRetry();
          }}
        >
          <RefreshCw className="mr-1.5 size-3.5" /> Try again
        </Button>
        {this.props.markers.length > 0 && (
          <ul className="mt-1 w-full max-w-md space-y-1.5 overflow-y-auto text-left">
            {this.props.markers.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-background/70 px-3 py-2 text-xs"
              >
                <span className="min-w-0 truncate font-medium">{m.title}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {m.lat.toFixed(5)}, {m.lng.toFixed(5)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
}

/**
 * Interactive map. Uses OpenStreetMap tiles by default (no key required).
 * When VITE_GOOGLE_MAPS_API_KEY is configured, a Google Maps view is offered too.
 * Both providers degrade to a coordinate list with a retry action rather than breaking the page.
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
  const [mapKey, setMapKey] = useState(0);
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
          <MapErrorBoundary
            markers={markers}
            onRetry={() => setMapKey((k) => k + 1)}
          >
            <Suspense fallback={<Skeleton className="size-full" />}>
              <MapCanvas
                key={mapKey}
                markers={markers}
                center={[focus[0] as number, focus[1] as number]}
                zoom={zoom}
                onPick={onPick}
              />
            </Suspense>
          </MapErrorBoundary>
        </ClientOnly>
      )}
    </div>
  );
}
