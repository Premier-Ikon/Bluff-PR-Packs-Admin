"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/AuthProvider";

const LOGO =
  "https://gotbluff.com/cdn/shop/files/BLUFF_LOGO_White.png?v=1787179258&width=400";

export function AdminChrome({
  children,
  onRefresh,
  refreshing = false,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const { loading, ready, user, requestCode, verifyCode, logOut } = useAuth();
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onRequestCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const message = await requestCode(email);
      setNotice(message);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a code.");
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await verifyCode(email, code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify that code.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="shell">
        <p className="empty">Loading…</p>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="login">
        <form className="card">
          <img className="logo" src={LOGO} alt="Got Bluff" style={{ filter: "invert(1)" }} />
          <h1>PR Admin</h1>
          <p className="muted">
            Add Firebase web keys to <code>.env.local</code> so the team can sign in.
          </p>
        </form>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="login">
        <form className="card" onSubmit={step === "email" ? onRequestCode : onVerifyCode}>
          <img className="logo" src={LOGO} alt="Got Bluff" style={{ filter: "invert(1)" }} />
          <h1>PR Admin</h1>
          <p className="muted">
            {step === "email"
              ? "Enter your Premier Ikon email. We’ll send a one-time code if you’re on the team list."
              : `Enter the 6-digit code sent to ${email}.`}
          </p>
          {step === "email" ? (
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </label>
          ) : (
            <label>
              Code
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                autoComplete="one-time-code"
                placeholder="123456"
              />
            </label>
          )}
          {notice ? <p className="muted">{notice}</p> : null}
          {error ? <p className="error">{error}</p> : null}
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Please wait…" : step === "email" ? "Send code" : "Sign in"}
          </button>
          {step === "code" ? (
            <button
              className="ghost"
              type="button"
              disabled={busy}
              onClick={() => {
                setStep("email");
                setCode("");
                setNotice("");
                setError("");
              }}
            >
              Use a different email
            </button>
          ) : null}
        </form>
      </main>
    );
  }

  return (
    <>
      <header className="admin-header">
        <div className="admin-header-inner">
          <Link className="brand" href="/">
            <img src={LOGO} alt="Got Bluff" />
            <span>PR Admin</span>
          </Link>
          <nav className="admin-nav">
            <Link className={pathname === "/" ? "is-on" : ""} href="/">
              Requests
            </Link>
            <Link className={pathname === "/settings" ? "is-on" : ""} href="/settings">
              Settings
            </Link>
          </nav>
          <div className="toolbar-actions">
            {onRefresh ? (
              <button className="ghost" type="button" onClick={onRefresh} disabled={refreshing}>
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
            ) : null}
            <button className="ghost" type="button" onClick={() => void logOut()}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
