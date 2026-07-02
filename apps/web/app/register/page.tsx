"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth-context";
import { ApiError } from "../../lib/api";
import { GoogleSignInButton } from "../../components/GoogleSignInButton";

export default function RegisterPage() {
  const { register } = useAuth();
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [displayName, setDisplayName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({
        email: mode === "email" ? identifier : undefined,
        phone: mode === "phone" ? identifier : undefined,
        password,
        displayName
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Đăng ký thất bại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="card">
        <h2>Tạo tài khoản</h2>
        <div className="toolbar" style={{ marginBottom: 14 }}>
          <button
            type="button"
            className={mode === "email" ? "btn" : "btn btn-secondary"}
            onClick={() => {
              setMode("email");
              setIdentifier("");
            }}
          >
            Email
          </button>
          <button
            type="button"
            className={mode === "phone" ? "btn" : "btn btn-secondary"}
            onClick={() => {
              setMode("phone");
              setIdentifier("");
            }}
          >
            Số điện thoại
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="displayName">Tên hiển thị</label>
            <input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          {mode === "email" ? (
            <div className="form-field">
              <label htmlFor="identifier">Email</label>
              <input
                id="identifier"
                type="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          ) : (
            <div className="form-field">
              <label htmlFor="identifier">Số điện thoại</label>
              <input
                id="identifier"
                type="tel"
                placeholder="0912345678"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="tel"
              />
            </div>
          )}
          <div className="form-field">
            <label htmlFor="password">Mật khẩu (tối thiểu 8 ký tự)</label>
            <input
              id="password"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="btn" type="submit" disabled={submitting} style={{ width: "100%" }}>
            {submitting ? "Đang tạo..." : "Tạo tài khoản"}
          </button>
        </form>
        <GoogleSignInButton />
      </div>
      <p className="hint">
        Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
      </p>
    </main>
  );
}
