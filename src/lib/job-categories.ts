export const JOB_CATEGORIES = [
  { name: "Technology", icon: "tech", description: "Software, IT, data, and digital product roles." },
  { name: "Marketing", icon: "megaphone", description: "Brand, communications, growth, and marketing roles." },
  { name: "Sales", icon: "chart", description: "Business development, sales, and partnership roles." },
  { name: "Design", icon: "palette", description: "Creative, visual, product, and experience design roles." },
  { name: "Finance", icon: "wallet", description: "Accounting, banking, finance, and analyst roles." },
  { name: "Customer service", icon: "headset", description: "Customer care, support, and service roles." },
  { name: "Operations", icon: "briefcase", description: "Operations, administration, logistics, and coordination roles." },
  { name: "Education", icon: "book", description: "Teaching, training, and education support roles." },
  { name: "Healthcare", icon: "health", description: "Healthcare, wellness, and community health roles." },
  { name: "Other", icon: "briefcase", description: "Opportunities across additional professions and industries." },
] as const;

export function jobCategorySlug(category: string) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function jobCategoryFromSlug(slug: string) {
  return JOB_CATEGORIES.find((category) => jobCategorySlug(category.name) === slug);
}
