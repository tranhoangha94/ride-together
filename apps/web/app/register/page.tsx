"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "../../lib/api";
import { register } from "../../lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await register({
        email: method === "email" ? emailOrPhone : undefined,
        phone: method === "phone" ? emailOrPhone : undefined,
        password,
        displayName
      });
      if ("needsVerification" in result) {
        router.push(`/verify-email?userId=${result.userId}`);
      } else {
        router.push("/");
      }
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
        <p className="hint">Lưu lại lịch sử chuyến đi và quản lý nhóm của bạn.</p>

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
