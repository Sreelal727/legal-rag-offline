/**
 * Loan types used in banking cases (EP, SARFAESI, NI Act 138, money recovery suits).
 * Abbreviations match conventions from legacy FoxPro system + common Indian banking practice.
 */

export type LoanTypeCode =
  | "ATL"
  | "OD"
  | "CC"
  | "TL"
  | "HL"
  | "VL"
  | "PL"
  | "GL"
  | "EL"
  | "MSME"
  | "AGRI"
  | "KCC"
  | "SARFAESI"
  | "CREDIT_CARD"
  | "OTHER";

export interface LoanTypeInfo {
  code: LoanTypeCode;
  label: string;
  fullForm: string;
  description: string;
  typicalRests: "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY" | "SIMPLE";
  commonSection?: string; // Typical legal section for recovery
}

export const LOAN_TYPES: LoanTypeInfo[] = [
  {
    code: "ATL",
    label: "ATL",
    fullForm: "Agricultural Term Loan",
    description: "Term loan for agricultural purposes (tractor, machinery, land development)",
    typicalRests: "HALF_YEARLY",
    commonSection: "Order 37 CPC / SARFAESI",
  },
  {
    code: "OD",
    label: "OD",
    fullForm: "Overdraft",
    description: "Running overdraft facility against security",
    typicalRests: "QUARTERLY",
    commonSection: "Order 37 CPC",
  },
  {
    code: "CC",
    label: "CC",
    fullForm: "Cash Credit",
    description: "Working capital cash credit facility for business",
    typicalRests: "QUARTERLY",
    commonSection: "Order 37 CPC / SARFAESI",
  },
  {
    code: "TL",
    label: "TL",
    fullForm: "Term Loan",
    description: "Fixed-tenure term loan with EMI repayment",
    typicalRests: "MONTHLY",
    commonSection: "SARFAESI / Order 37 CPC",
  },
  {
    code: "HL",
    label: "HL",
    fullForm: "Housing Loan",
    description: "Home loan secured by mortgage of residential property",
    typicalRests: "MONTHLY",
    commonSection: "SARFAESI",
  },
  {
    code: "VL",
    label: "VL",
    fullForm: "Vehicle Loan",
    description: "Loan for purchase of vehicle (car/bike/commercial)",
    typicalRests: "MONTHLY",
    commonSection: "Hypothecation / Arbitration",
  },
  {
    code: "PL",
    label: "PL",
    fullForm: "Personal Loan",
    description: "Unsecured personal loan",
    typicalRests: "MONTHLY",
    commonSection: "Summary Suit / NI Act 138",
  },
  {
    code: "GL",
    label: "GL",
    fullForm: "Gold Loan",
    description: "Loan against pledge of gold ornaments",
    typicalRests: "QUARTERLY",
    commonSection: "Pledge Sale / Suit",
  },
  {
    code: "EL",
    label: "EL",
    fullForm: "Education Loan",
    description: "Loan for higher education",
    typicalRests: "QUARTERLY",
    commonSection: "Suit for Recovery",
  },
  {
    code: "MSME",
    label: "MSME",
    fullForm: "MSME Loan",
    description: "Loan to Micro/Small/Medium Enterprise",
    typicalRests: "QUARTERLY",
    commonSection: "SARFAESI / Order 37 CPC",
  },
  {
    code: "AGRI",
    label: "AGRI",
    fullForm: "Agricultural Loan",
    description: "Crop loan / other agricultural finance",
    typicalRests: "HALF_YEARLY",
    commonSection: "Order 37 CPC",
  },
  {
    code: "KCC",
    label: "KCC",
    fullForm: "Kisan Credit Card",
    description: "Kisan Credit Card running account for farmers",
    typicalRests: "HALF_YEARLY",
    commonSection: "Order 37 CPC",
  },
  {
    code: "SARFAESI",
    label: "SARFAESI",
    fullForm: "SARFAESI Recovery",
    description: "Recovery under SARFAESI Act 2002",
    typicalRests: "QUARTERLY",
    commonSection: "SARFAESI Act 2002",
  },
  {
    code: "CREDIT_CARD",
    label: "CC Card",
    fullForm: "Credit Card Dues",
    description: "Recovery of credit card outstanding",
    typicalRests: "MONTHLY",
    commonSection: "NI Act 138 / Suit",
  },
  {
    code: "OTHER",
    label: "Other",
    fullForm: "Other Loan",
    description: "Any other type of loan / credit facility",
    typicalRests: "QUARTERLY",
    commonSection: "",
  },
];

export const LOAN_TYPE_MAP: Record<string, LoanTypeInfo> = LOAN_TYPES.reduce(
  (acc, lt) => {
    acc[lt.code] = lt;
    return acc;
  },
  {} as Record<string, LoanTypeInfo>
);

export type RestPeriod = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY" | "SIMPLE";

export const REST_PERIODS: { code: RestPeriod; label: string; compoundingsPerYear: number }[] = [
  { code: "MONTHLY", label: "Monthly Rests", compoundingsPerYear: 12 },
  { code: "QUARTERLY", label: "Quarterly Rests", compoundingsPerYear: 4 },
  { code: "HALF_YEARLY", label: "Half-Yearly Rests", compoundingsPerYear: 2 },
  { code: "YEARLY", label: "Yearly Rests", compoundingsPerYear: 1 },
  { code: "SIMPLE", label: "Simple Interest", compoundingsPerYear: 0 },
];

export function getCompoundingsPerYear(rests: string): number {
  return REST_PERIODS.find((r) => r.code === rests)?.compoundingsPerYear ?? 4;
}
