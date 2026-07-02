import Link from "next/link";

export function NavBar() {
  return (
    <header className="navbar">
      <Link href="/" className="brand">
        Ride Together
      </Link>
    </header>
  );
}
