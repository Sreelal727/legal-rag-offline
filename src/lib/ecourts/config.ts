export const ECOURTS_CONFIG = {
  districtCourtBase: "https://services.ecourts.gov.in/ecourtindia_v6",
  highCourtBase: "https://hcservices.ecourts.gov.in/hcservices",

  // Kerala
  stateCode: "32",
  stateName: "Kerala",

  courts: {
    PALAKKAD_DISTRICT: {
      name: "Palakkad District Court",
      stateCode: "32",
      districtCode: "7",
      courtCode: "1",
      type: "DISTRICT_COURT" as const,
    },
    KERALA_HIGH_COURT: {
      name: "Kerala High Court",
      stateCode: "32",
      districtCode: "0",
      courtCode: "1",
      type: "HIGH_COURT" as const,
    },
  },

  // CNR format: STATE_CODE + DISTRICT_CODE + COURT_CODE + CASE_TYPE + CASE_NUMBER + YEAR
  // Example: KLPK010000012024 (Kerala-Palakkad-Court1-CaseNum-Year)
  cnrPattern: /^[A-Z]{4}\d{12}$/,
};

export type CourtKey = keyof typeof ECOURTS_CONFIG.courts;

export interface EcourtCaseStatus {
  cnrNumber: string;
  caseNumber: string;
  caseType: string;
  filingDate: string;
  registrationDate: string;
  courtName: string;
  judge: string;
  status: string;
  nextHearingDate: string | null;
  petitioner: string;
  respondent: string;
  petitionerAdvocate: string;
  respondentAdvocate: string;
  acts: string[];
  hearingHistory: {
    date: string;
    judge: string;
    businessOnDate: string;
    purpose: string;
  }[];
  orders: {
    date: string;
    description: string;
  }[];
  caseTransferHistory: {
    from: string;
    to: string;
    date: string;
  }[];
}

export interface EcourtSearchResult {
  cnrNumber: string;
  caseNumber: string;
  caseType: string;
  year: string;
  petitioner: string;
  respondent: string;
  status: string;
  court: string;
}
