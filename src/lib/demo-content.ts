export const DEMO_COMPANY_PREFIX = "Cakree Demo · ";

export function isDemoCompany(companyName: string) {
  return companyName.startsWith(DEMO_COMPANY_PREFIX);
}
