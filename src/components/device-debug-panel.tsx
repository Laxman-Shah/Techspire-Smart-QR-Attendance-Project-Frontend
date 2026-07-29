"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getBrowserFingerprint, getInstallationId, regenerateInstallationId } from "@/src/lib/device/installation";

export function DeviceDebugPanel() {
  const [id, setId] = useState("");
  const [fp, setFp] = useState("");
  useEffect(() => { setId(getInstallationId()); setFp(getBrowserFingerprint()); }, []);
  return <div className="card p-4">
    <h3 className="font-semibold mb-2">Device / Browser Binding Debug</h3>
    <p className="text-xs text-amber-200 mb-3">Regenerating this ID simulates a new browser/device and should make student restricted-device checks fail.</p>
    <div className="space-y-2 text-xs">
      <div><span className="text-slate-400">X-Installation-Id:</span><pre className="mt-1 overflow-auto rounded bg-slate-950 p-2">{id}</pre></div>
      <div><span className="text-slate-400">X-Browser-Fingerprint:</span><pre className="mt-1 overflow-auto rounded bg-slate-950 p-2">{fp}</pre></div>
    </div>
    <div className="mt-3 flex gap-2">
      <button className="btn-secondary" onClick={() => { navigator.clipboard.writeText(id); toast.success("Installation ID copied"); }}>Copy ID</button>
      <button className="btn-danger" onClick={() => { const next = regenerateInstallationId(); setId(next); toast.success("New installation ID generated"); }}>Regenerate ID</button>
    </div>
  </div>;
}
