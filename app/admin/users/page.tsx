"use client";
import { useState } from "react";
import { ActionCard, SelectInput, TextInput } from "@/src/components/action-card";
import { authApi } from "@/src/lib/api/auth";
export default function AdminUsersPage() {
  const [fullName,setFullName]=useState(""); const [email,setEmail]=useState(""); const [username,setUsername]=useState(""); const [phone,setPhone]=useState(""); const [role,setRole]=useState("STUDENT"); const [institutional,setInstitutional]=useState("");
  return <div className="grid gap-6"><h1 className="text-2xl font-bold">Admin User Registration</h1><ActionCard title="Register STUDENT / TEACHER" description="Requires ADMIN access token. Backend generates temporary password." onSubmit={() => authApi.registerUser({ FullName: fullName, Email: email, Username: username || undefined, PhoneNumber: phone || undefined, Role: role as "STUDENT"|"TEACHER", InstitutionalIdentifier: institutional || undefined })}><TextInput label="FullName" value={fullName} onChange={setFullName}/><TextInput label="Email" value={email} onChange={setEmail}/><TextInput label="Username optional" value={username} onChange={setUsername}/><TextInput label="PhoneNumber optional" value={phone} onChange={setPhone}/><SelectInput label="Role" value={role} onChange={setRole} options={["STUDENT","TEACHER"]}/><TextInput label="InstitutionalIdentifier optional" value={institutional} onChange={setInstitutional}/></ActionCard></div>;
}
