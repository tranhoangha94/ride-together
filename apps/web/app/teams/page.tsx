"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "../../lib/require-auth";
import { api, ApiError } from "../../lib/api";
import { Team } from "../../lib/types";

function TeamsPageContent() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadTeams() {
    setLoading(true);
    try {
      const data = await api<Team[]>("/teams");
      setTeams(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được danh sách team.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTeams();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await api<Team>("/teams", {
        method: "POST",
        body: JSON.stringify({ name, description: description || undefined })
      });
      setName("");
      setDescription("");
      await loadTeams();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tạo team thất bại.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main>
      <div className="toolbar">
        <div>
          <h1>Đội của bạn</h1>
          <p className="hint">Tạo team cho nhóm phượt, hoặc vào team đã có để tạo/tham gia chuyến đi.</p>
        </div>
        <Link href="/teams/join" className="btn btn-secondary">
          Tham gia team bằng mã mời
        </Link>
      </div>

      <div className="card">
        <h2>Tạo team mới</h2>
        <form onSubmit={handleCreate}>
          <div className="form-field">
            <label htmlFor="name">Tên team</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="description">Mô tả (tuỳ chọn)</label>
            <input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="btn" type="submit" disabled={creating}>
            {creating ? "Đang tạo..." : "Tạo team"}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Team của bạn</h2>
        {loading ? (
          <p className="hint">Đang tải...</p>
        ) : teams.length === 0 ? (
          <p className="hint">Bạn chưa thuộc team nào. Tạo mới hoặc tham gia bằng mã mời.</p>
        ) : (
          teams.map((team) => (
            <div key={team.id} className="list-item">
              <div>
                <strong>{team.name}</strong>
                {team.description ? <div className="hint">{team.description}</div> : null}
              </div>
              <Link href={`/teams/${team.id}`} className="btn btn-secondary">
                Mở
              </Link>
            </div>
          ))
        )}
      </div>
    </main>
  );
}

export default function TeamsPage() {
  return (
    <RequireAuth>
      <TeamsPageContent />
    </RequireAuth>
  );
}
