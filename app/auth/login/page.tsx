"use client";
import { useState } from "react";
import { ActionCard, TextInput } from "@/src/components/action-card";
import { authApi } from "@/src/lib/api/auth";
import { buildDeviceContext } from "@/src/lib/device/device-context";
export default function LoginPage() {
  const [identifier,setIdentifier]=useState(""); const [password,setPassword]=useState(""); const [challenge,setChallenge]=useState(""); const [otp,setOtp]=useState(""); const [restricted,setRestricted]=useState("");
  const deviceContext = buildDeviceContext();
  return <div className="grid gap-6"><h1 className="text-2xl font-bold">Normal Login Wizard</h1>
    <ActionCard title="1. Start login" description="Sends OTP. Does not create session." onSubmit={() => authApi.login({ Identifier: identifier, Password: password, Device: deviceContext })}><TextInput label="Identifier" value={identifier} onChange={setIdentifier}/><TextInput label="Password" value={password} onChange={setPassword} type="password"/></ActionCard>
    <ActionCard title="2. Verify login OTP" description="Verifies OTP only. Student device binding is checked here." onSubmit={() => authApi.verifyLoginOtp({ LoginChallengeId: challenge, OtpCode: otp, Device: deviceContext })}><TextInput label="LoginChallengeId" value={challenge} onChange={setChallenge}/><TextInput label="OTP" value={otp} onChange={setOtp}/></ActionCard>
    <ActionCard title="3. Complete login" description="Creates session, access token and HttpOnly refresh cookie." onSubmit={() => authApi.completeLogin({ ChallengeId: challenge, RestrictedAuthorizationToken: restricted || undefined })}><TextInput label="ChallengeId" value={challenge} onChange={setChallenge}/><TextInput label="RestrictedAuthorizationToken optional" value={restricted} onChange={setRestricted}/></ActionCard>
  </div>;
}
