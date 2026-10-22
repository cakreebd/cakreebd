import { randomBytes, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_COMPANY_PREFIX } from "../src/lib/demo-content";

const prisma = new PrismaClient();
const confirmation = "YES_ADD_DEMO_CONTENT_TO_THIS_DATABASE";
const demoProfileBio = "Cakree demo profile. This fictional company and its sample role are for website preview only.";

const demoCompanies: {
  name: string;
  title: string;
  category: string;
  location: string;
  employmentType?: "Full-time" | "Part-time" | "Contract" | "Internship" | "Temporary";
  workMode: string;
  salaryMin: number;
  salaryMax: number;
  tags: string[];
  description: string;
  requirements: string;
}[] = [
  {
    name: "Shobuj Digital",
    title: "Frontend Developer",
    category: "Technology",
    location: "Dhaka",
    workMode: "Hybrid",
    salaryMin: 50000,
    salaryMax: 80000,
    tags: ["React", "TypeScript", "Demo listing"],
    description: "DEMO CONTENT: This fictional opening is for previewing Cakree only and is not a real vacancy. In this sample role, you would build accessible web experiences and collaborate with a product team.",
    requirements: "Sample requirements: experience with React, TypeScript, responsive layouts, and collaborative development.",
  },
  {
    name: "Padma Creative House",
    title: "Visual Designer",
    category: "Design",
    location: "Dhaka",
    workMode: "On-site",
    salaryMin: 35000,
    salaryMax: 55000,
    tags: ["Figma", "Brand design", "Demo listing"],
    description: "DEMO CONTENT: This fictional opening is for previewing Cakree only and is not a real vacancy. The sample role explores how a creative team might present brand and digital design work.",
    requirements: "Sample requirements: a design portfolio, familiarity with Figma, and an interest in clear visual communication.",
  },
  {
    name: "Jolchhobi Commerce",
    title: "Digital Marketing Executive",
    category: "Marketing",
    location: "Chattogram",
    workMode: "Hybrid",
    salaryMin: 30000,
    salaryMax: 48000,
    tags: ["Social media", "Campaigns", "Demo listing"],
    description: "DEMO CONTENT: This fictional opening is for previewing Cakree only and is not a real vacancy. This sample listing demonstrates a marketing role with campaign planning and content coordination.",
    requirements: "Sample requirements: interest in digital campaigns, social media content, and basic performance reporting.",
  },
  {
    name: "Shapla Analytics",
    title: "Junior Data Analyst",
    category: "Finance",
    location: "Dhaka",
    workMode: "On-site",
    salaryMin: 32000,
    salaryMax: 50000,
    tags: ["Excel", "SQL", "Demo listing"],
    description: "DEMO CONTENT: This fictional opening is for previewing Cakree only and is not a real vacancy. Explore a sample analyst role focused on organizing data and sharing useful business insights.",
    requirements: "Sample requirements: comfort with spreadsheets, attention to detail, and willingness to learn SQL and reporting tools.",
  },
  {
    name: "Bonolota Support",
    title: "Customer Care Associate",
    category: "Customer service",
    location: "Sylhet",
    workMode: "On-site",
    salaryMin: 24000,
    salaryMax: 34000,
    tags: ["Communication", "Customer support", "Demo listing"],
    description: "DEMO CONTENT: This fictional opening is for previewing Cakree only and is not a real vacancy. This sample role shows how a customer support opportunity can appear in search.",
    requirements: "Sample requirements: clear communication, patience, and a helpful approach to solving customer questions.",
  },
  {
    name: "Meghna Logistics Lab",
    title: "Operations Coordinator",
    category: "Operations",
    location: "Rajshahi",
    workMode: "Hybrid",
    salaryMin: 28000,
    salaryMax: 42000,
    tags: ["Coordination", "Planning", "Demo listing"],
    description: "DEMO CONTENT: This fictional opening is for previewing Cakree only and is not a real vacancy. The sample position demonstrates an operations role coordinating schedules, teams, and day-to-day tasks.",
    requirements: "Sample requirements: organization, clear communication, and confidence coordinating tasks across a team.",
  },
  {
    name: "Neel River Learning",
    title: "Learning Program Assistant",
    category: "Education",
    location: "Khulna",
    workMode: "On-site",
    salaryMin: 26000,
    salaryMax: 38000,
    tags: ["Education", "Program support", "Demo listing"],
    description: "DEMO CONTENT: This fictional opening is for previewing Cakree only and is not a real vacancy. This sample listing illustrates a role supporting learning programs and participant communication.",
    requirements: "Sample requirements: interest in education, strong organization, and clear written and spoken communication.",
  },
  {
    name: "Bhorosa Health Studio",
    title: "Community Outreach Associate",
    category: "Healthcare",
    location: "Remote",
    workMode: "Remote",
    salaryMin: 30000,
    salaryMax: 45000,
    tags: ["Community", "Outreach", "Demo listing"],
    description: "DEMO CONTENT: This fictional opening is for previewing Cakree only and is not a real vacancy. This sample remote role demonstrates community engagement and outreach work.",
    requirements: "Sample requirements: thoughtful communication, comfort with online collaboration, and an interest in community programs.",
  },
  {
    name: "Taal Data Works",
    title: "Quality Assurance Intern",
    category: "Technology",
    location: "Dhaka",
    employmentType: "Internship",
    workMode: "On-site",
    salaryMin: 18000,
    salaryMax: 25000,
    tags: ["Quality assurance", "Testing", "Demo listing"],
    description: "DEMO CONTENT: This fictional opening is for previewing Cakree only and is not a real vacancy. This sample internship demonstrates an entry-level opportunity in software quality assurance.",
    requirements: "Sample requirements: curiosity about software testing, careful attention to detail, and clear communication.",
  },
  {
    name: "Nodi Customer Care",
    title: "Customer Support Representative",
    category: "Customer service",
    location: "Remote",
    employmentType: "Part-time",
    workMode: "Remote",
    salaryMin: 18000,
    salaryMax: 26000,
    tags: ["Customer support", "Communication", "Demo listing"],
    description: "DEMO CONTENT: This fictional opening is for previewing Cakree only and is not a real vacancy. The sample part-time role demonstrates flexible customer support work.",
    requirements: "Sample requirements: patience, clear written communication, and confidence helping customers online.",
  },
  {
    name: "Alo Finance Collective",
    title: "Accounts Assistant",
    category: "Finance",
    location: "Rajshahi",
    employmentType: "Contract",
    workMode: "Hybrid",
    salaryMin: 28000,
    salaryMax: 40000,
    tags: ["Accounting", "Excel", "Demo listing"],
    description: "DEMO CONTENT: This fictional opening is for previewing Cakree only and is not a real vacancy. This sample contract role illustrates a junior accounting opportunity.",
    requirements: "Sample requirements: basic spreadsheet skills, accuracy with figures, and an interest in accounting operations.",
  },
  {
    name: "Bondhu Brand Studio",
    title: "Sales and Partnerships Associate",
    category: "Sales",
    location: "Chattogram",
    employmentType: "Full-time",
    workMode: "On-site",
    salaryMin: 30000,
    salaryMax: 45000,
    tags: ["Sales", "Partnerships", "Demo listing"],
    description: "DEMO CONTENT: This fictional opening is for previewing Cakree only and is not a real vacancy. Explore a sample sales role focused on building client relationships and partnerships.",
    requirements: "Sample requirements: confidence communicating with clients, organization, and a collaborative approach to sales.",
  },
];

