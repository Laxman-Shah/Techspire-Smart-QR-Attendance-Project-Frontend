"use client";

import { Loader2, QrCode } from "lucide-react";

export function FullPageLoading({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20">
          <QrCode className="h-8 w-8" />
        </div>

        <div className="flex items-center justify-center gap-3 text-slate-200">
          <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
          <p className="text-sm font-medium">{message}</p>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Please wait while we verify your session.
        </p>
      </div>
    </div>
  );
}
