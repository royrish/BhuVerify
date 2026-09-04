"use client";

import React, { useState } from "react";
import Link from "next/link";

interface CitizenRecord {
  land_record_id: string;
  document_id: string;
  filename: string;
  uploaded_at: string;
  owner_name: string;
  survey_number: string;
  location: string;
  area: number;
  verification_status: string;
  last_updated: string;
  appointment?: {
    date: string;
    slot: string;
  };
}

export default function CitizenPortalPage() {
  const [searchSurvey, setSearchSurvey] = useState("");
  const [records, setRecords] = useState<CitizenRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CitizenRecord | null>(null);

  // Appointment scheduling modal state
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentSlot, setAppointmentSlot] = useState("10:00 AM - 11:30 AM");
  const [dateError, setDateError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchSurvey.trim()) return;

    setLoading(true);
    setSearched(true);
    setSelectedRecord(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
      const res = await fetch(`${apiUrl}/api/citizen/records?survey_number=${encodeURIComponent(searchSurvey)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setRecords(data);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error("Failed to fetch citizen records:", err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentDate || !selectedRecord) return;

    if (appointmentDate < todayStr) {
      setDateError("Appointments cannot be booked for past dates.");
      return;
    }

    setDateError(null);

    const updatedRecords = records.map((rec) => {
      if (rec.land_record_id === selectedRecord.land_record_id) {
        return {
          ...rec,
          appointment: {
            date: appointmentDate,
            slot: appointmentSlot,
          },
        };
      }
      return rec;
    });

    setRecords(updatedRecords);
    setSelectedRecord({
      ...selectedRecord,
      appointment: {
        date: appointmentDate,
        slot: appointmentSlot,
      },
    });

    setShowAppointmentModal(false);
    setAppointmentDate("");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#f8fafc", padding: "40px 20px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e293b", paddingBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#10b981", letterSpacing: "1px" }}>PUBLIC ACCESS PORTAL</div>
            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#ffffff", margin: "4px 0 0 0" }}>Citizen Land Tracker</h1>
          </div>
          <Link
            href="/settings"
            style={{
              padding: "8px 16px",
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              color: "#e2e8f0",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            &larr; Back to Settings
          </Link>
        </div>

        <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", padding: "24px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
          <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "16px" }}>
            Enter your land parcel survey number to query verification status, timestamps, and follow-up appointment instructions.
          </p>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: "12px" }}>
            <input
              type="text"
              placeholder="Enter Survey Number (e.g. 142/2A)"
              value={searchSurvey}
              onChange={(e) => setSearchSurvey(e.target.value)}
              style={{
                flex: 1,
                padding: "10px 14px",
                backgroundColor: "#0f172a",
                border: "1px solid #475569",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "10px 20px",
                backgroundColor: "#059669",
                border: "none",
                borderRadius: "8px",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Search
            </button>
          </form>
        </div>

        {loading && <p style={{ textAlign: "center", color: "#94a3b8" }}>Querying secure registry...</p>}

        {searched && !loading && records.length === 0 && (
          <div style={{ padding: "32px", textAlign: "center", backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", color: "#94a3b8" }}>
            No land records found matching Survey Number &quot;{searchSurvey}&quot;.
          </div>
        )}

        {records.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#cbd5e1" }}>Matching Records ({records.length})</h2>
            {records.map((rec) => {
              const displayStatus = rec.verification_status === "needs_review" ? "On Hold" : rec.verification_status;
              const isSelected = selectedRecord?.land_record_id === rec.land_record_id;

              return (
                <div 
                  key={rec.land_record_id} 
                  onClick={() => setSelectedRecord(isSelected ? null : rec)}
                  style={{ 
                    backgroundColor: "#1e293b", 
                    border: isSelected ? "2px solid #0284c7" : "1px solid #334155", 
                    padding: "20px", 
                    borderRadius: "12px", 
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#38bdf8", backgroundColor: "#0369a120", padding: "2px 6px", borderRadius: "4px", width: "fit-content" }}>
                        Survey #{rec.survey_number}
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>{rec.filename}</div>
                      <div style={{ fontSize: "13px", color: "#cbd5e1" }}>Owner: <strong style={{ color: "#ffffff" }}>{rec.owner_name}</strong></div>
                      <div style={{ fontSize: "12px", color: "#94a3b8" }}>Location: {rec.location} | Area: {rec.area} Acres</div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                      <span style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        backgroundColor: rec.appointment ? "#1d4ed8" : rec.verification_status === "verified" ? "#065f46" : rec.verification_status === "needs_review" ? "#92400e" : "#334155",
                        color: "#ffffff",
                      }}>
                        {rec.appointment ? "Appointment Booked" : displayStatus.replace("_", " ")}
                      </span>
                      <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "right" }}>
                        Uploaded: {rec.uploaded_at ? new Date(rec.uploaded_at).toLocaleDateString() : "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Inspector Panel */}
                  {isSelected && (
                    <div style={{ marginTop: "20px", borderTop: "1px solid #334155", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
                      
                      <div style={{ backgroundColor: "#0f172a", padding: "14px", borderRadius: "8px", border: "1px solid #1e293b" }}>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#cbd5e1", marginBottom: "4px" }}>Adjudication Remarks & Status Details:</div>
                        <p style={{ fontSize: "13px", color: rec.verification_status === "verified" ? "#34d399" : "#f87171", margin: 0 }}>
                          {rec.verification_status === "verified" 
                            ? "Record fully verified and registered in the state geospatial cadastral database. No further action required."
                            : rec.verification_status === "needs_review"
                            ? "On Hold due to administrative discrepancy (potential field mismatch, missing metadata, or duplicate survey entry). Physical verification required."
                            : "Document queued in pipeline. Preliminary OCR extraction and validation in progress."}
                        </p>
                      </div>

                      {/* Confirmed Appointment Banner or Booking CTA */}
                      {rec.appointment ? (
                        <div style={{ backgroundColor: "#065f4625", border: "1px solid #05966950", padding: "16px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#34d399" }}>Confirmed Physical Verification Appointment:</div>
                          <div style={{ fontSize: "13px", color: "#ffffff" }}>
                            📅 Date: <strong>{rec.appointment.date}</strong> | ⏰ Time Slot: <strong>{rec.appointment.slot}</strong>
                          </div>
                          <div style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "4px" }}>
                            <strong>Instructions & Documents to Carry:</strong>
                            <ul style={{ margin: "4px 0 0 0", paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                              <li>Printed copy of this appointment pass.</li>
                              <li>Original Government-issued Photo ID.</li>
                              <li>Original property tax receipt and sale deed instrument.</li>
                              <li>Report to the Thiruporur Corridor Desk 15 minutes prior to your slot.</li>
                            </ul>
                          </div>
                        </div>
                      ) : rec.verification_status !== "verified" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", backgroundColor: "#0284c715", border: "1px solid #0369a150", padding: "16px", borderRadius: "8px" }}>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#38bdf8" }}>Required Next Steps & Instructions:</div>
                          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#cbd5e1", display: "flex", flexDirection: "column", gap: "6px" }}>
                            <li>Visit the <strong>Taluk Headquarters Office (Thiruporur Corridor Desk)</strong> for physical document auditing.</li>
                            <li>Carry original government-issued identification and property tax receipts.</li>
                            <li>Visiting Hours Window: <strong>Monday to Friday, 10:00 AM – 04:00 PM</strong>.</li>
                          </ul>
                          <div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowAppointmentModal(true);
                              }}
                              style={{
                                marginTop: "6px",
                                padding: "8px 16px",
                                backgroundColor: "#0284c7",
                                border: "none",
                                borderRadius: "6px",
                                color: "#ffffff",
                                fontWeight: 700,
                                fontSize: "12px",
                                cursor: "pointer",
                              }}
                            >
                              Book Physical Verification Appointment &rarr;
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Appointment Booking Modal with Past Date Restriction */}
      {showAppointmentModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{ backgroundColor: "#1e293b", border: "1px solid #475569", padding: "30px", borderRadius: "12px", width: "400px", maxWidth: "90%", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "18px", color: "#ffffff" }}>Schedule Visit Appointment</h3>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>Select your preferred date and time slot for physical document review at the Taluk Office.</p>
            
            {dateError && (
              <div style={{ padding: "10px", backgroundColor: "#7f1d1d", color: "#fca5a5", borderRadius: "6px", fontSize: "12px", fontWeight: 700 }}>
                {dateError}
              </div>
            )}

            <form onSubmit={handleBookAppointment} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#cbd5e1" }}>Preferred Date (Future Dates Only)</label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={appointmentDate}
                  onChange={(e) => {
                    setAppointmentDate(e.target.value);
                    if (e.target.value >= todayStr) setDateError(null);
                  }}
                  style={{ width: "100%", padding: "8px", backgroundColor: "#0f172a", border: "1px solid #475569", borderRadius: "6px", color: "#ffffff", fontSize: "12px", marginTop: "4px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#cbd5e1" }}>Time Slot</label>
                <select
                  value={appointmentSlot}
                  onChange={(e) => setAppointmentSlot(e.target.value)}
                  style={{ width: "100%", padding: "8px", backgroundColor: "#0f172a", border: "1px solid #475569", borderRadius: "6px", color: "#ffffff", fontSize: "12px", marginTop: "4px" }}
                >
                  <option value="10:00 AM - 11:30 AM">10:00 AM – 11:30 AM</option>
                  <option value="11:30 AM - 01:00 PM">11:30 AM – 01:00 PM</option>
                  <option value="02:00 PM - 03:30 PM">02:00 PM – 03:30 PM</option>
                  <option value="03:30 PM - 05:00 PM">03:30 PM – 05:00 PM</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAppointmentModal(false);
                    setDateError(null);
                  }}
                  style={{ flex: 1, padding: "8px", backgroundColor: "#334155", border: "none", borderRadius: "6px", color: "#ffffff", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: "8px", backgroundColor: "#059669", border: "none", borderRadius: "6px", color: "#ffffff", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}