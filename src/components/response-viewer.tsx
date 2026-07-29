"use client";
import { Copy } from "lucide-react";
import toast from "react-hot-toast";

export function ResponseViewer({ data, title = "Raw response" }: { data: unknown; title?: string }) {
  // Only show in development mode
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const text = JSON.stringify(data ?? {}, null, 2);
  return <div className="card p-4 mt-4">
    <div className="flex items-center justify-between mb-2">
      <h3 className="font-semibold text-sm text-slate-200">{title}</h3>
      <button className="btn-secondary px-2 py-1" onClick={() => { navigator.clipboard.writeText(text); toast.success("Copied response"); }}><Copy className="h-4 w-4" /></button>
    </div>
    <pre className="max-h-96 overflow-auto rounded-xl bg-black/50 p-3 text-xs text-emerald-200">{text}</pre>
  </div>;
}
