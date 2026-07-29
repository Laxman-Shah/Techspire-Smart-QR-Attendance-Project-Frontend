"use client";
import Link from "next/link";
import { ArrowLeft, Smartphone, ShieldAlert } from "lucide-react";
import { AuthGuard } from "@/src/components/auth-guard";

function StudentDeviceReplacementContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/student" className="btn btn-secondary p-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div>
          <h1 className="text-2xl font-bold">Device Reset</h1>
          <p className="text-sm text-slate-400">
            Device binding changes are handled by your administrator.
          </p>
        </div>
      </div>

      <div className="card p-8">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-400">
          <Smartphone className="h-7 w-7" />
        </div>

        <h2 className="mb-3 text-xl font-semibold">
          Device Reset Handled by Administrator
        </h2>

        <p className="mb-6 text-sm leading-6 text-slate-400">
          If your device is lost, damaged, your browser data was cleared, or you need
          to use a new browser or device, please contact your administrator.
        </p>

        <div className="rounded-2xl border border-warning-500/20 bg-warning-500/10 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning-400" />
            <div className="text-sm text-slate-300">
              <p className="mb-2 font-medium text-warning-300">
                How device reset works
              </p>

              <ul className="list-disc space-y-1 pl-5 text-slate-400">
                <li>Administrator resets your approved device binding.</li>
                <li>Your old active sessions and refresh tokens are revoked.</li>
                <li>You login again with username/password and OTP.</li>
                <li>The next successful login browser becomes your approved device.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Link href="/dashboard/student" className="btn">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function StudentDeviceReplacementPage() {
  return (
    <AuthGuard allowedRoles={["STUDENT"]}>
      <StudentDeviceReplacementContent />
    </AuthGuard>
  );
}
