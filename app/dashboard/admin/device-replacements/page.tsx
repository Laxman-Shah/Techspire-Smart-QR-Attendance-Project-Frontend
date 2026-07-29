"use client";
import { useRouter } from "next/navigation";
import { Smartphone, ArrowLeft, Info } from "lucide-react";
import { AuthGuard } from "@/src/components/auth-guard";

function DeviceReplacementsContent() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="btn-ghost p-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Device Replacement Requests</h1>
          <p className="text-slate-400 text-sm">Advanced device replacement flow</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="card p-6">
        <div className="text-center py-12">
          <Smartphone className="h-16 w-16 text-slate-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-300 mb-2">Advanced Flow Not Used in Module 1</h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            The advanced device replacement request flow is not used in Module 1 normal admin workflow. For normal lost device/browser reset cases, use Device Management.
          </p>
          <button
            onClick={() => router.push("/dashboard/admin/device-management")}
            className="btn"
          >
            <Smartphone className="h-4 w-4 mr-2" />
            Go to Device Management
          </button>
        </div>
      </div>

      {/* Module 1 Info Card */}
      <div className="card p-4 bg-primary-500/5 border-primary-500/20">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary-400 mt-0.5" />
          <div className="text-sm text-slate-400">
            <p className="font-medium text-slate-300 mb-1">For Module 1</p>
            <p className="text-slate-500">
              Use <strong>Device Management → Reset Device Binding</strong> for normal lost device/browser reset cases. This is the recommended flow for Module 1.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DeviceReplacementsPage() {
  return (
    <AuthGuard allowedRoles={["ADMIN"]}>
      <DeviceReplacementsContent />
    </AuthGuard>
  );
}
