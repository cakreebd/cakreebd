export const EMPLOYER_PLANS = {
  FREE: { name: "Free", price: 0, activeJobLimit: 1, featuredListings: false },
  STARTER: { name: "Starter", price: 999, activeJobLimit: 5, featuredListings: false },
  GROWTH: { name: "Growth", price: 2499, activeJobLimit: 20, featuredListings: true },
} as const;

export type EmployerPlanKey = keyof typeof EMPLOYER_PLANS;

export function isEmployerPlan(value: string): value is EmployerPlanKey {
  return Object.hasOwn(EMPLOYER_PLANS, value);
}
