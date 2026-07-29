import type { Metadata } from "next";
import "./globals.css";
import { DashboardShell } from "@/src/components/dashboard-shell";
import { AuthProvider } from "@/src/components/auth-provider";

export const metadata: Metadata = { 
  title: "Smart QR Attendance System", 
  description: "Secure QR-based attendance system with OTP authentication and device binding" 
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <DashboardShell>{children}</DashboardShell>
        </AuthProvider>
      </body>
    </html>
  );
}