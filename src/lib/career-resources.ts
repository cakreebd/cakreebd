export const CAREER_RESOURCES = [
  {
    slug: "cv-and-resume",
    title: "Build a stronger CV and resume",
    summary: "Present your experience clearly and tailor your CV to each opportunity.",
    sections: [
      { title: "Start with a clear profile", body: "Use a concise headline and short introduction that explain your experience, strengths, and the roles you are seeking." },
      { title: "Show evidence of your work", body: "Describe achievements with specific outcomes where possible. Include relevant projects, responsibilities, tools, and skills instead of relying on broad claims." },
      { title: "Keep it focused and easy to scan", body: "Use clear headings, consistent dates, and concise bullet points. Put the experience most relevant to the role near the top and proofread before sharing." },
      { title: "Keep your Cakree profile current", body: "Update your profile details and use the resume builder to prepare a printable resume from your information." },
    ],
    links: [{ href: "/resume", label: "Open the resume builder" }, { href: "/dashboard/profile", label: "Update your profile" }],
  },
  {
    slug: "job-applications",
    title: "Make each job application count",
    summary: "A focused application helps an employer understand why your experience fits the role.",
    sections: [
      { title: "Read the full listing", body: "Check the responsibilities, required skills, work arrangement, location, and salary details before applying." },
      { title: "Match your experience to the role", body: "Bring forward the most relevant skills and examples from your CV. Keep your application accurate and specific to the opportunity." },
      { title: "Follow the application process", body: "Submit the requested information and use a clear, professional message. Never include information you are not comfortable sharing." },
      { title: "Track your progress", body: "Use your Cakree dashboard to check application status, interviews, and any employer updates." },
    ],
    links: [{ href: "/jobs", label: "Find jobs" }, { href: "/dashboard/applications", label: "Track applications" }],
  },
  {
    slug: "interview-preparation",
    title: "Prepare for an interview",
    summary: "Go into an interview ready to explain your experience and learn about the role.",
    sections: [
      { title: "Review the role and employer", body: "Revisit the job description and note the responsibilities, skills, and questions you want to discuss." },
      { title: "Prepare clear examples", body: "Think through examples of your work, decisions, challenges, and results. Be ready to explain your contribution in your own words." },
      { title: "Plan the practical details", body: "Confirm the time, location or meeting link, and any materials requested. If you need an accommodation or clarification, contact the employer in advance." },
      { title: "Ask thoughtful questions", body: "Ask about the team, expectations, work arrangement, and next steps so you can decide whether the opportunity is right for you." },
    ],
    links: [{ href: "/dashboard/interviews", label: "View interview updates" }, { href: "/jobs", label: "Explore opportunities" }],
  },
  {
    slug: "salary-guidance",
    title: "Discuss salary with confidence",
    summary: "Use the information in a job listing to prepare a clear, respectful salary conversation.",
    sections: [
      { title: "Understand the listed range", body: "Check whether the amount is monthly and whether the employer lists a range or marks the salary as negotiable. Confirm details directly with the employer if they are unclear." },
      { title: "Consider the full package", body: "Ask about benefits, bonuses, working hours, location, and other terms that affect the overall offer." },
      { title: "Prepare your expectations", body: "Think about your experience, the role’s responsibilities, and the amount you are seeking. Be ready to explain your expectations professionally." },
      { title: "Confirm the final terms", body: "Before accepting, make sure the salary, payment schedule, benefits, and employment terms are clearly documented by the employer." },
    ],
    links: [{ href: "/jobs", label: "Browse salary-listed jobs" }, { href: "/dashboard/applications", label: "Review your applications" }],
  },
] as const;
