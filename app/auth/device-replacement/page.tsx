"use client";
import { useState } from "react";
import Link from "next/link";
import { RefreshCw, ArrowLeft, TerminalSquare } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/src/lib/api/auth";
import { ResponseViewer } from "@/src/components/response-viewer";
import { buildDeviceContext } from "@/src/lib/device/device-context";

export default function DeviceReplacementPage() {
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<unknown>(null);
  
  // Student request
  const [drReason, setDrReason] = useState("");
  
  // Admin create
  const [acStudentEmail, setAcStudentEmail] = useState("");
  const [acStudentUserId, setAcStudentUserId] = useState("");
  const [acReason, setAcReason] = useState("");
  const [acExpiry, setAcExpiry] = useState("7");
  
  // Admin approve
  const [aaRequestId, setAaRequestId] = useState("");
  const [aaIsApproved, setAaIsApproved] = useState("true");
  const [aaNote, setAaNote] = useState("");
  
  // Start completion
  const [scRequestId, setScRequestId] = useState("");
  const [scPassword, setScPassword] = useState("");
  
  // Verify OTP
  const [voRequestId, setVoRequestId] = useState("");
  const [voChallengeId, setVoChallengeId] = useState("");
  const [voOtp, setVoOtp] = useState("");
  
  // Resend OTP
  const [roChallengeId, setRoChallengeId] = useState("");

  const handleStudentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const deviceContext = buildDeviceContext();
      const res = await authApi.requestDeviceReplacement({
        ReplacementType: "UPGRADE",
        Reason: drReason,
        NewDevice: deviceContext
      });
      setLastResponse(res.raw);
      if (res.ok) toast.success("Replacement request submitted");
      else toast.error("Failed to request replacement");
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.adminCreateDeviceReplacement({
        StudentEmail: acStudentEmail || undefined,
        StudentUserId: acStudentUserId || undefined,
        Reason: acReason,
        ExpiryDays: acExpiry ? parseInt(acExpiry) : undefined,
      });
      setLastResponse(res.raw);
      if (res.ok) toast.success("Replacement request created");
      else toast.error("Failed to create replacement");
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.approveDeviceReplacement({
        DeviceReplacementRequestId: aaRequestId,
        IsApproved: aaIsApproved === "true",
        AdministrativeNote: aaNote || undefined,
      });
      setLastResponse(res.raw);
      if (res.ok) toast.success("Replacement request processed");
      else toast.error("Failed to process replacement");
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleStartCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.startDeviceReplacement({
        DeviceReplacementRequestId: scRequestId,
        CurrentPasswordOrTemporaryPassword: scPassword,
      });
      setLastResponse(res.raw);
      if (res.ok) toast.success("Replacement started");
      else toast.error("Failed to start replacement");
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.verifyDeviceReplacementOtp({
        DeviceReplacementRequestId: voRequestId,
        LoginChallengeId: voChallengeId,
        OtpCode: voOtp,
      });
      setLastResponse(res.raw);
      if (res.ok) toast.success("Device replacement completed");
      else toast.error("Failed to verify OTP");
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.resendDeviceReplacementOtp({ LoginChallengeId: roChallengeId });
      setLastResponse(res.raw);
      if (res.ok) toast.success("OTP resent");
      else toast.error("Failed to resend OTP");
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
            <h1 className="text-2xl font-bold">Device Replacement Center</h1>
            <p className="text-slate-400 text-sm">Developer tool for testing device replacement flows</p>
          </div>
        </div>
        <div className="badge badge-warning">Developer Tools</div>
      </div>

      <div className="grid gap-6">
        {/* Student Request */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary-400" />
            Student Request Replacement
          </h2>
          <form onSubmit={handleStudentRequest} className="space-y-4">
            <div>
              <label className="label">Reason</label>
              <input value={drReason} onChange={(e) => setDrReason(e.target.value)} placeholder="Upgrading to new device" required />
            </div>
            <button type="submit" className="btn" disabled={loading}>{loading ? "Requesting..." : "Request Replacement"}</button>
          </form>
        </div>

        {/* Admin Create */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Admin Create Lost-Device Replacement</h2>
          <form onSubmit={handleAdminCreate} className="space-y-4">
            <div>
              <label className="label">Student User ID (optional)</label>
              <input value={acStudentUserId} onChange={(e) => setAcStudentUserId(e.target.value)} placeholder="123" />
            </div>
            <div>
              <label className="label">Student Email (optional)</label>
              <input type="email" value={acStudentEmail} onChange={(e) => setAcStudentEmail(e.target.value)} placeholder="student@example.com" />
            </div>
            <div>
              <label className="label">Reason</label>
              <input value={acReason} onChange={(e) => setAcReason(e.target.value)} placeholder="Device lost/stolen" required />
            </div>
            <div>
              <label className="label">Expiry Days</label>
              <input type="number" value={acExpiry} onChange={(e) => setAcExpiry(e.target.value)} placeholder="7" />
            </div>
            <button type="submit" className="btn" disabled={loading}>{loading ? "Creating..." : "Create Replacement"}</button>
          </form>
        </div>

        {/* Admin Approve */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Admin Approve/Reject Replacement</h2>
          <form onSubmit={handleAdminApprove} className="space-y-4">
            <div>
              <label className="label">Device Replacement Request ID</label>
              <input value={aaRequestId} onChange={(e) => setAaRequestId(e.target.value)} placeholder="guid" required />
            </div>
            <div>
              <label className="label">Decision</label>
              <select value={aaIsApproved} onChange={(e) => setAaIsApproved(e.target.value)}>
                <option value="true">Approve</option>
                <option value="false">Reject</option>
              </select>
            </div>
            <div>
              <label className="label">Rejection Reason / Administrative Note</label>
              <input value={aaNote} onChange={(e) => setAaNote(e.target.value)} placeholder="Additional notes" />
            </div>
            <button type="submit" className="btn" disabled={loading}>{loading ? "Processing..." : "Process Request"}</button>
          </form>
        </div>

        {/* Start Completion */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Start Replacement Completion</h2>
          <form onSubmit={handleStartCompletion} className="space-y-4">
            <div>
              <label className="label">Device Replacement Request ID</label>
              <input value={scRequestId} onChange={(e) => setScRequestId(e.target.value)} placeholder="guid" required />
            </div>
            <div>
              <label className="label">Current Password</label>
              <input type="password" value={scPassword} onChange={(e) => setScPassword(e.target.value)} placeholder="Your current password" required />
            </div>
            <button type="submit" className="btn" disabled={loading}>{loading ? "Starting..." : "Start Replacement"}</button>
          </form>
        </div>

        {/* Verify OTP */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Verify Replacement OTP and Complete</h2>
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="label">Device Replacement Request ID</label>
              <input value={voRequestId} onChange={(e) => setVoRequestId(e.target.value)} placeholder="guid" required />
            </div>
            <div>
              <label className="label">Login Challenge ID</label>
              <input value={voChallengeId} onChange={(e) => setVoChallengeId(e.target.value)} placeholder="guid" required />
            </div>
            <div>
              <label className="label">OTP Code</label>
              <input value={voOtp} onChange={(e) => setVoOtp(e.target.value)} placeholder="6-digit OTP" maxLength={6} required />
            </div>
            <button type="submit" className="btn" disabled={loading}>{loading ? "Verifying..." : "Complete Replacement"}</button>
          </form>
        </div>

        {/* Resend OTP */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Resend Replacement OTP</h2>
          <form onSubmit={handleResendOtp} className="space-y-4">
            <div>
              <label className="label">Login Challenge ID</label>
              <input value={roChallengeId} onChange={(e) => setRoChallengeId(e.target.value)} placeholder="guid" required />
            </div>
            <button type="submit" className="btn-secondary" disabled={loading}>{loading ? "Resending..." : "Resend OTP"}</button>
          </form>
        </div>
      </div>

      {lastResponse != null && (
        <ResponseViewer data={lastResponse as Record<string, unknown>} title="API Response" />
      )}
    </div>
  );
}
