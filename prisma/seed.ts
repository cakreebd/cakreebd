import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const demoJobs = [
  {
    title: "Senior Product Designer",
    companyName: "Pathao",
    category: "Design",
    location: "Dhaka",
    employmentType: "Full-time",
    workMode: "Hybrid",
    salaryMin: 80000,
    salaryMax: 120000,
    description:
      "Help shape simple, thoughtful experiences used by millions across Bangladesh. Work closely with product, research, and engineering teams from discovery through delivery.",
    requirements: "5+ years of product design experience. Strong Figma skills and a thoughtful, user-centered approach.",
    tags: ["Product design", "Figma", "5+ years"],
  },
  {
    title: "Frontend Engineer",
    companyName: "bKash",
    category: "Technology",
    location: "Dhaka",
    employmentType: "Full-time",
    workMode: "On-site",
    salaryMin: 90000,
    salaryMax: 150000,
    description:
      "Build reliable, accessible web experiences for one of Bangladesh's most-loved financial services. Partner with product and backend engineers to ship features at scale.",
    requirements: "3+ years of frontend experience. React and TypeScript experience preferred.",
    tags: ["React", "TypeScript", "3+ years"],
  },
  {
    title: "Digital Marketing Executive",
    companyName: "Daraz",
    category: "Marketing",
    location: "Dhaka",
    employmentType: "Full-time",
    workMode: "On-site",
    salaryMin: 45000,
    salaryMax: 65000,
    description:
      "Plan and deliver campaigns that connect shoppers with the brands they love. Bring your ideas, analytical mindset, and passion for digital storytelling.",
    requirements: "2+ years of digital marketing experience. Familiarity with social media and campaign analytics.",
    tags: ["Campaigns", "Social media", "2+ years"],
  },
  {
    title: "Relationship Manager",
    companyName: "BRAC Bank",
    category: "Finance",
    location: "Chattogram",
    employmentType: "Full-time",
    workMode: "On-site",
    salaryMin: 55000,
    salaryMax: 75000,
    description:
      "Build lasting relationships with SME clients and help local businesses access the financial services they need to grow.",
    requirements: "3+ years of banking or client relationship experience. SME banking experience is a plus.",
    tags: ["SME banking", "Client relations", "3+ years"],
  },
  {
    title: "Customer Experience Associate",
    companyName: "ShopUp",
    category: "Customer service",
    location: "Dhaka",
    employmentType: "Full-time",
    workMode: "Hybrid",
    salaryMin: 30000,
    salaryMax: 42000,
    description:
      "Be the friendly, helpful voice our small business customers count on. Solve problems, share feedback with the team, and make every interaction count.",
    requirements: "Strong communication and problem-solving skills. Entry-level candidates are welcome.",
    tags: ["Communication", "Problem solving", "Entry-level"],
  },
  {
    title: "Sales Associate",
    companyName: "Unilever Bangladesh",
    category: "Sales",
    location: "Sylhet",
    employmentType: "Full-time",
    workMode: "On-site",
    salaryMin: 40000,
    salaryMax: 60000,
    description:
      "Work with retail partners to bring trusted household brands to more communities. This role is a great fit for an energetic, people-first communicator.",
    requirements: "1–3 years of sales experience. Comfortable building relationships with retail partners.",
    tags: ["Retail", "Field sales", "1–3 years"],
  },
  {
    title: "Software Engineer",
    companyName: "Chaldal",
    category: "Technology",
    location: "Remote",
    employmentType: "Full-time",
    workMode: "Remote",
    salaryMin: 85000,
    salaryMax: 130000,
    description:
      "Build and improve the services behind a fast, dependable grocery delivery experience. We value clear thinking, pragmatic engineering, and a collaborative mindset.",
    requirements: "3+ years of backend engineering experience. Node.js and PostgreSQL experience preferred.",
    tags: ["Node.js", "PostgreSQL", "3+ years"],
  },
  {
    title: "Junior Graphic Designer",
    companyName: "Asiatic 3Sixty",
    category: "Design",
    location: "Dhaka",
    employmentType: "Full-time",
    workMode: "On-site",
    salaryMin: 28000,
    salaryMax: 38000,
    description:
      "Bring campaign ideas to life through bold, thoughtful visuals. Collaborate with creative teams across digital, social, and brand projects.",
    requirements: "A strong portfolio and familiarity with Adobe Creative Suite. Fresh graduates are welcome.",
    tags: ["Adobe Creative Suite", "Branding", "Fresh graduates welcome"],
  },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The demo seed is disabled in production.");
  }
  const seedEmail = "demo-employer@cakree.local";
  const passwordHash = await bcrypt.hash("CakreeDemo2026!", 12);
  const employer = await prisma.user.upsert({
    where: { email: seedEmail },
    update: {},
    create: {
      name: "Cakree Demo Employer",
      email: seedEmail,
      passwordHash,
      role: "EMPLOYER",
      companyName: "Cakree Featured Companies",
      companyBio: "Sample employers for the local Cakree demo.",
    },
  });
  await prisma.employerPlan.upsert({
    where: { userId: employer.id },
    create: { userId: employer.id, plan: "GROWTH", expiresAt: new Date("2099-12-31T23:59:59.000Z") },
    update: { plan: "GROWTH", expiresAt: new Date("2099-12-31T23:59:59.000Z") },
  });

  for (const job of demoJobs) {
    const exists = await prisma.job.findFirst({
      where: {
        employerId: employer.id,
        title: job.title,
        companyName: job.companyName,
      },
      select: { id: true },
    });
    if (!exists) {
      await prisma.job.create({
        data: {
          ...job,
          tags: JSON.stringify(job.tags),
          employerId: employer.id,
        },
      });
    }
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error("Database seeding failed:", error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
