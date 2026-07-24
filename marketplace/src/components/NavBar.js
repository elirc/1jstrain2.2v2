import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function NavBar() {
  const user = await getCurrentUser();

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          MarketForge
        </Link>

        <nav className="nav-links">
          <Link href="/">Discover</Link>
          <Link href="/cart">Cart</Link>
          <Link href="/orders">Orders</Link>
          <Link href="/seller">Seller</Link>
          <Link href="/admin">Admin</Link>
        </nav>

        <div className="auth-section">
          {user ? (
            <>
              <span className="muted">{user.name} ({user.role})</span>
              <LogoutButton />
            </>
          ) : (
            <Link href="/auth" className="button">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

