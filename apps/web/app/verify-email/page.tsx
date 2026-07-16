"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "../../lib/api";
import { resendVerification, verifyEmail } from "../../lib/auth";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? "";
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await verifyEmail(userId, code);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xác thực thất bại.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResendMessage(null);
    setError(null);
    setResending(true);
    try {
      await resendVerification(userId);
      setResendMessage("Đã gửi lại mã xác thực.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không gửi lại được mã.");
    } finally {
      setResending(false);
    }
  }

  if (!userId) {
    return (
      <main className="auth-shell">
        <div className="card">
          <p className="error-text">Thiếu thông tin tài khoản cần xác thực.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <div className="card">
        <h2>Xác thực email</h2>
        <p className="hint">Nhập mã 6 chữ số vừa được gửi tới email của bạn.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="code">Mã xác thực</label>
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              required
            />
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          {resendMessage ? <p className="hint">{resendMessage}</p> : null}
          <button className="btn" type="submit" disabled={submitting} style={{ width: "100%" }}>
            {submitting ? "Đang xác thực..." : "Xác thực"}
          </button>
        </form>

        <button className="link-button" onClick={handleResend} disabled={resending} style={{ marginTop: 12 }}>
          {resending ? "Đang gửi..." : "Gửi lại mã"}
        </button>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
