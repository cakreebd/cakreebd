"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import VerifiedBadge from "@/components/verified-badge";

export type Job = {
  id: number;
  title: string;
  company: string;
  companyVerified?: boolean;
  location: string;
  salary: string;
  employment: string;
  workMode: string;
  category: string;
  posted: string;
  logo: string;
  logoTone: string;
  featured?: boolean;
  description: string;
  requirements: string;
  tags: string[];
};

const categories = [
  { name: "Technology", count: "240+", icon: "tech" },
  { name: "Marketing", count: "120+", icon: "megaphone" },
  { name: "Sales", count: "185+", icon: "chart" },
  { name: "Design", count: "96+", icon: "palette" },
  { name: "Finance", count: "110+", icon: "wallet" },
  { name: "Customer service", count: "84+", icon: "headset" },
];

const locations = ["All locations", "Dhaka", "Chattogram", "Sylhet", "Remote"];

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "search":
      return (
        <svg {...common}>
          <circle cx="10.8" cy="10.8" r="6.3" />
          <path d="m15.5 15.5 4.2 4.2" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common}>
          <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
          <circle cx="12" cy="10" r="2.2" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18m-11 0v2h4v-2" />
        </svg>
      );
    case "bookmark":
      return (
        <svg {...common}>
          <path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-4-6 4V4.8Z" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14m-6-6 6 6-6 6" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />
          <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
        </svg>
      );
    case "tech":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="12" rx="2" />
          <path d="M8 20h8m-4-4v4m-2-9 2-2 2 2" />
        </svg>
      );
    case "megaphone":
      return (
        <svg {...common}>
          <path d="m4 11 15-6v14L4 13v-2Z" />
          <path d="m8 14 2 6h4l-2.5-5.2M19 10h2v4h-2" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 19V5m0 14h16M8 15l4-4 3 2 5-6" />
          <path d="M16 7h4v4" />
        </svg>
      );
    case "palette":
      return (
        <svg {...common}>
          <path d="M12 3a9 9 0 1 0 0 18h1.2a2 2 0 0 0 1.6-3.2 1.7 1.7 0 0 1 1.4-2.8H18a3 3 0 0 0 3-3c0-5-4-9-9-9Z" />
          <circle cx="7.5" cy="11" r=".8" />
          <circle cx="10" cy="7.5" r=".8" />
          <circle cx="15" cy="8" r=".8" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="15" rx="2" />
          <path d="M3 9h18m-5 5h2m-13-9V4a1 1 0 0 1 1-1h12" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M4 14v-3a8 8 0 0 1 16 0v3" />
          <path d="M4 13H3a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2v-6Zm16 0h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2v-6Zm0 6a6 6 0 0 1-6 3h-2" />
        </svg>
      );
  }
}

