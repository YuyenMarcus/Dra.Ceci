import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Leaflet's default icon URLs break under bundlers; point them at the imported
// asset URLs so the marker renders.
const pinIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Fallback center when a clinic has no pin yet (San Salvador, El Salvador).
const DEFAULT_CENTER = [13.6929, -89.2182];

// A Leaflet/OpenStreetMap map. With `editable`, the doctor can click or drag to
// place the clinic pin (calls `onChange({ lat, lng })`). Read-only by default:
// renders a static, non-interactive map centered on the pin for the public page.
export default function ClinicMap({
  lat,
  lng,
  editable = false,
  onChange,
  className = "",
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  // Keep the latest onChange without re-running the init effect.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const hasPin = Number.isFinite(lat) && Number.isFinite(lng);

  // Initialise the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: hasPin ? [lat, lng] : DEFAULT_CENTER,
      zoom: hasPin ? 16 : 12,
      zoomControl: editable,
      dragging: editable,
      scrollWheelZoom: false,
      doubleClickZoom: editable,
      boxZoom: editable,
      keyboard: editable,
      touchZoom: editable,
      attributionControl: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const placeMarker = (latlng) => {
      if (markerRef.current) {
        markerRef.current.setLatLng(latlng);
      } else {
        markerRef.current = L.marker(latlng, {
          icon: pinIcon,
          draggable: editable,
        }).addTo(map);
        if (editable) {
          markerRef.current.on("dragend", () => {
            const { lat: mlat, lng: mlng } = markerRef.current.getLatLng();
            onChangeRef.current?.({ lat: mlat, lng: mlng });
          });
        }
      }
    };

    if (hasPin) placeMarker([lat, lng]);

    if (editable) {
      map.on("click", (e) => {
        placeMarker(e.latlng);
        onChangeRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    }

    // The container may be sized after mount; nudge Leaflet to recompute.
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Init-once: editable never changes for a given mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable]);

  // Recenter / move the pin when coordinates change from outside (e.g. an
  // address search recenters an editable map, or the public page loads coords).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Pin was cleared: drop the marker too.
    if (!hasPin) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }
    const latlng = [lat, lng];
    if (markerRef.current) {
      markerRef.current.setLatLng(latlng);
    } else {
      markerRef.current = L.marker(latlng, {
        icon: pinIcon,
        draggable: editable,
      }).addTo(map);
      if (editable) {
        markerRef.current.on("dragend", () => {
          const { lat: mlat, lng: mlng } = markerRef.current.getLatLng();
          onChangeRef.current?.({ lat: mlat, lng: mlng });
        });
      }
    }
    map.setView(latlng, Math.max(map.getZoom(), 16));
  }, [lat, lng, hasPin, editable]);

  return <div ref={containerRef} className={className} />;
}
