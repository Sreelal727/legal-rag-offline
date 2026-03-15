// Common limitation periods under the Limitation Act, 1963
// Reference: Schedule to the Limitation Act, First Division (Suits)

export interface LimitationPeriod {
  id: string;
  article: string;
  description: string;
  period: number; // in days
  category: string;
  accrualEvent: string;
  act: string;
}

export const LIMITATION_PERIODS: LimitationPeriod[] = [
  // Part I - Suits relating to Accounts
  {
    id: "art-1",
    article: "Article 1",
    description: "Suit for balance due on a mutual, open and current account",
    period: 1095, // 3 years
    category: "ACCOUNTS",
    accrualEvent: "Close of the year in which the last item admitted or proved is entered",
    act: "Limitation Act, 1963",
  },
  // Part II - Suits relating to Contracts
  {
    id: "art-18",
    article: "Article 18",
    description: "Suit for compensation for breach of any contract",
    period: 1095, // 3 years
    category: "CONTRACT",
    accrualEvent: "Date of breach",
    act: "Limitation Act, 1963",
  },
  {
    id: "art-19",
    article: "Article 19",
    description: "Suit for money payable for money lent",
    period: 1095, // 3 years
    category: "CONTRACT",
    accrualEvent: "Date when the loan is made",
    act: "Limitation Act, 1963",
  },
  {
    id: "art-20",
    article: "Article 20",
    description: "Suit for money deposited under contract",
    period: 1095, // 3 years
    category: "CONTRACT",
    accrualEvent: "When the deposit is payable",
    act: "Limitation Act, 1963",
  },
  {
    id: "art-22",
    article: "Article 22",
    description: "Suit for money payable on account stated",
    period: 1095, // 3 years
    category: "CONTRACT",
    accrualEvent: "Date of stating the account",
    act: "Limitation Act, 1963",
  },
  {
    id: "art-24",
    article: "Article 24",
    description: "Suit to enforce a right of pre-emption",
    period: 365, // 1 year
    category: "PROPERTY",
    accrualEvent: "Date of sale or knowledge of sale",
    act: "Limitation Act, 1963",
  },
  // Part III - Suits relating to Declarations
  {
    id: "art-26",
    article: "Article 26",
    description: "Suit for possession of immovable property based on title",
    period: 4380, // 12 years
    category: "PROPERTY",
    accrualEvent: "Date of dispossession",
    act: "Limitation Act, 1963",
  },
  {
    id: "art-27",
    article: "Article 27",
    description: "Suit for possession by government",
    period: 10950, // 30 years
    category: "PROPERTY",
    accrualEvent: "Date of dispossession",
    act: "Limitation Act, 1963",
  },
  // Part V - Suits relating to Torts
  {
    id: "art-36",
    article: "Article 36",
    description: "Suit for compensation for any other tort (general)",
    period: 365, // 1 year
    category: "TORT",
    accrualEvent: "Date of the act/omission",
    act: "Limitation Act, 1963",
  },
  // Part VII - Suits relating to Movable Property
  {
    id: "art-44",
    article: "Article 44",
    description: "Suit for specific movable property or compensation",
    period: 1095, // 3 years
    category: "PROPERTY",
    accrualEvent: "Date of withholding or conversion",
    act: "Limitation Act, 1963",
  },
  // Appeals
  {
    id: "art-116",
    article: "Article 116",
    description: "Appeal to High Court from decree of subordinate court",
    period: 90, // 90 days
    category: "APPEAL",
    accrualEvent: "Date of decree",
    act: "Limitation Act, 1963",
  },
  {
    id: "art-117",
    article: "Article 117",
    description: "Appeal to Supreme Court",
    period: 90, // 90 days
    category: "APPEAL",
    accrualEvent: "Date of decree/order",
    act: "Limitation Act, 1963",
  },
  // Applications
  {
    id: "art-137",
    article: "Article 137",
    description: "Any other application to a civil court (residuary)",
    period: 1095, // 3 years
    category: "APPLICATION",
    accrualEvent: "When the right to apply accrues",
    act: "Limitation Act, 1963",
  },
  // Special Laws
  {
    id: "s138-ni",
    article: "Section 142(b)",
    description: "Complaint under Section 138 NI Act (cheque bounce)",
    period: 30, // 30 days (after expiry of 15 days notice period)
    category: "CRIMINAL",
    accrualEvent: "After 15 days of notice expiry without payment",
    act: "Negotiable Instruments Act, 1881",
  },
  {
    id: "s80-cpc",
    article: "Section 80 CPC",
    description: "Notice period before suit against government",
    period: 60, // 2 months
    category: "CPC",
    accrualEvent: "Date of serving notice",
    act: "Code of Civil Procedure, 1908",
  },
  {
    id: "motor-accident",
    article: "Section 166",
    description: "Motor accident claim petition",
    period: 180, // 6 months
    category: "TORT",
    accrualEvent: "Date of accident",
    act: "Motor Vehicles Act, 1988",
  },
  {
    id: "consumer-complaint",
    article: "Section 69",
    description: "Consumer complaint",
    period: 730, // 2 years
    category: "CONSUMER",
    accrualEvent: "Date of cause of action",
    act: "Consumer Protection Act, 2019",
  },
  {
    id: "labour-dispute",
    article: "Section 10(1)",
    description: "Industrial dispute reference",
    period: 1095, // 3 years
    category: "LABOUR",
    accrualEvent: "Date of dismissal/retrenchment",
    act: "Industrial Disputes Act, 1947",
  },
  {
    id: "divorce-cruelty",
    article: "Section 13(1)(ia)",
    description: "Divorce petition on grounds of cruelty",
    period: 0, // No specific limitation, but must file within reasonable time
    category: "FAMILY",
    accrualEvent: "Last act of cruelty (no strict limitation)",
    act: "Hindu Marriage Act, 1955",
  },
  {
    id: "art-58",
    article: "Article 58",
    description: "Suit for declaration and consequential relief",
    period: 1095, // 3 years
    category: "DECLARATION",
    accrualEvent: "When the right to sue first accrues",
    act: "Limitation Act, 1963",
  },
  {
    id: "art-59",
    article: "Article 59",
    description: "Suit for possession of immovable property on title",
    period: 4380, // 12 years
    category: "PROPERTY",
    accrualEvent: "Date when possession becomes adverse",
    act: "Limitation Act, 1963",
  },
  {
    id: "art-62",
    article: "Article 62",
    description: "Suit to enforce a mortgage or charge on immovable property",
    period: 4380, // 12 years
    category: "PROPERTY",
    accrualEvent: "When the money secured becomes due",
    act: "Limitation Act, 1963",
  },
  {
    id: "art-65",
    article: "Article 65",
    description: "Suit for possession based on adverse possession",
    period: 4380, // 12 years
    category: "PROPERTY",
    accrualEvent: "When adverse possession begins",
    act: "Limitation Act, 1963",
  },
];

export const LIMITATION_CATEGORIES = [
  "ACCOUNTS",
  "CONTRACT",
  "PROPERTY",
  "TORT",
  "APPEAL",
  "APPLICATION",
  "CRIMINAL",
  "CPC",
  "CONSUMER",
  "LABOUR",
  "FAMILY",
  "DECLARATION",
  "GENERAL",
];

export function calculateDeadline(accrualDate: Date, limitationDays: number, extensionDays: number = 0): Date {
  const deadline = new Date(accrualDate);
  deadline.setDate(deadline.getDate() + limitationDays + extensionDays);
  return deadline;
}

export function getDaysRemaining(deadlineDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineDate);
  deadline.setHours(0, 0, 0, 0);
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getUrgencyLevel(daysRemaining: number): "expired" | "critical" | "warning" | "safe" {
  if (daysRemaining < 0) return "expired";
  if (daysRemaining <= 7) return "critical";
  if (daysRemaining <= 30) return "warning";
  return "safe";
}
