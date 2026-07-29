"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Lock,
  QrCode,
  Shield,
  Smartphone,
  Users,
} from "lucide-react";

const LOGIN_PATH = "/login";
const FIRST_ACCESS_PATH = "/auth/first-access";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/50 backdrop-blur-sm bg-slate-950/50 sticky top-0 z-50">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <QrCode className="h-8 w-8 text-primary-500" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-accent-500 bg-clip-text text-transparent">
                Smart QR Attendance
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-slate-300 hover:text-white transition-colors">Features</a>
              <a href="#security" className="text-sm text-slate-300 hover:text-white transition-colors">Security</a>
              <a href="#how-it-works" className="text-sm text-slate-300 hover:text-white transition-colors">How It Works</a>
            </nav>
            <div className="flex items-center gap-3">
              <Link href={LOGIN_PATH} className="btn">
                Login
              </Link>
              <Link href={FIRST_ACCESS_PATH} className="btn-ghost">
                First Access
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="section relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-500/5 to-transparent" />
        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 badge mb-6 animate-fade-in">
              <Shield className="h-4 w-4" />
              Secure QR-Based Attendance System
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 animate-slide-up">
              <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Smart QR Attendance System
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
              OTP-protected authentication, student device binding, and refresh-token session management.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Link href={LOGIN_PATH} className="btn text-base px-6 py-3">
                Login to Dashboard
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href={FIRST_ACCESS_PATH} className="btn-secondary text-base px-6 py-3">
                <KeyRound className="h-5 w-5" />
                Complete First Access
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section bg-slate-900/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Powerful Security Features</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Built with enterprise-grade security to prevent attendance fraud and protect user accounts.
            </p>
          </div>
          <div className="grid-responsive">
            <FeatureCard
              icon={<QrCode className="h-6 w-6" />}
              title="QR Attendance Fraud Prevention"
              description="Prevents students from marking attendance for absent classmates through device binding."
            />
            <FeatureCard
              icon={<Smartphone className="h-6 w-6" />}
              title="One Approved Device Per Student"
              description="Each student account is locked to one approved browser/device installation."
            />
            <FeatureCard
              icon={<Lock className="h-6 w-6" />}
              title="OTP-Based Authentication"
              description="Multi-factor authentication with email OTP verification for secure login."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Admin-Controlled Onboarding"
              description="Administrators register users with temporary passwords for controlled access."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Secure Refresh-Token Sessions"
              description="Token rotation and reuse detection for enhanced session security."
            />
            <FeatureCard
              icon={<KeyRound className="h-6 w-6" />}
              title="Device Replacement Flow"
              description="Admin-approved device replacement for lost or compromised devices."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="section">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Simple, secure, and streamlined attendance management workflow.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="space-y-6">
              <StepCard
                step={1}
                title="Admin Registers User"
                description="Administrator creates user account with temporary password and assigns role (STUDENT or TEACHER)."
              />
              <StepCard
                step={2}
                title="User Completes First Access"
                description="User logs in with temporary password, verifies OTP, and sets permanent password."
              />
              <StepCard
                step={3}
                title="User Logs In with OTP"
                description="User enters credentials, receives OTP via email, and verifies identity."
              />
              <StepCard
                step={4}
                title="System Checks Device Binding"
                description="For students, system verifies the browser/device matches the approved installation."
              />
              <StepCard
                step={5}
                title="User Lands on Role Dashboard"
                description="User is redirected to their role-specific dashboard with full access to features."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="section bg-slate-900/30">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Security Architecture</h2>
              <p className="text-slate-400">
                Understanding the fraud prevention mechanism.
              </p>
            </div>
            <div className="card p-8">
              <div className="flex items-start gap-4 mb-6">
                <AlertTriangle className="h-6 w-6 text-danger-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">The Fraud Scenario</h3>
                  <p className="text-slate-400 mb-4">
                    Without device binding, a student could:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-slate-300">
                    <li>Scan QR code and mark own attendance</li>
                    <li>Log out of their account</li>
                    <li>Log into another student's account from the same browser</li>
                    <li>Scan QR again and mark fake attendance</li>
                  </ol>
                </div>
              </div>
              <div className="border-t border-slate-800 pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="h-6 w-6 text-success-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Our Solution</h3>
                    <p className="text-slate-400 mb-4">
                      Each STUDENT account is bound to one approved browser/device installation identified by a unique installation ID.
                    </p>
                    <ul className="space-y-2 text-slate-300">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success-500" />
                        Students cannot log in from unapproved devices
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success-500" />
                        Device binding is enforced during login and token refresh
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success-500" />
                        Lost devices require admin-approved replacement flow
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section">
        <div className="container">
          <div className="card p-12 text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-slate-400 mb-8">
              Log in to your dashboard or complete first access to activate your account.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href={LOGIN_PATH} className="btn text-base px-6 py-3">
                Login Now
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href={FIRST_ACCESS_PATH} className="btn-secondary text-base px-6 py-3">
                First Access Setup
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <QrCode className="h-6 w-6 text-primary-500" />
              <span className="font-semibold">Smart QR Attendance</span>
            </div>
            <p className="text-sm text-slate-500">
              Module 1: Authentication and Security System
            </p>
            <div className="flex items-center gap-4">
              <Link href={LOGIN_PATH} className="text-sm text-slate-400 hover:text-white transition-colors">
                Login
              </Link>
              <Link href={FIRST_ACCESS_PATH} className="text-sm text-slate-400 hover:text-white transition-colors">
                First Access
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="card card-hover p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-lg bg-primary-500/10 text-primary-400">
          {icon}
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  );
}

function StepCard({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-bold">
        {step}
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-slate-400 text-sm">{description}</p>
      </div>
    </div>
  );
}
