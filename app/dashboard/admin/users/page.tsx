"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Search, Filter, ChevronDown, Eye, Lock, Smartphone, Trash2, MoreVertical, ShieldCheck, AlertTriangle, Archive, RefreshCw, X } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/src/lib/api/admin";
import { authApi } from "@/src/lib/api/auth";
import { AuthGuard } from "@/src/components/auth-guard";
import { FullPageLoading } from "@/src/components/full-page-loading";
import type { UserListItem, UsersListResponse } from "@/src/lib/api/admin";
import { normalizeAdminUser, extractUsersList, extractTotalCount } from "@/src/lib/utils/normalize";

function PortalModal({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(children, document.body);
}

function normalizeRoles(input: unknown): string[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input
      .map((item) => {
        if (typeof item === "string") return item;

        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;

          return (
            obj.name ??
            obj.Name ??
            obj.roleName ??
            obj.RoleName ??
            obj.normalizedRoleName ??
            obj.NormalizedRoleName ??
            obj.normalizedName ??
            obj.NormalizedName ??
            ""
          );
        }

        return "";
      })
      .filter(Boolean)
      .map((role) => String(role).toUpperCase());
  }

  if (typeof input === "string") {
    return [input.toUpperCase()];
  }

  return [];
}

function getPrimaryRole(user: unknown): string {
  if (!user || typeof user !== "object") return "UNKNOWN";

  const obj = user as Record<string, unknown>;

  const rawRoles =
    obj.roles ??
    obj.Roles ??
    obj.role ??
    obj.Role ??
    obj.userRoles ??
    obj.UserRoles ??
    [];

  const roles = normalizeRoles(rawRoles);

  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("TEACHER")) return "TEACHER";
  if (roles.includes("STUDENT")) return "STUDENT";

  return roles[0] ?? "UNKNOWN";
}

function getApiErrorMessage(raw: any): string {
  if (!raw) return "Request failed. Please try again.";
  if (raw.detail) return raw.detail;
  if (raw.message) return raw.message;
  if (raw.title) return raw.title;
  if (raw.errors && typeof raw.errors === "object") {
    const firstError = Object.entries(raw.errors)[0];
    if (firstError) {
      const [field, messages] = firstError;
      if (Array.isArray(messages)) {
        return `${field}: ${messages.join(", ")}`;
      }
      return `${field}: ${String(messages)}`;
    }
  }
  return "Request failed. Please try again.";
}

function getRoleBadge(user: unknown) {
  const role = getPrimaryRole(user);

  const colors: Record<string, string> = {
    ADMIN: "badge-success",
    TEACHER: "badge-info",
    STUDENT: "badge-primary",
    UNKNOWN: "badge-secondary",
  };

  return (
    <span className={`badge ${colors[role] ?? colors.UNKNOWN}`}>
      {role}
    </span>
  );
}

