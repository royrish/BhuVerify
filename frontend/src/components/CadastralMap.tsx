"use client";

import React, { useEffect, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Polygon,
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
  polygonCoords,
}: {
  center: [number, number];
  polygonCoords: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 200);

    if (polygonCoords && polygonCoords.length > 0) {
      try {
        const bounds = L.latLngBounds(polygonCoords);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 18, animate: true });
      } catch (e) {
        map.setView(center, 16);
      }
    } else {
      map.setView(center, 16);
    }
  }, [center, polygonCoords, map]);

  return null;
}

interface CadastralMapProps {
  tehsil: string;
  village?: string;
  surveyNumber: string;
  landArea: number;
  areaUnit?: string;
}

export default function CadastralMap({
  tehsil,
  village = "",
  surveyNumber,
  landArea,
  areaUnit = "Acres",
}: CadastralMapProps) {
  const [center, setCenter] = useState<[number, number]>([12.7844, 80.2201]);
  const [polygonCoords, setPolygonCoords] = useState<[number, number][]>([]);
  const [locationName, setLocationName] = useState<string>("");
  const [areaSqM, setAreaSqM] = useState<number>(0);

  useEffect(() => {
    async function fetchParcelGeometry() {
      if (!tehsil || !landArea) return;
      try {
        const res = await fetch("http://localhost:8001/api/gis/plot-parcel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tehsil,
            village,
            survey_number: surveyNumber,
            land_area: landArea,
            area_unit: areaUnit,
          }),
        });

        const data = await res.json();
        if (data.status === "SUCCESS") {
          setCenter([data.center[0], data.center[1]]);
          setLocationName(data.geojson.properties.location);
          setAreaSqM(data.geojson.properties.area_sq_m);

          const raw = data.geojson.geometry.coordinates[0];
          // Leaflet requires [latitude, longitude]
          const formatted: [number, number][] = raw.map((pt: [number, number]) => [pt[1], pt[0]]);
          setPolygonCoords(formatted);
        }
      } catch (err) {
        console.error("GIS Plotting failed:", err);
      }
    }

    fetchParcelGeometry();
  }, [tehsil, village, surveyNumber, landArea, areaUnit]);

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
          <strong style={{ color: "#38bdf8" }}>{surveyNumber}</strong>
        </div>
        <div>
          <span style={{ color: "#94a3b8" }}>Documented Area: </span>
          <strong style={{ color: "#34d399" }}>
            {landArea} {areaUnit} ({areaSqM.toLocaleString()} m²)
          </strong>
        </div>
        <div>
          <span style={{ color: "#94a3b8" }}>Cadastral Location: </span>
          <strong style={{ color: "#fbbf24" }}>{locationName || `${village}, ${tehsil}`}</strong>
        </div>
      </div>

      {/* Satellite Map Container with Glowing Cyan Polygon */}
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
          maxZoom={20}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          <MapBoundsController center={center} polygonCoords={polygonCoords} />

          <TileLayer
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            attribution="&copy; Google Maps"
            maxZoom={20}
          />

          {/* Full Parcel Area Polygon */}
          {polygonCoords.length > 0 && (
            <Polygon
              positions={polygonCoords}
              pathOptions={{
                color: "#00f0ff",
                fillColor: "#00f0ff",
                fillOpacity: 0.45,
                weight: 4,
              }}
            >
              <Popup>
                <div style={{ color: "#0f172a" }}>
                  <strong style={{ fontSize: "14px" }}>Plot #{surveyNumber}</strong>
                  <hr style={{ margin: "4px 0" }} />
                  <div><strong>Area:</strong> {landArea} {areaUnit} ({areaSqM.toLocaleString()} m²)</div>
                  <div><strong>Location:</strong> {locationName}</div>
                </div>
              </Popup>
            </Polygon>
          )}

          <Marker position={center} />
        </MapContainer>
      </div>
    </div>
  );
}