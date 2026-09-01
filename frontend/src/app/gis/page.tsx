"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getDocumentVerification, type ExtractedLandRecord } from "@/lib/documents";

const CadastralMap = dynamic(() => import("@/components/CadastralMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full bg-slate-900 flex items-center justify-center text-slate-400 rounded-2xl border border-slate-800">
      Loading Satellite Map & GIS Engine...
    </div>
  ),
});

export default function StandaloneGISPage() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get("documentId");
  const [record, setRecord] = useState<ExtractedLandRecord | null>(null);
  const [loading, setLoading] = useState(Boolean(documentId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) {
      return;
    }

    getDocumentVerification(documentId)
      .then((snapshot) => {
        if (!snapshot) {
          setError("No extracted record is available for this document.");
          return;
        }
        setRecord(snapshot.land_record as unknown as ExtractedLandRecord);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load the extracted record.");
      })
      .finally(() => setLoading(false));
  }, [documentId]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Cadastral GIS Visualizer</h1>
          <p className="text-slate-400 text-sm mt-1">
            Visualizing the extracted record for a selected uploaded document.
          </p>
        </div>

        {loading && <p className="text-slate-400">Loading extracted record...</p>}
        {error && <p className="text-red-300">{error}</p>}
        {!loading && !error && !documentId && (
          <p className="text-slate-400">
            Open GIS from a document after running extraction. No demo land data is loaded here.
            <Link className="ml-2 text-cyan-300 underline" href="/documents">
              View documents
            </Link>
          </p>
        )}
        {!loading && !error && documentId && record && (
          <CadastralMap
            documentId={documentId}
            tehsil={record.tehsil}
            village={record.village}
            surveyNumber={record.survey_number}
            landArea={record.area}
            areaUnit={record.area_unit}
          />
        )}
      </div>
    </main>
  );
}