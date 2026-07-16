"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "../../lib/api";
import { login } from "../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(emailOrPhone, password);
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { needsVerification?: boolean; userId?: string } | undefined;
        if (body?.needsVerification && body.userId) {
          router.push(`/verify-email?userId=${body.userId}`);
          return;
        }
        setError(err.message);
      } else {
        setError("Đăng nhập thất bại.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="card">
        <h2>Đăng nhập</h2>
        <p className="hint">Đăng nhập để lưu lịch sử chuyến đi và quản lý nhóm.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="emailOrPhone">Email hoặc số điện thoại</label>
            <input id="emailOrPhone" value={emailOrPhone} onChange={(e) => setEmailOrPhone(e.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="btn" type="submit" disabled={submitting} style={{ width: "100%" }}>
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <p className="hint" style={{ marginTop: 12 }}>
          Chưa có tài khoản? <Link href="/register">Đăng ký</Link>
        </p>
      </div>
    </main>
  );
}
