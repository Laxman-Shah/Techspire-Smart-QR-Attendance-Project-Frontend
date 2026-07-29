"use client";
import { useState } from "react";
import Link from "next/link";
import { Smartphone, ArrowLeft, RefreshCw, Copy, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { getInstallationId, regenerateInstallationId } from "@/src/lib/device/installation";

export default function DeviceSettingsPage() {
  const [showRegenerateWarning, setShowRegenerateWarning] = useState(false);
  const currentInstallationId = getInstallationId();

  const handleRegenerateInstallation = () => {
    const newId = regenerateInstallationId();
    toast.success("Installation ID regenerated. You may need to re-login.");
    setShowRegenerateWarning(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Device Settings</h1>
            <p className="text-slate-400 text-sm">Manage your device installation ID</p>
          </div>
        </div>
        <div className="badge badge-warning">Developer Tools</div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary-400" />
          Installation ID
        </h2>
        <div className="card p-4 bg-slate-800/50 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">X-Installation-Id Header</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-mono text-slate-300 break-all">{currentInstallationId}</p>
                <button onClick={() => copyToClipboard(currentInstallationId, "Installation ID")} className="btn-ghost p-1 flex-shrink-0">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
            <button 
              onClick={() => setShowRegenerateWarning(true)}
              className="btn-secondary text-sm ml-4"
            >
              <RefreshCw className="h-3 w-3" />
              Regenerate
            </button>
          </div>
        </div>
        
        {showRegenerateWarning && (
          <div className="card p-4 bg-danger-500/10 border-danger-500/20 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-danger-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-danger-400 mb-2">Warning: Regenerating Installation ID</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Regenerating your installation ID will make your current device appear as a new device to the system. 
                  This may prevent you from logging in or refreshing your session until you complete a device replacement flow.
                </p>
                <div className="flex gap-3">
                  <button onClick={handleRegenerateInstallation} className="btn-danger text-sm">
                    Regenerate Anyway
                  </button>
                  <button onClick={() => setShowRegenerateWarning(false)} className="btn-secondary text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-sm text-slate-400">
          <p className="mb-2"><strong>About Installation ID:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>This ID is sent as X-Installation-Id header with every API request</li>
            <li>For students, this ID must match the approved device binding</li>
            <li>Regenerating simulates using a different device</li>
            <li>Stored in localStorage and persists across sessions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
