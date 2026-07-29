"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/src/lib/api/auth";
import type { RegisterUserRequest } from "@/src/types/api";
import { AuthGuard } from "@/src/components/auth-guard";
import { FullPageLoading } from "@/src/components/full-page-loading";
import { getApiErrorMessage, getFieldErrors, isDuplicateError, formatDuplicateUsernameError } from "@/src/lib/api/error-helpers";

function RegisterUserContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<RegisterUserRequest>({
    FullName: "",
    Email: "",
    Username: "",
    PhoneNumber: "",
    Role: "STUDENT",
    InstitutionalIdentifier: ""
  } as RegisterUserRequest);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const usernameInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: keyof RegisterUserRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: "" }));
    setError(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.FullName.trim()) {
      errors.FullName = "Full name is required";
    }
    if (!formData.Email.trim()) {
      errors.Email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.Email)) {
      errors.Email = "Invalid email format";
    }
    // Username is optional in backend DTO
    if (formData.Username && !formData.Username.trim()) {
      errors.Username = "Username cannot be empty if provided";
    }
    // PhoneNumber is optional in backend DTO
    if (formData.PhoneNumber && !formData.PhoneNumber.trim()) {
      errors.PhoneNumber = "Phone number cannot be empty if provided";
    }
    // InstitutionalIdentifier is optional in backend DTO
    if (formData.InstitutionalIdentifier && !formData.InstitutionalIdentifier.trim()) {
      errors.InstitutionalIdentifier = "Institutional identifier cannot be empty if provided";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Normalize form data before sending
      const payload: RegisterUserRequest = {
        FullName: formData.FullName.trim(),
        Email: formData.Email.trim(),
        Username: formData.Username?.trim() || undefined,
        PhoneNumber: formData.PhoneNumber?.trim() || undefined,
        Role: formData.Role.toUpperCase() as "STUDENT" | "TEACHER",
        InstitutionalIdentifier: formData.InstitutionalIdentifier?.trim() || undefined
      };

      const res = await authApi.registerUser(payload);
      
      if (res.ok && res.raw) {
        setSuccess(res.raw);
        toast.success("User registered successfully");
      } else {
        // Extract field-level validation errors
        const extractedFieldErrors = getFieldErrors(res.raw);
        
        if (Object.keys(extractedFieldErrors).length > 0) {
          setFieldErrors(extractedFieldErrors);
          
          // If username error, focus on username field
          if (extractedFieldErrors.Username) {
            usernameInputRef.current?.focus();
          }
        }
        
        // Check for duplicate username/email errors
        if (isDuplicateError(res.raw)) {
          const errorMessage = getApiErrorMessage(res.raw);
          if (errorMessage.toLowerCase().includes("username")) {
            setError(formatDuplicateUsernameError(formData.Username || ""));
            usernameInputRef.current?.focus();
          } else if (errorMessage.toLowerCase().includes("email")) {
            setError(errorMessage);
          } else {
            setError(errorMessage);
          }
        } else {
          // Show general error message
          setError(getApiErrorMessage(res.raw));
        }
        
        toast.error("Registration failed");
      }
    } catch (err) {
      setError("An error occurred during registration");
      toast.error("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      FullName: "",
      Email: "",
      Username: "",
      PhoneNumber: "",
      Role: "STUDENT",
      InstitutionalIdentifier: ""
    });
    setFieldErrors({});
    setError(null);
    setSuccess(null);
  };

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
          <h1 className="text-2xl font-bold">Register New User</h1>
          <p className="text-slate-400 text-sm">Create a new student or teacher account</p>
        </div>
      </div>

      {error && (
        <div className="card p-4 bg-danger-500/10 border-danger-500/50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-danger-400" />
            <p className="text-sm text-danger-200">{error}</p>
          </div>
        </div>
      )}

      {success ? (
        <div className="card p-6 bg-success-500/10 border-success-500/50">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-success-500/20 text-success-400">
              <CheckCircle className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-success-300 mb-4">User Registered Successfully</h2>
              <div className="space-y-3">
                {Object.entries(success as Record<string, unknown>).map(([key, value]) => {
                  if (key === "TemporaryPassword") return null; // Don't show temp password
                  return (
                    <div key={key} className="flex justify-between items-start">
                      <span className="text-sm text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className="text-sm text-slate-200 text-right max-w-xs break-words">
                        {value === null || value === undefined ? "N/A" : String(value)}
                      </span>
                    </div>
                  );
                })}
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-sm text-success-300">
                    Temporary password/onboarding email has been sent to the user.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleReset}
                  className="btn"
                >
                  Register Another User
                </button>
                <button
                  onClick={() => router.push("/dashboard/admin/users")}
                  className="btn btn-secondary"
                >
                  View Users List
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="label">Full Name <span className="text-danger-400">*</span></label>
              <input
                type="text"
                value={formData.FullName}
                onChange={(e) => handleInputChange("FullName", e.target.value)}
                placeholder="John Doe"
                className={fieldErrors.FullName ? "border-danger-500" : ""}
              />
              {fieldErrors.FullName && (
                <p className="text-xs text-danger-400 mt-1">{fieldErrors.FullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="label">Email <span className="text-danger-400">*</span></label>
              <input
                type="email"
                value={formData.Email}
                onChange={(e) => handleInputChange("Email", e.target.value)}
                placeholder="john@example.com"
                className={fieldErrors.Email ? "border-danger-500" : ""}
              />
              {fieldErrors.Email && (
                <p className="text-xs text-danger-400 mt-1">{fieldErrors.Email}</p>
              )}
            </div>

            {/* Username */}
            <div>
              <label className="label">Username (Optional)</label>
              <input
                ref={usernameInputRef}
                type="text"
                value={formData.Username || ""}
                onChange={(e) => handleInputChange("Username", e.target.value)}
                placeholder="johndoe"
                className={fieldErrors.Username ? "border-danger-500" : ""}
              />
              {fieldErrors.Username && (
                <p className="text-xs text-danger-400 mt-1">{fieldErrors.Username}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                Optional. Leave blank if you want to use email/default username. Must be unique.
              </p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="label">Phone Number (Optional)</label>
              <input
                type="tel"
                value={formData.PhoneNumber || ""}
                onChange={(e) => handleInputChange("PhoneNumber", e.target.value)}
                placeholder="+1234567890"
                className={fieldErrors.PhoneNumber ? "border-danger-500" : ""}
              />
              {fieldErrors.PhoneNumber && (
                <p className="text-xs text-danger-400 mt-1">{fieldErrors.PhoneNumber}</p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="label">Role <span className="text-danger-400">*</span></label>
              <select
                value={formData.Role}
                onChange={(e) => handleInputChange("Role", e.target.value as "STUDENT" | "TEACHER")}
                className="w-full"
              >
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Admin users cannot be created through this interface
              </p>
            </div>

            {/* Institutional Identifier */}
            <div>
              <label className="label">Institutional Identifier (Optional)</label>
              <input
                type="text"
                value={formData.InstitutionalIdentifier || ""}
                onChange={(e) => handleInputChange("InstitutionalIdentifier", e.target.value)}
                placeholder="STU001 or TCH001"
                className={fieldErrors.InstitutionalIdentifier ? "border-danger-500" : ""}
              />
              {fieldErrors.InstitutionalIdentifier && (
                <p className="text-xs text-danger-400 mt-1">{fieldErrors.InstitutionalIdentifier}</p>
              )}
            </div>

            {/* Info Card */}
            <div className="card p-4 bg-primary-500/5 border-primary-500/20">
              <div className="flex items-start gap-3">
                <UserPlus className="h-5 w-5 text-primary-400 mt-0.5" />
                <div className="text-sm text-slate-400">
                  <p className="font-medium text-slate-300 mb-1">Important Information</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-500">
                    <li>Admin creates student/teacher accounts. Backend sends temporary password by email.</li>
                    <li>User must complete first access flow to set their permanent password</li>
                    <li>Account status will be "PendingFirstAccess" initially</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3">
              <button
                type="submit"
                className="btn flex-1"
                disabled={loading}
              >
                {loading ? "Registering..." : "Register User"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-secondary"
                disabled={loading}
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function RegisterUserPage() {
  return (
    <AuthGuard allowedRoles={["ADMIN"]}>
      <RegisterUserContent />
    </AuthGuard>
  );
}
