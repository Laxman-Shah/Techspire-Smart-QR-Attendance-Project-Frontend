"use client";
import { ReactNode, useState } from "react";
import toast from "react-hot-toast";
import { ApiResult } from "@/src/types/api";
import { extractAccessToken } from "@/src/lib/api/client";
import { useAuthStore } from "@/src/store/auth-store";
import { ResponseViewer } from "@/src/components/response-viewer";

export function ActionCard({ title, description, children, onSubmit }: { title: string; description?: string; children: ReactNode; onSubmit: () => Promise<ApiResult> }) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<unknown>();
  const setAccessToken = useAuthStore(s => s.setAccessToken);
  const setUser = useAuthStore(s => s.setUser);
  const setLastResponse = useAuthStore(s => s.setLastResponse);
  async function run() {
    setLoading(true);
    const res = await onSubmit();
    setLoading(false);
    setResponse(res.raw);
    setLastResponse(res.raw);
    const tokenInfo = extractAccessToken(res.raw);
    if (tokenInfo.token) setAccessToken(tokenInfo.token, tokenInfo.expiresAt);
    if (tokenInfo.user) setUser(tokenInfo.user);
    res.ok ? toast.success(`${title} success`) : toast.error(`${title} failed (${res.status})`);
  }
  return <div className="card p-5">
    <h2 className="text-lg font-semibold">{title}</h2>
    {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
    <div className="grid gap-3 mt-4">{children}</div>
    <button className="btn mt-4" disabled={loading} onClick={run}>{loading ? "Calling API..." : "Send request"}</button>
    <ResponseViewer data={response} />
  </div>;
}

export function TextInput({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return <label className="grid gap-1"><span className="label">{label}</span><input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} /></label>;
}
export function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="grid gap-1"><span className="label">{label}</span><textarea rows={4} value={value} onChange={e => onChange(e.target.value)} /></label>;
}
export function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return <label className="grid gap-1"><span className="label">{label}</span><select value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o} value={o}>{o}</option>)}</select></label>;
}
