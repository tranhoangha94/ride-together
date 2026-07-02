"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "../../../lib/require-auth";
import { api, ApiError } from "../../../lib/api";
import { TeamMember } from "../../../lib/types";

function JoinTeamContent() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const member = await api<TeamMember>("/teams/join", {
        method: "POST",
        body: JSON.stringify({ inviteCode: inviteCode.trim() })
      });
      router.push(`/teams/${member.teamId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Mã mời không hợp lệ.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="card">
        <h2>Tham gia team</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="inviteCode">Mã mời</label>
            <input
              id="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
              placeholder="Nhập mã do leader chia sẻ"
            />
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="btn" type="submit" disabled={submitting} style={{ width: "100%" }}>
            {submitting ? "Đang tham gia..." : "Tham gia"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function JoinTeamPage() {
  return (
    <RequireAuth>
      <JoinTeamContent />
    </RequireAuth>
  );
}
