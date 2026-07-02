"use client";

import Link from "next/link";
import { useAuth } from "../lib/auth-context";

export function NavBar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <Link href="/teams" className="brand">
        Ride Together
      </Link>
      {user ? (
        <div className="navbar-right">
          <span className="hint">{user.displayName}</span>
          <button className="link-button" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      ) : (
        <div className="navbar-right">
          <Link href="/login">Đăng nhập</Link>
        </div>
      )}
    </header>
  );
}