function UsersListContent() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Summary stats
  const [summary, setSummary] = useState<any>(null);

  // View Details modal
  const [viewDetailsModalOpen, setViewDetailsModalOpen] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState<any>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);

  // Archive modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Permanent delete modal state
  const [permanentDeleteModalOpen, setPermanentDeleteModalOpen] = useState(false);
  const [permanentDeleteReason, setPermanentDeleteReason] = useState("");
  const [permanentDeleteConfirmEmail, setPermanentDeleteConfirmEmail] = useState("");
  const [permanentDeleteForceChecked, setPermanentDeleteForceChecked] = useState(false);
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false);

  useEffect(() => {
    loadUsers();
    loadSummary();
  }, [page, roleFilter, statusFilter, deviceFilter]);

  const loadSummary = async () => {
    try {
      const res = await adminApi.getDashboardSummary();
      if (res.ok && res.data) {
        setSummary(res.data);
      }
    } catch (err) {
      // Summary is optional, don't show error
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page,
        pageSize,
      };
      
      if (search) params.search = search;
      if (roleFilter !== "all") params.role = roleFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      if (deviceFilter !== "all") params.deviceStatus = deviceFilter;

      const res = await adminApi.listUsers(params);

      if (res.ok && res.data) {
        const rawItems = extractUsersList(res.data);
        const normalizedUsers = rawItems.map(normalizeAdminUser);
        setUsers(normalizedUsers);
        setTotalCount(extractTotalCount(res.data));
      } else {
        setError(getApiErrorMessage(res.error));
      }
    } catch (err) {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleViewDetails = async (user: any) => {
    setSelectedUserDetails(user);
    setViewDetailsModalOpen(true);
    setLoadingUserDetails(true);
    try {
      const userId = Number(user.userId ?? user.UserId);
      const res = await adminApi.getUserDetails(userId);
      if (res.ok && res.data) {
        setSelectedUserDetails(res.data);
      }
    } catch (err) {
      toast.error("Failed to load user details");
    } finally {
      setLoadingUserDetails(false);
    }
  };

  const handleDeleteClick = (user: any) => {
    setSelectedUser(user);
    setDeleteReason("");
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser || !deleteReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    if (deleteReason.trim().length < 5) {
      toast.error("Reason must be at least 5 characters");
      return;
    }

    setIsDeleting(true);
    try {
      const userId = Number(selectedUser.userId);
      const res = await adminApi.deleteUser(userId, { reason: deleteReason.trim() });

      if (res.ok) {
        toast.success("User archived successfully");
        setDeleteModalOpen(false);
        setSelectedUser(null);
        setDeleteReason("");
        loadUsers();
      } else {
        const errorMessage = getApiErrorMessage(res.error);
        toast.error(errorMessage);
      }
    } catch (err) {
      toast.error("Failed to archive user");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePermanentDeleteClick = (user: any) => {
    setSelectedUser(user);
    setPermanentDeleteReason("");
    setPermanentDeleteConfirmEmail("");
    setPermanentDeleteForceChecked(false);
    setPermanentDeleteModalOpen(true);
  };

  const closePermanentDeleteModal = () => {
    if (isPermanentlyDeleting) return;
    setPermanentDeleteModalOpen(false);
    setSelectedUser(null);
    setPermanentDeleteReason("");
    setPermanentDeleteConfirmEmail("");
    setPermanentDeleteForceChecked(false);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (permanentDeleteModalOpen) closePermanentDeleteModal();
        if (deleteModalOpen) setDeleteModalOpen(false);
        if (viewDetailsModalOpen) setViewDetailsModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [permanentDeleteModalOpen, deleteModalOpen, viewDetailsModalOpen, isPermanentlyDeleting]);

  // Body scroll lock when any modal is open
  useEffect(() => {
    if (!permanentDeleteModalOpen && !deleteModalOpen && !viewDetailsModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [permanentDeleteModalOpen, deleteModalOpen, viewDetailsModalOpen]);

  const handlePermanentDeleteConfirm = async () => {
    if (!selectedUser) {
      toast.error("No user selected");
      return;
    }

    if (permanentDeleteReason.trim().length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }

    if (permanentDeleteConfirmEmail.trim().toLowerCase() !== selectedUser.email.toLowerCase()) {
      toast.error("Confirm email does not match user's email");
      return;
    }

    if (!permanentDeleteForceChecked) {
      toast.error("You must confirm that you understand this permanently deletes Module 1 user data");
      return;
    }

    setIsPermanentlyDeleting(true);
    try {
      const userId = Number(selectedUser.userId);
      const res = await adminApi.permanentlyDeleteUser(userId, {
        Reason: permanentDeleteReason.trim(),
        ConfirmEmail: permanentDeleteConfirmEmail.trim(),
        ForceDeleteModule1Data: true
      });

      if (res.ok) {
        toast.success("User permanently deleted");
        setPermanentDeleteModalOpen(false);
        setSelectedUser(null);
        setPermanentDeleteReason("");
        setPermanentDeleteConfirmEmail("");
        setPermanentDeleteForceChecked(false);
        loadUsers();
      } else {
        const errorMessage = getApiErrorMessage(res.error);
        toast.error(errorMessage);
      }
    } catch (err) {
      toast.error("Failed to permanently delete user");
    } finally {
      setIsPermanentlyDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Active: "badge-success",
      PendingFirstAccess: "badge-warning",
      Disabled: "badge-danger",
      Archived: "badge-secondary"
    };
    return <span className={`badge ${colors[status] || "badge-secondary"}`}>{status}</span>;
  };

  const getDeviceBadge = (deviceStatus?: string) => {
    if (!deviceStatus) return <span className="badge badge-secondary">Unknown</span>;
    const colors: Record<string, string> = {
      Approved: "badge-success",
      NotBound: "badge-warning",
      Revoked: "badge-danger"
    };
    return <span className={`badge ${colors[deviceStatus] || "badge-secondary"}`}>{deviceStatus}</span>;
  };

  if (loading) {
    return <FullPageLoading message="Loading users..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users <span className="text-xs text-red-400">FLOW_FIX_ACTIVE_2026</span></h1>
          <p className="text-slate-400 text-sm">Manage student, teacher, and administrator accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { loadUsers(); loadSummary(); }}
            className="btn btn-secondary"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link href="/dashboard/admin/register-user" className="btn">
            <Users className="h-4 w-4" />
            Register User
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="card p-4">
            <p className="text-slate-400 text-sm">Total Users</p>
            <p className="text-2xl font-bold text-slate-200">{summary.totalUsers || 0}</p>
          </div>
          <div className="card p-4">
            <p className="text-slate-400 text-sm">Students</p>
            <p className="text-2xl font-bold text-primary-400">{summary.totalStudents || 0}</p>
          </div>
          <div className="card p-4">
            <p className="text-slate-400 text-sm">Teachers</p>
            <p className="text-2xl font-bold text-info-400">{summary.totalTeachers || 0}</p>
          </div>
          <div className="card p-4">
            <p className="text-slate-400 text-sm">Admins</p>
            <p className="text-2xl font-bold text-success-400">{summary.totalAdmins || 0}</p>
          </div>
          <div className="card p-4">
            <p className="text-slate-400 text-sm">Active</p>
            <p className="text-2xl font-bold text-success-400">{summary.activeUsers || 0}</p>
          </div>
          <div className="card p-4">
            <p className="text-slate-400 text-sm">Pending</p>
            <p className="text-2xl font-bold text-warning-400">{summary.pendingFirstAccessUsers || 0}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="card p-4 bg-danger-500/10 border-danger-500/50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-danger-400" />
            <p className="text-sm text-danger-200">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, email, or username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="min-w-[150px]"
            >
              <option value="all">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="TEACHER">Teacher</option>
              <option value="STUDENT">Student</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="min-w-[150px]"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="PendingFirstAccess">Pending First Access</option>
              <option value="Disabled">Disabled</option>
              <option value="Archived">Archived</option>
            </select>
            <select
              value={deviceFilter}
              onChange={(e) => { setDeviceFilter(e.target.value); setPage(1); }}
              className="min-w-[150px]"
            >
              <option value="all">All Device Status</option>
              <option value="Approved">Approved</option>
              <option value="NotBound">Not Bound</option>
              <option value="Revoked">Revoked</option>
            </select>
            <button type="submit" className="btn">
              <Filter className="h-4 w-4" />
              Apply
            </button>
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 text-left text-sm text-slate-400">
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Email Verified</th>
                <th className="p-4 font-medium">Device Status</th>
                <th className="p-4 font-medium">Last Login</th>
                <th className="p-4 font-medium">Created</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user, index) => {
                  const userId = user.userId ?? user.UserId ?? user.id ?? user.Id;
                  const fullName = user.fullName ?? user.FullName ?? "N/A";
                  const email = user.email ?? user.Email ?? "N/A";
                  const username = user.username ?? user.Username;
                  const accountStatus = user.accountStatus ?? user.AccountStatus ?? "UNKNOWN";
                  const emailVerified = user.emailVerified ?? user.EmailVerified ?? false;
                  const deviceStatus = user.deviceStatus ?? user.DeviceStatus;
                  const lastLoginAt = user.lastLoginAt ?? user.LastLoginAt;
                  const createdAt = user.createdAt ?? user.CreatedAt;

                  return (
                    <tr 
                      key={String(userId ?? `${email}-${index}`)} 
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/admin/users/${userId}`)}
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-slate-200">{fullName}</p>
                          <p className="text-sm text-slate-400">{email}</p>
                          {username && (
                            <p className="text-xs text-slate-500">@{username}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{getRoleBadge(user)}</td>
                      <td className="p-4">{getStatusBadge(accountStatus)}</td>
                      <td className="p-4">
                        {emailVerified ? (
                          <span className="text-success-400">✓ Verified</span>
                        ) : (
                          <span className="text-warning-400">✗ Not Verified</span>
                        )}
                      </td>
                      <td className="p-4">{getDeviceBadge(deviceStatus)}</td>
                      <td className="p-4 text-sm text-slate-400">
                        {lastLoginAt
                          ? new Date(lastLoginAt).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="p-4 text-sm text-slate-400">
                        {createdAt ? new Date(createdAt).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn-ghost p-2"
                            title="View Details"
                            onClick={() => router.push(`/dashboard/admin/users/${userId}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            className="btn-ghost p-2 text-warning-400"
                            title="Archive User"
                            onClick={() => handleDeleteClick(user)}
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Permanently delete user"
                            onClick={() => handlePermanentDeleteClick(user)}
                            className="rounded-lg p-2 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between p-4 border-t border-slate-800">
            <p className="text-sm text-slate-400">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} users
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary text-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= totalCount}
                className="btn btn-secondary text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* View Details Modal */}
        <PortalModal open={viewDetailsModalOpen}>
          {viewDetailsModalOpen && selectedUserDetails && (
            <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
              <div className="card p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">User Details</h3>
                <button
                  onClick={() => setViewDetailsModalOpen(false)}
                  className="btn-ghost p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {loadingUserDetails ? (
                <div className="text-center py-8 text-slate-400">Loading...</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-500 text-sm">Full Name</p>
                      <p className="text-slate-200">{selectedUserDetails.fullName || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">Email</p>
                      <p className="text-slate-200">{selectedUserDetails.email || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">Username</p>
                      <p className="text-slate-200">{selectedUserDetails.username || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">Phone</p>
                      <p className="text-slate-200">{selectedUserDetails.phoneNumber || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">Role</p>
                      <p className="text-slate-200">{selectedUserDetails.role || "UNKNOWN"}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">Account Status</p>
                      <p className="text-slate-200">{selectedUserDetails.accountStatus || "UNKNOWN"}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">Email Verified</p>
                      <p className="text-slate-200">{selectedUserDetails.emailVerified ? "Yes" : "No"}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">First Access Completed</p>
                      <p className="text-slate-200">
                        {selectedUserDetails.firstLoginCompletedAt
                          ? new Date(selectedUserDetails.firstLoginCompletedAt).toLocaleString()
                          : "No"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">Last Login</p>
                      <p className="text-slate-200">
                        {selectedUserDetails.lastLoginAt
                          ? new Date(selectedUserDetails.lastLoginAt).toLocaleString()
                          : "Never"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">Created At</p>
                      <p className="text-slate-200">
                        {selectedUserDetails.createdAt
                          ? new Date(selectedUserDetails.createdAt).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                  {selectedUserDetails.credential && (
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                      <p className="text-slate-500 text-sm mb-2">Credential Summary</p>
                      <p className="text-slate-300 text-sm">
                        Password hash exists: {selectedUserDetails.credential ? "Yes" : "No"}
                      </p>
                    </div>
                  )}
                  {selectedUserDetails.devices && (
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                      <p className="text-slate-500 text-sm mb-2">Device Summary</p>
                      <p className="text-slate-300 text-sm">
                        Total devices: {Array.isArray(selectedUserDetails.devices) ? selectedUserDetails.devices.length : 0}
                      </p>
                    </div>
                  )}
                  {selectedUserDetails.sessions && (
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                      <p className="text-slate-500 text-sm mb-2">Session Summary</p>
                      <p className="text-slate-300 text-sm">
                        Active sessions: {Array.isArray(selectedUserDetails.sessions) ? selectedUserDetails.sessions.length : 0}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          )}
        </PortalModal>

        {/* Archive Confirmation Modal */}
        <PortalModal open={deleteModalOpen}>
          {deleteModalOpen && selectedUser && (
            <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
              <div className="card p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Archive user?</h3>
                  <button
                    onClick={() => setDeleteModalOpen(false)}
                    className="btn-ghost p-1"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-slate-400 text-sm mb-4">
                  This will archive the user, revoke active sessions, revoke refresh tokens, and prevent future login. Audit history will be preserved.
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Reason (required)</label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Enter reason for archiving this user..."
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500"
                    rows={3}
                    disabled={isDeleting}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteModalOpen(false)}
                    disabled={isDeleting}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting || !deleteReason.trim()}
                    className="btn bg-warning-500 hover:bg-warning-600 flex-1"
                  >
                    {isDeleting ? "Archiving..." : "Archive User"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </PortalModal>

        {/* Permanent Delete Confirmation Modal */}
        <PortalModal open={permanentDeleteModalOpen}>
          {permanentDeleteModalOpen && selectedUser && (
            <div
              className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={closePermanentDeleteModal}
            >
              <div
                className="max-w-lg w-full rounded-2xl border border-red-500/30 bg-slate-950 p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-danger-400">Permanently delete user?</h3>
                  <button
                    onClick={closePermanentDeleteModal}
                    disabled={isPermanentlyDeleting}
                    className="btn-ghost p-1"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="bg-danger-500/10 border border-danger-500/50 rounded-lg p-4 mb-4">
                  <p className="text-danger-200 text-sm font-medium mb-2">
                    ⚠️ WARNING: This action cannot be undone
                  </p>
                  <p className="text-slate-400 text-sm">
                    This will permanently delete this user and related Module 1 authentication/security records including:
                  </p>
                  <ul className="text-slate-400 text-xs mt-2 list-disc list-inside space-y-1">
                    <li>User roles and credentials</li>
                    <li>User devices and sessions</li>
                    <li>Refresh tokens and OTPs</li>
                    <li>Login challenges and activities</li>
                    <li>Device replacement requests</li>
                  </ul>
                </div>
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Full Name</p>
                      <p className="text-slate-200 font-medium">{selectedUser.fullName || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Email</p>
                      <p className="text-slate-200 font-medium">{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Role</p>
                      <p className="text-slate-200 font-medium">{selectedUser.role}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Status</p>
                      <p className="text-slate-200 font-medium">{selectedUser.accountStatus}</p>
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Reason (required, min 10 characters)</label>
                  <textarea
                    value={permanentDeleteReason}
                    onChange={(e) => setPermanentDeleteReason(e.target.value)}
                    placeholder="Enter reason for permanently deleting this user..."
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-danger-500"
                    rows={3}
                    disabled={isPermanentlyDeleting}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Confirm Email (required)</label>
                  <input
                    type="email"
                    value={permanentDeleteConfirmEmail}
                    onChange={(e) => setPermanentDeleteConfirmEmail(e.target.value)}
                    placeholder={`Type ${selectedUser.email} to confirm`}
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-danger-500"
                    disabled={isPermanentlyDeleting}
                  />
                </div>
                <div className="mb-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permanentDeleteForceChecked}
                      onChange={(e) => setPermanentDeleteForceChecked(e.target.checked)}
                      className="mt-1 text-danger-500"
                      disabled={isPermanentlyDeleting}
                    />
                    <span className="text-sm text-slate-300">
                      I understand this permanently deletes Module 1 user data and cannot be undone.
                    </span>
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={closePermanentDeleteModal}
                    disabled={isPermanentlyDeleting}
                    className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePermanentDeleteConfirm}
                  disabled={
                    isPermanentlyDeleting ||
                    permanentDeleteReason.trim().length < 10 ||
                    permanentDeleteConfirmEmail.trim().toLowerCase() !== selectedUser.email.toLowerCase() ||
                    !permanentDeleteForceChecked
                  }
                  className="btn bg-danger-500 hover:bg-danger-600 flex-1"
                >
                  {isPermanentlyDeleting ? "Deleting..." : "Permanently Delete User"}
                </button>
              </div>
            </div>
          </div>
          )}
        </PortalModal>

      </div>
    </div>
  );
}

export default function UsersListPage() {
  return (
    <AuthGuard allowedRoles={["ADMIN"]}>
      <UsersListContent />
    </AuthGuard>
  );
}
