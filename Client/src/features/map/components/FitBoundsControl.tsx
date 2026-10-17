import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Maximize2 } from 'lucide-react';

interface FitBoundsControlProps {
  markers: Array<{ lat: number; lng: number }>;
}

export const FitBoundsControl: React.FC<FitBoundsControlProps> = ({ markers }) => {
  const map = useMap();

  const handleFit = () => {
    if (!markers || markers.length === 0) return;
    const validMarkers = markers.filter(
      (m) => typeof m.lat === 'number' && typeof m.lng === 'number' && !isNaN(m.lat) && !isNaN(m.lng)
    );
    if (validMarkers.length === 0) return;

    const bounds = L.latLngBounds(validMarkers.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  };

  useEffect(() => {
    handleFit();
  }, [markers]);

  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '10px', marginRight: '10px', pointerEvents: 'auto' }}>
      <div className="leaflet-control">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleFit}
          className="shadow-md bg-card/90 backdrop-blur border text-xs gap-1.5 h-8 px-2.5"
          title="Fit view to all markers"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span>Fit All</span>
        </Button>
      </div>
    </div>
  );
};
