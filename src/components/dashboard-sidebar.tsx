import Link from "next/link";

type DashboardRole = "JOB_SEEKER" | "EMPLOYER" | "ADMIN";

const navigation = {
  JOB_SEEKER: [
    { href: "/dashboard", label: "Overview", section: "overview" },
    { href: "/dashboard/applications", label: "Applications", section: "applications" },
    { href: "/dashboard/saved", label: "Saved jobs", section: "saved" },
    { href: "/dashboard/alerts", label: "Job alerts", section: "alerts" },
    { href: "/dashboard/profile", label: "My profile", section: "profile" },
    { href: "/dashboard/cv", label: "My CV", section: "cv" },
    { href: "/dashboard/notifications", label: "Notifications", section: "notifications" },
    { href: "/resume", label: "Resume builder", section: "resume" },
  ],
  EMPLOYER: [
    { href: "/dashboard", label: "Overview", section: "overview" },
    { href: "/dashboard/post-job", label: "Post a job", section: "post-job" },
    { href: "/dashboard/jobs", label: "Job postings", section: "jobs" },
    { href: "/dashboard/applicants", label: "Applicants", section: "applicants" },
    { href: "/dashboard/analytics", label: "Analytics", section: "analytics" },
    { href: "/dashboard/candidates", label: "Find candidates", section: "candidates" },
    { href: "/dashboard/company", label: "Company profile", section: "company" },
    { href: "/dashboard/verification", label: "Verification", section: "verification" },
    { href: "/dashboard/plan", label: "Hiring package", section: "plan" },
    { href: "/dashboard/notifications", label: "Notifications", section: "notifications" },
  ],
  ADMIN: [
    { href: "/admin", label: "Overview", section: "overview" },
    { href: "/admin/verifications", label: "Verifications", section: "verifications" },
    { href: "/admin/reviews", label: "Company reviews", section: "reviews" },
    { href: "/admin/jobs", label: "Job listings", section: "jobs" },
    { href: "/admin/users", label: "Accounts", section: "users" },
  ],
} satisfies Record<DashboardRole, { href: string; label: string; section: string }[]>;

export default function DashboardSidebar({
  role,
  section,
}: {
  role: DashboardRole;
  section: string;
}) {
  return (
    <aside className="dashboard-sidebar">
      <p className="dashboard-sidebar-title">{role === "JOB_SEEKER" ? "JOB SEEKER" : role === "EMPLOYER" ? "EMPLOYER" : "ADMIN"} MENU</p>
      <nav aria-label="Dashboard navigation">
        {navigation[role].map((item) => (
          <Link aria-current={section === item.section ? "page" : undefined} className="dashboard-sidebar-link" href={item.href} key={item.href}>
            <span aria-hidden="true" className="dashboard-sidebar-mark">{item.label.slice(0, 1)}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <Link className="dashboard-sidebar-back" href="/">← Back to Cakree</Link>
    </aside>
  );
}
