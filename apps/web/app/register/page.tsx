"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "../../lib/api";
import { register } from "../../lib/auth";
import { GoogleSignInButton } from "../../components/GoogleSignInButton";

export default function RegisterPage() {
  const router = useRouter();
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({
        email: method === "email" ? emailOrPhone : undefined,
        phone: method === "phone" ? emailOrPhone : undefined,
        password,
        displayName
      });
      setSuccess(true);
      setTimeout(() => router.push("/"), 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Đăng ký thất bại.");
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      {success ? <div className="toast-banner">Đăng ký thành công! Đang vào ứng dụng...</div> : null}
      <div className="card">
        <h2>Tạo tài khoản</h2>
        <p className="hint">Lưu lại lịch sử chuyến đi và quản lý nhóm của bạn.</p>

        <GoogleSignInButton />
        <p className="hint" style={{ textAlign: "center", margin: "0 0 16px" }}>
          — hoặc —
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button
            type="button"
            className={`btn ${method === "email" ? "" : "btn-secondary"}`}
            onClick={() => setMethod("email")}
            style={{ flex: 1 }}
          >
            Email
          </button>
          <button
            type="button"
            className={`btn ${method === "phone" ? "" : "btn-secondary"}`}
            onClick={() => setMethod("phone")}
            style={{ flex: 1 }}
          >
            Số điện thoại
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="displayName">Tên hiển thị</label>
            <input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="emailOrPhone">{method === "email" ? "Email" : "Số điện thoại"}</label>
            <input
              id="emailOrPhone"
              type={method === "email" ? "email" : "tel"}
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="btn" type="submit" disabled={submitting} style={{ width: "100%" }}>
            {submitting ? "Đang tạo..." : "Đăng ký"}
          </button>
        </form>

        <p className="hint" style={{ marginTop: 12 }}>
          Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
        </p>
      </div>
    </main>
  );
}
