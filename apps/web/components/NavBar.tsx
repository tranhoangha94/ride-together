"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavBar() {
  const pathname = usePathname();
  // The home screen already shows the "Phượt Together" brand and tagline in
  // its own card, so the top navbar is pure duplicate chrome eating into
  // mobile viewport height there.
  if (pathname === "/") return null;

  return (
    <header className="navbar">
      <Link href="/" className="brand">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
          <path d="M15 9L12.8 12.8L9 15L11.2 11.2L15 9Z" fill="currentColor" />
        </svg>
        Phượt Together
      </Link>
    </header>
  );
}
