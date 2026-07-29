"use client";
import { useState } from "react";
import Link from "next/link";
import { TerminalSquare, ArrowLeft, Send } from "lucide-react";
import toast from "react-hot-toast";
import { request } from "@/src/lib/api/client";
import { ResponseViewer } from "@/src/components/response-viewer";

export default function ApiConsolePage() {
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("/api/auth/page-load");
  const [body, setBody] = useState("{}");
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<unknown>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let parsed: unknown = undefined;
      try {
        parsed = body.trim() ? JSON.parse(body) : undefined;
      } catch {
        parsed = body;
      }
      const res = await request(method as any, path, method === "GET" ? undefined : parsed);
      setLastResponse(res.raw);
      if (res.ok) toast.success("Request successful");
      else toast.error(`Request failed: ${res.status}`);
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-2xl font-bold">API Console</h1>
            <p className="text-slate-400 text-sm">Developer tool for testing API endpoints</p>
          </div>
        </div>
        <div className="badge badge-warning">Developer Tools</div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TerminalSquare className="h-5 w-5 text-primary-400" />
          Send Custom API Request
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          Automatically attaches Authorization header, cookies, X-Installation-Id, and optional X-Browser-Fingerprint.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label className="label">Path</label>
              <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/api/auth/page-load" required />
            </div>
          </div>
          {method !== "GET" && (
            <div>
              <label className="label">JSON Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="{}"
                rows={6}
                className="font-mono text-xs"
              />
            </div>
          )}
          <button type="submit" className="btn" disabled={loading}>
            <Send className="h-4 w-4" />
            {loading ? "Sending..." : "Send Request"}
          </button>
        </form>
      </div>

      {lastResponse != null && (
        <ResponseViewer data={lastResponse as Record<string, unknown>} title="API Response" />
      )}
    </div>
  );
}
