"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavBar() {
  const pathname = usePathname();
  // The home screen already shows the "Ride Together" brand and tagline in
  // its own card, so the top navbar is pure duplicate chrome eating into
  // mobile viewport height there.
  if (pathname === "/") return null;

  return (
    <header className="navbar">
      <Link href="/" className="brand">
        Ride Together
      </Link>
    </header>
  );
}