export default function HomeClient({
  initialJobs,
  initiallySavedJobIds,
}: {
  initialJobs: Job[];
  initiallySavedJobIds: number[];
}) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("All locations");
  const [category, setCategory] = useState("All categories");
  const [filters, setFilters] = useState({
    keyword: "",
    location: "All locations",
    category: "All categories",
  });
  const [savedJobs, setSavedJobs] = useState<number[]>(initiallySavedJobIds);
  const [saveError, setSaveError] = useState("");

  const filteredJobs = useMemo(() => {
    const searchTerm = filters.keyword.trim().toLowerCase();
    return initialJobs.filter((job) => {
      const matchesKeyword =
        !searchTerm ||
        `${job.title} ${job.company} ${job.category} ${job.workMode} ${job.tags.join(" ")}`
          .toLowerCase()
          .includes(searchTerm);
      const matchesLocation =
        filters.location === "All locations" ||
        job.location === filters.location ||
        (filters.location === "Remote" && job.workMode === "Remote");
      const matchesCategory =
        filters.category === "All categories" ||
        job.category === filters.category;
      return matchesKeyword && matchesLocation && matchesCategory;
    });
  }, [filters, initialJobs]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    if (location !== "All locations") params.set("location", location);
    if (category !== "All categories") params.set("category", category);
    router.push(`/jobs${params.size ? `?${params.toString()}` : ""}`);
  }

  function selectCategory(selected: string) {
    const nextCategory = category === selected ? "All categories" : selected;
    setCategory(nextCategory);
    setFilters((current) => ({ ...current, category: nextCategory }));
  }

  async function toggleSavedJob(jobId: number) {
    setSaveError("");
    const isSaved = savedJobs.includes(jobId);
    try {
      const response = await fetch(`/api/jobs/${jobId}/save`, {
        method: isSaved ? "DELETE" : "POST",
      });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setSaveError(result.error ?? "We could not save this job. Please try again.");
        return;
      }
      setSavedJobs((current) => isSaved
        ? current.filter((savedJobId) => savedJobId !== jobId)
        : [...current, jobId]);
    } catch {
      setSaveError("Could not reach the server. Please try again.");
    }
  }

  function clearFilters() {
    setKeyword("");
    setLocation("All locations");
    setCategory("All categories");
    setFilters({
      keyword: "",
      location: "All locations",
      category: "All categories",
    });
  }

  return (
    <main>
      <section aria-labelledby="hero-title" className="hero">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-content">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> YOUR NEXT CHAPTER STARTS HERE</div>
            <h1 id="hero-title">Find work that<br />moves you <span>forward.</span></h1>
            <p className="hero-description">
              Discover meaningful opportunities from teams across Bangladesh. Your next big thing is closer than you think.
            </p>
            <div className="hero-proof">
              <div aria-hidden="true" className="avatar-stack">
                <span className="proof-avatar proof-avatar-one">R</span>
                <span className="proof-avatar proof-avatar-two">S</span>
                <span className="proof-avatar proof-avatar-three">N</span>
                <span className="proof-avatar proof-avatar-four">+</span>
              </div>
              <span><strong>12,000+</strong> people found their fit this month</span>
            </div>
          </div>

          <form className="search-panel" onSubmit={handleSearch}>
            <label className="search-field search-keyword">
              <Icon name="search" />
              <span className="sr-only">Job title, keyword, or company</span>
              <input
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Job title, keyword, or company"
                type="search"
                value={keyword}
              />
            </label>
            <label className="search-field">
              <Icon name="pin" />
              <span className="sr-only">Select a location</span>
              <select onChange={(event) => setLocation(event.target.value)} value={location}>
                {locations.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="search-field search-category">
              <Icon name="briefcase" />
              <span className="sr-only">Select a category</span>
              <select onChange={(event) => setCategory(event.target.value)} value={category}>
                <option>All categories</option>
                {categories.map((item) => <option key={item.name}>{item.name}</option>)}
              </select>
            </label>
            <button aria-label="Search jobs" className="button button-primary search-button" type="submit">
              <Icon className="h-[19px] w-[19px]" name="search" />
              <span>Search jobs</span>
            </button>
          </form>
          <div className="popular-searches">
            <span>Popular:</span>
            <button onClick={() => { setKeyword("Software"); setFilters((current) => ({ ...current, keyword: "Software" })); }} type="button">Software Engineer</button>
            <button onClick={() => { setKeyword("Marketing"); setFilters((current) => ({ ...current, keyword: "Marketing" })); }} type="button">Marketing</button>
            <button onClick={() => { setKeyword("Remote"); setFilters((current) => ({ ...current, keyword: "Remote" })); }} type="button">Remote</button>
          </div>
        </div>
        <div aria-hidden="true" className="hero-illustration">
          <div className="illustration-sun" />
          <div className="illustration-card illustration-card-back"><span /><span /><span /></div>
          <div className="illustration-card illustration-card-front">
            <div className="illustration-card-top"><span className="illustration-logo">C</span><span className="illustration-save">♡</span></div>
            <div className="illustration-line illustration-line-long" />
            <div className="illustration-line illustration-line-short" />
            <div className="illustration-pill">Your next move</div>
          </div>
          <div className="illustration-star">✳</div>
          <div className="illustration-plant"><span /><span /><span /></div>
        </div>
      </section>

      <section aria-label="Trusted employers" className="trust-strip" id="companies">
        <p>Good people, great places to work</p>
        <div className="company-logos" aria-label="Pathao, bKash, Daraz, BRAC Bank, and ShopUp">
          <span className="trusted-pathao">pathao</span>
          <span className="trusted-bkash">bKash</span>
          <span className="trusted-daraz">daraz</span>
          <span className="trusted-brac">BRAC BANK</span>
          <span className="trusted-shopup">shop<span>up</span></span>
        </div>
      </section>

      <section aria-labelledby="category-title" className="section categories-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">A GOOD PLACE TO START</p>
            <h2 id="category-title">Explore by category</h2>
          </div>
          <p className="section-description">Find a role that fits your skills and the way you want to grow.</p>
        </div>
        <div className="category-grid">
          {categories.map((item, index) => (
            <button
              aria-pressed={category === item.name}
              className={`category-card${category === item.name ? " category-card-selected" : ""}`}
              key={item.name}
              onClick={() => { selectCategory(item.name); document.getElementById("jobs")?.scrollIntoView({ behavior: "smooth" }); }}
              type="button"
            >
              <span className={`category-icon category-icon-${index}`}><Icon className="h-[22px] w-[22px]" name={item.icon} /></span>
              <span className="category-card-content"><strong>{item.name}</strong><small>{item.count} open roles</small></span>
              <Icon className="category-arrow h-[17px] w-[17px]" name="arrow" />
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="jobs-title" className="section jobs-section" id="jobs">
        <div className="section-heading jobs-heading">
          <div>
            <p className="section-kicker">HANDPICKED FOR YOU</p>
            <h2 id="jobs-title">A few good opportunities</h2>
            <p className="jobs-subtitle">{filteredJobs.length} roles to explore from teams doing great work.</p>
          </div>
          <Link className="text-link" href="/jobs">Browse all jobs <Icon className="h-4 w-4" name="arrow" /></Link>
        </div>
        <p className="demo-notice">Sample listings are included to preview Cakree. Employers can publish real openings from their dashboard.</p>
        {saveError && <p className="form-error" role="alert">{saveError}</p>}
        {filteredJobs.length > 0 ? (
          <div className="job-grid">
            {filteredJobs.map((job) => (
              <article className="job-card" key={job.id}>
                <div className="job-card-top">
                  <span className={`company-logo company-logo-${job.logoTone}`}>{job.logo}</span>
                  <button
                    aria-label={savedJobs.includes(job.id) ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
                    aria-pressed={savedJobs.includes(job.id)}
                    className={`save-button${savedJobs.includes(job.id) ? " save-button-active" : ""}`}
                    onClick={() => toggleSavedJob(job.id)}
                    type="button"
                  >
                    <Icon name="bookmark" />
                  </button>
                </div>
                <div className="job-company">{job.company}{job.companyVerified && <VerifiedBadge />}<span className="job-posted">{job.posted}</span></div>
                <h3>{job.title}</h3>
                <div className="job-meta">
                  <span><Icon name="pin" />{job.location}</span>
                  <span><Icon name="briefcase" />{job.employment}</span>
                </div>
                <div className="job-card-bottom">
                  <div className="salary">{job.salary}<small> / month</small></div>
                  <Link className="view-job" href={`/jobs/${job.id}`}>View job <Icon className="h-4 w-4" name="arrow" /></Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-state-icon"><Icon name="search" /></span>
            <h3>No jobs match those filters just yet</h3>
            <p>Try a different keyword or browse all the opportunities we have today.</p>
            <button className="button button-dark" onClick={clearFilters} type="button">Clear filters</button>
          </div>
        )}
        {filteredJobs.length > 0 && (
          <div className="jobs-more">
            <Link className="button button-outline" href="/jobs">Explore all opportunities <Icon className="h-4 w-4" name="arrow" /></Link>
          </div>
        )}
      </section>

      <section aria-label="Career resources" className="career-banner" id="career-resources">
        <div className="career-banner-icon"><Icon className="h-6 w-6" name="spark" /></div>
        <div className="career-banner-copy">
          <p className="section-kicker">A LITTLE HELP GOES A LONG WAY</p>
          <h2>Make your next move a great one.</h2>
          <p>Practical tips for your CV, interviews, and everything in between.</p>
        </div>
        <a className="button button-dark" href="#jobseekers">Explore career tips <Icon className="h-4 w-4" name="arrow" /></a>
        <div aria-hidden="true" className="career-banner-decoration">✳</div>
      </section>

      <section aria-label="Get started" className="cta-section">
        <div className="cta-card cta-jobseeker" id="jobseekers">
          <span className="cta-label">FOR JOB SEEKERS</span>
          <h2>Your next opportunity<br />is out there.</h2>
          <p>Make a profile and let the right employers find you.</p>
          <Link className="button button-light" href="/register">Create your profile <Icon className="h-4 w-4" name="arrow" /></Link>
          <div aria-hidden="true" className="cta-decoration cta-decoration-one" />
        </div>
        <div className="cta-card cta-employer" id="employers">
          <span className="cta-label">FOR EMPLOYERS</span>
          <h2>Meet the people<br />who move you forward.</h2>
          <p>Reach thoughtful, talented candidates across Bangladesh.</p>
          <Link className="button button-white" href="/register?role=employer">Post a job <Icon className="h-4 w-4" name="arrow" /></Link>
          <div aria-hidden="true" className="cta-decoration cta-decoration-two" />
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-top">
          <div>
            <a aria-label="Cakree home" className="brand footer-brand" href="#">
              <span className="brand-mark"><Icon className="h-[21px] w-[21px]" name="briefcase" /></span>
              <span>Cakree<span className="brand-period">.</span></span>
            </a>
            <p>Good work changes everything.<br />Let&apos;s find yours.</p>
          </div>
          <div className="footer-links">
            <div><strong>For job seekers</strong><a href="#jobs">Find a job</a><a href="#jobseekers">Create a profile</a><a href="#career-resources">Career tips</a></div>
            <div><strong>For employers</strong><a href="#employers">Post a job</a><a href="#companies">Browse companies</a></div>
            <div><strong>Say hello</strong><a href="mailto:hello@cakree.com">Contact us</a><a href="mailto:hello@cakree.com?subject=Support">Help &amp; support</a></div>
          </div>
        </div>
        <div className="footer-bottom"><span>© 2025 Cakree. Made with care in Bangladesh.</span><span>Dhaka · Bangladesh</span></div>
      </footer>

    </main>
  );
}
