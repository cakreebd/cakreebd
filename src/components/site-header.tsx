import Link from "next/link";
import type { SessionUser } from "@/lib/auth";
import LogoutButton from "@/components/logout-button";
import ProfileAvatar from "@/components/profile-avatar";

export default function SiteHeader({ user }: { user: SessionUser | null }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link aria-label="Cakree home" className="brand" href="/">
          <span className="brand-mark"><span aria-hidden="true">C</span></span>
          <span>Cakree<span className="brand-period">.</span></span>
        </Link>
        <nav aria-label="Main navigation" className="main-nav">
          <Link className="nav-link" href="/jobs">Find jobs</Link>
          <Link className="nav-link" href="/companies">Companies</Link>
          <Link className="nav-link" href="/career-resources">Career resources</Link>
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <Link className="login-link header-profile-link" href={user.role === "ADMIN" ? "/admin" : "/dashboard"}>
                <ProfileAvatar className="header-profile-avatar" name={user.name} pictureUrl={user.profilePictureUrl} />
                {user.role === "ADMIN" ? "Admin dashboard" : "My dashboard"}
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link className="login-link" href="/login">Log in</Link>
              <Link className="button button-dark button-small" href="/register?role=employer">Post a job</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