async function main() {
  if (process.env.CAKREE_DEMO_SEED_CONFIRMATION !== confirmation) {
    throw new Error(`Refusing to seed demo content. Set CAKREE_DEMO_SEED_CONFIRMATION=${confirmation} to confirm the target database.`);
  }

  let createdJobs = 0;
  let updatedJobs = 0;
  for (const demo of demoCompanies) {
    const companyName = `${DEMO_COMPANY_PREFIX}${demo.name}`;
    let employer = await prisma.user.findFirst({
      where: { role: "EMPLOYER", companyName, companyBio: demoProfileBio },
      select: { id: true },
    });

    if (!employer) {
      const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
      employer = await prisma.user.create({
        data: {
          name: `${demo.name} Demo Employer`,
          email: `demo-${randomUUID()}@example.invalid`,
          passwordHash,
          role: "EMPLOYER",
          companyName,
          companyBio: demoProfileBio,
          emailNotifications: false,
        },
        select: { id: true },
      });
    }

    const jobData = {
      title: demo.title,
      companyName,
      category: demo.category,
      location: demo.location,
      employmentType: demo.employmentType ?? "Full-time",
      workMode: demo.workMode,
      salaryMin: demo.salaryMin,
      salaryMax: demo.salaryMax,
      description: demo.description,
      requirements: demo.requirements,
      tags: JSON.stringify(demo.tags),
      status: "ACTIVE",
    };
    const existingJob = await prisma.job.findFirst({
      where: { employerId: employer.id, title: demo.title },
      select: { id: true },
    });
    if (existingJob) {
      await prisma.job.update({ where: { id: existingJob.id }, data: jobData });
      updatedJobs += 1;
    } else {
      await prisma.job.create({ data: { ...jobData, employerId: employer.id } });
      createdJobs += 1;
    }
  }

  console.log(`Demo content is ready: ${createdJobs} jobs added, ${updatedJobs} demo jobs refreshed. Applications to demo listings are disabled.`);
}

main()
  .catch((error: unknown) => {
    console.error("Demo content seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
