"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

const CadastralMap = dynamic(() => import("@/components/CadastralMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full bg-slate-900 flex items-center justify-center text-slate-400 rounded-2xl border border-slate-800">
      Loading Satellite Map & GIS Engine...
    </div>
  ),
});

export default function StandaloneGISPage() {
  const [tehsil, setTehsil] = useState("Tiruporur");
  const [village, setVillage] = useState("Kelambakkam");
  const [surveyNumber, setSurveyNumber] = useState("142/3A");
  const [landArea, setLandArea] = useState(2.45);
  const [areaUnit, setAreaUnit] = useState("Acres");

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Cadastral GIS Visualizer</h1>
          <p className="text-slate-400 text-sm mt-1">
            Visualizing parcels dynamically derived from document analysis.
          </p>
        </div>

        <CadastralMap
          tehsil={tehsil}
          village={village}
          surveyNumber={surveyNumber}
          landArea={landArea}
          areaUnit={areaUnit}
        />
      </div>
    </main>
  );
}