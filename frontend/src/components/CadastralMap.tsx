"use client";

import React, { useEffect, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapBoundsController({
  center,
  geojson,
}: {
  center: [number, number];
  geojson: GeoJSON.Feature<GeoJSON.Polygon> | null;
}) {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 250);

    if (geojson) {
      try {
        const bounds = L.geoJSON(geojson).getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [60, 60], maxZoom: 18, animate: true });
        }
      } catch {
        map.setView(center, 16);
      }
    } else {
      map.setView(center, 16);
    }
  }, [center, geojson, map]);

  return null;
}

interface CadastralMapProps {
  documentId: string;
  tehsil: string | null;
  village?: string | null;
  surveyNumber: string | null;
  landArea: number | null;
  areaUnit?: string | null;
}

export default function CadastralMap({
  documentId,
  tehsil,
  village = "",
  surveyNumber,
  landArea,
  areaUnit,
}: CadastralMapProps) {
  const [center, setCenter] = useState<[number, number]>([12.815, 80.220]);
  const [geojson, setGeojson] = useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  const [areaSqM, setAreaSqM] = useState<number>(0);
  const [geometryError, setGeometryError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchParcelGeometry() {
      setGeojson(null);
      setGeometryError(null);
      if (!documentId) return;
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
        const res = await fetch(`${apiUrl}/api/documents/${encodeURIComponent(documentId)}/gis`);
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          throw new Error(data.detail || "GIS request failed");
        }

        const boundary = data.gis_boundary;
        const feature = boundary?.geojson;
        const coords = feature?.geometry?.coordinates?.[0];

        if (boundary?.center) {
          setCenter([boundary.center[0], boundary.center[1]]);
        }

        if (feature && coords && coords.length >= 4) {
          setLocationName(feature.properties?.location || "");
          setAreaSqM(feature.properties?.area_sq_m || 0);
          setGeojson(feature);
        } else {
          setGeometryError("Spatial boundary could not be generated from the record.");
        }
      } catch (err) {
        setGeometryError("Spatial boundary could not be generated from the record.");
        console.error("GIS Plotting failed:", err);
      }
    }

    fetchParcelGeometry();
  }, [documentId, tehsil, village, surveyNumber, landArea, areaUnit]);

  const unavailable = "Not available from document";
  const canPlot = Boolean(documentId);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Information Header */}
      <div
        style={{
          backgroundColor: "#0f172a",
          border: "1px solid #334155",
          borderRadius: "12px",
          padding: "14px 20px",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          color: "#f8fafc",
          fontSize: "13px",
        }}
      >
        <div>
          <span style={{ color: "#94a3b8" }}>Survey/Khasra: </span>
          <strong style={{ color: "#38bdf8" }}>{surveyNumber || unavailable}</strong>
        </div>
        <div>
          <span style={{ color: "#94a3b8" }}>Documented Area: </span>
          <strong style={{ color: "#34d399" }}>
            {landArea == null ? unavailable : `${landArea} ${areaUnit || unavailable}`} {areaSqM > 0 ? `(${areaSqM.toLocaleString()} m²)` : ""}
          </strong>
        </div>
        <div>
          <span style={{ color: "#94a3b8" }}>Cadastral Location: </span>
          <strong style={{ color: "#fbbf24" }}>{locationName || (village || tehsil ? `${village || unavailable}, ${tehsil || unavailable}` : unavailable)}</strong>
        </div>
      </div>

      {/* Satellite Map Container */}
      {canPlot ? (
        <div
          style={{
            position: "relative",
            height: "520px",
            width: "100%",
            borderRadius: "12px",
            overflow: "hidden",
            border: "2px solid #0284c7",
            backgroundColor: "#020617",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
          }}
        >
          <MapContainer
            center={center}
            zoom={16}
            maxZoom={19}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
          >
            <MapBoundsController center={center} geojson={geojson} />

            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
              maxZoom={19}
            />

            {/* Parcel Polygon Overlay */}
            {geojson && (
              <GeoJSON
                data={geojson}
                pathOptions={{
                  color: "#00f0ff",
                  fillColor: "#00f0ff",
                  fillOpacity: 0.45,
                  weight: 4,
                }}
              />
            )}

            {geojson && (
              <Marker position={center}>
                <Popup>
                  <div style={{ color: "#0f172a" }}>
                    <strong style={{ fontSize: "14px" }}>Plot #{surveyNumber || "Parcel"}</strong>
                    <hr style={{ margin: "4px 0" }} />
                    <div><strong>Area:</strong> {landArea} {areaUnit} ({areaSqM.toLocaleString()} m²)</div>
                    <div><strong>Location:</strong> {locationName}</div>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      ) : (
        <p style={{ color: "#cbd5e1", margin: 0 }}>
          A map cannot be generated until a document is selected.
        </p>
      )}
      {geometryError && <p style={{ color: "#fca5a5", margin: 0 }}>{geometryError}</p>}
    </div>
  );
}