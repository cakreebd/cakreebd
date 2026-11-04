export const JOB_LOCATIONS = [
  { name: "Dhaka", slug: "dhaka", detail: "Opportunities across the capital" },
  { name: "Chattogram", slug: "chattogram", detail: "Roles near the port city" },
  { name: "Sylhet", slug: "sylhet", detail: "Explore work in the northeast" },
  { name: "Rajshahi", slug: "rajshahi", detail: "Find openings in the northwest" },
  { name: "Khulna", slug: "khulna", detail: "Discover local opportunities" },
  { name: "Remote", slug: "remote", detail: "Work from anywhere in Bangladesh" },
] as const;

export function jobLocationFromSlug(slug: string) {
  return JOB_LOCATIONS.find((location) => location.slug === slug);
}
