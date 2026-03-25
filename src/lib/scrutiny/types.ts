// Document types that can appear in a scrutiny bundle
export const DOCUMENT_TYPES = [
  "SALE_DEED",
  "GIFT_DEED",
  "PARTITION_DEED",
  "WILL",
  "SUCCESSION_CERTIFICATE",
  "LEGAL_HEIR_CERTIFICATE",
  "DEATH_CERTIFICATE",
  "EXCHANGE_DEED",
  "RELEASE_DEED",
  "SETTLEMENT_DEED",
  "MORTGAGE_DEED",
  "ENCUMBRANCE_CERTIFICATE",
  "TAX_RECEIPT",
  "SURVEY_SKETCH",
  "POSSESSION_CERTIFICATE",
  "PANCHAYAT_NOC",
  "BUILDING_PERMIT",
  "POWER_OF_ATTORNEY",
  "COURT_ORDER",
  "PATTAYAM",
  "ID_PROOF",
  "OTHER",
  "UNKNOWN",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

// Deed types for chain nodes
export const DEED_TYPES = [
  "SALE",
  "GIFT",
  "PARTITION",
  "WILL",
  "INHERITANCE",
  "COURT_DECREE",
  "EXCHANGE",
  "RELEASE",
  "SETTLEMENT",
  "MORTGAGE",
  "GOVERNMENT_GRANT",
  "OTHER",
] as const;

export type DeedType = (typeof DEED_TYPES)[number];

// Deed document types that participate in the chain
export const DEED_DOCUMENT_TYPES: DocumentType[] = [
  "SALE_DEED",
  "GIFT_DEED",
  "PARTITION_DEED",
  "WILL",
  "EXCHANGE_DEED",
  "RELEASE_DEED",
  "SETTLEMENT_DEED",
  "PATTAYAM",
];

export interface ClassificationResult {
  documentType: DocumentType;
  confidence: number;
  language: "en" | "ml" | "mixed";
  reasoning: string;
}

export interface DeedReference {
  docNo: string;
  year: number | null;
  sro: string | null;
}

export interface AreaInfo {
  value: number; // normalized to cents
  unit: string;
  original: string; // original text
}

export interface PropertyBoundaries {
  north: string;
  south: string;
  east: string;
  west: string;
}

export interface ExtractedDeedFields {
  documentNumber: string | null;
  registrationYear: number | null;
  sroName: string | null;
  executionDate: string | null;
  registrationDate: string | null;
  deedType: DeedType;
  grantor: string[];
  grantee: string[];
  surveyNumbers: string[];
  area: AreaInfo | null;
  consideration: number | null;
  stampDuty: number | null;
  referencedDeeds: DeedReference[];
  witnesses: string[];
  boundaries: PropertyBoundaries | null;
  scheduleDescription: string | null;
  language: "en" | "ml" | "mixed";
}

export interface VerificationResult {
  id: string;
  category: string;
  label: string;
  status: "PASS" | "FAIL" | "WARNING" | "MANUAL_CHECK";
  message: string;
  details?: Record<string, unknown>;
}

export interface AreaTrackingEntry {
  nodeId: string;
  deedNo: string;
  date: string | null;
  type: "ACQUIRED" | "SOLD" | "PARTITIONED";
  person: string;
  area: number; // in cents
  cumulativeBalance: number;
  flagged: boolean;
  note: string;
}

export interface ProcessingStep {
  step: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number; // 0-100
  message: string;
}

export interface ProcessingStatus {
  currentStep: string;
  steps: ProcessingStep[];
  overallProgress: number;
  error?: string;
}

// Area conversion constants (to cents)
export const AREA_CONVERSIONS: Record<string, number> = {
  cent: 1,
  cents: 1,
  are: 2.471,
  ares: 2.471,
  acre: 100,
  acres: 100,
  hectare: 247.105,
  hectares: 247.105,
  sqft: 0.0000229568,
  "sq.ft": 0.0000229568,
  "square feet": 0.0000229568,
  "square foot": 0.0000229568,
  sqm: 0.000247105,
  "sq.m": 0.000247105,
  "square meter": 0.000247105,
  "square meters": 0.000247105,
  "square metre": 0.000247105,
  "square metres": 0.000247105,
};

export function normalizeAreaToCents(value: number, unit: string): number {
  const key = unit.toLowerCase().trim();
  const factor = AREA_CONVERSIONS[key];
  if (!factor) return value; // assume cents if unknown
  return value * factor;
}
