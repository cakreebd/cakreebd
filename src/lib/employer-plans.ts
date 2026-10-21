export const EMPLOYER_PLANS = {
  FREE: { name: "Free", price: 0, activeJobLimit: 1 },
  STARTER: { name: "Starter", price: 999, activeJobLimit: 5 },
  GROWTH: { name: "Growth", price: 2499, activeJobLimit: 20 },
} as const;

export type EmployerPlanKey = keyof typeof EMPLOYER_PLANS;

export function isEmployerPlan(value: string): value is EmployerPlanKey {
  return Object.hasOwn(EMPLOYER_PLANS, value);
}
