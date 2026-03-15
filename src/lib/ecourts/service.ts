import { ECOURTS_CONFIG, type CourtKey, type EcourtCaseStatus, type EcourtSearchResult } from "./config";

// Note: eCourts doesn't have a documented public API.
// This service uses form-based POST requests similar to their web interface.
// Results are parsed from HTML/JSON responses.
// In production, consider using a headless browser or official API when available.

const HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  "User-Agent": "Mozilla/5.0 (compatible; LegalRAG/1.0)",
  Accept: "application/json, text/html, */*",
};

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

// Lookup case status by CNR Number
export async function lookupByCNR(cnrNumber: string): Promise<EcourtCaseStatus | null> {
  try {
    const url = `${ECOURTS_CONFIG.districtCourtBase}/ajax_cnr_status.php`;
    const body = new URLSearchParams({
      cnr_number: cnrNumber.toUpperCase(),
      ajax_req: "true",
    });

    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: HEADERS,
      body: body.toString(),
    });

    if (!response.ok) return null;

    const text = await response.text();
    return parseEcourtResponse(text, cnrNumber);
  } catch (error) {
    console.error("eCourts CNR lookup failed:", error);
    return null;
  }
}

// Search cases by case number for a specific court
export async function searchByCaseNumber(
  courtKey: CourtKey,
  caseType: string,
  caseNumber: string,
  year: string
): Promise<EcourtSearchResult[]> {
  try {
    const court = ECOURTS_CONFIG.courts[courtKey];
    const isHighCourt = court.type === "HIGH_COURT";
    const baseUrl = isHighCourt ? ECOURTS_CONFIG.highCourtBase : ECOURTS_CONFIG.districtCourtBase;
    const endpoint = isHighCourt ? "/ajax_case_number_hc.php" : "/ajax_case_number.php";

    const params: Record<string, string> = {
      state_code: court.stateCode,
      dist_code: court.districtCode,
      court_code: court.courtCode,
      case_type: caseType,
      case_no: caseNumber,
      year: year,
      ajax_req: "true",
    };

    const response = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: HEADERS,
      body: new URLSearchParams(params).toString(),
    });

    if (!response.ok) return [];

    const text = await response.text();
    return parseSearchResults(text);
  } catch (error) {
    console.error("eCourts case number search failed:", error);
    return [];
  }
}

// Search cases by party name
export async function searchByPartyName(
  courtKey: CourtKey,
  partyName: string,
  year?: string
): Promise<EcourtSearchResult[]> {
  try {
    const court = ECOURTS_CONFIG.courts[courtKey];
    const isHighCourt = court.type === "HIGH_COURT";
    const baseUrl = isHighCourt ? ECOURTS_CONFIG.highCourtBase : ECOURTS_CONFIG.districtCourtBase;
    const endpoint = isHighCourt ? "/ajax_party_name_hc.php" : "/ajax_party_name.php";

    const params: Record<string, string> = {
      state_code: court.stateCode,
      dist_code: court.districtCode,
      court_code: court.courtCode,
      petres_name: partyName,
      year: year || "",
      ajax_req: "true",
    };

    const response = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: HEADERS,
      body: new URLSearchParams(params).toString(),
    });

    if (!response.ok) return [];

    const text = await response.text();
    return parseSearchResults(text);
  } catch (error) {
    console.error("eCourts party name search failed:", error);
    return [];
  }
}

// Search by advocate name
export async function searchByAdvocateName(
  courtKey: CourtKey,
  advocateName: string,
  year?: string
): Promise<EcourtSearchResult[]> {
  try {
    const court = ECOURTS_CONFIG.courts[courtKey];
    const isHighCourt = court.type === "HIGH_COURT";
    const baseUrl = isHighCourt ? ECOURTS_CONFIG.highCourtBase : ECOURTS_CONFIG.districtCourtBase;
    const endpoint = isHighCourt ? "/ajax_advocate_name_hc.php" : "/ajax_advocate_name.php";

    const params: Record<string, string> = {
      state_code: court.stateCode,
      dist_code: court.districtCode,
      court_code: court.courtCode,
      advocate_name: advocateName,
      year: year || "",
      ajax_req: "true",
    };

    const response = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: HEADERS,
      body: new URLSearchParams(params).toString(),
    });

    if (!response.ok) return [];

    const text = await response.text();
    return parseSearchResults(text);
  } catch (error) {
    console.error("eCourts advocate search failed:", error);
    return [];
  }
}

// Search by FIR number (for criminal cases)
export async function searchByFIRNumber(
  courtKey: CourtKey,
  policeStation: string,
  firNumber: string,
  year: string
): Promise<EcourtSearchResult[]> {
  try {
    const court = ECOURTS_CONFIG.courts[courtKey];
    const baseUrl = ECOURTS_CONFIG.districtCourtBase;

    const params: Record<string, string> = {
      state_code: court.stateCode,
      dist_code: court.districtCode,
      court_code: court.courtCode,
      police_station: policeStation,
      fir_no: firNumber,
      year: year,
      ajax_req: "true",
    };

    const response = await fetchWithTimeout(`${baseUrl}/ajax_fir_number.php`, {
      method: "POST",
      headers: HEADERS,
      body: new URLSearchParams(params).toString(),
    });

    if (!response.ok) return [];

    const text = await response.text();
    return parseSearchResults(text);
  } catch (error) {
    console.error("eCourts FIR search failed:", error);
    return [];
  }
}

// Get cause list for a court on a specific date
export async function getCauseList(
  courtKey: CourtKey,
  date: string // format: DD-MM-YYYY
): Promise<any[]> {
  try {
    const court = ECOURTS_CONFIG.courts[courtKey];
    const isHighCourt = court.type === "HIGH_COURT";
    const baseUrl = isHighCourt ? ECOURTS_CONFIG.highCourtBase : ECOURTS_CONFIG.districtCourtBase;
    const endpoint = isHighCourt ? "/ajax_cause_list_hc.php" : "/ajax_cause_list.php";

    const params: Record<string, string> = {
      state_code: court.stateCode,
      dist_code: court.districtCode,
      court_code: court.courtCode,
      cause_list_date: date,
      ajax_req: "true",
    };

    const response = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: HEADERS,
      body: new URLSearchParams(params).toString(),
    });

    if (!response.ok) return [];

    const text = await response.text();
    return parseCauseList(text);
  } catch (error) {
    console.error("eCourts cause list fetch failed:", error);
    return [];
  }
}

// Parse HTML/text response from eCourts into structured data
function parseEcourtResponse(html: string, cnrNumber: string): EcourtCaseStatus | null {
  try {
    // eCourts returns HTML tables. Parse key fields.
    // This is a best-effort parser — eCourts format may vary.

    const getTableValue = (label: string): string => {
      const regex = new RegExp(`${label}[\\s]*</td>[\\s]*<td[^>]*>([^<]+)`, "i");
      const match = html.match(regex);
      return match ? match[1].trim() : "";
    };

    const getTextBetween = (start: string, end: string): string => {
      const startIdx = html.indexOf(start);
      if (startIdx === -1) return "";
      const endIdx = html.indexOf(end, startIdx + start.length);
      if (endIdx === -1) return "";
      return html.substring(startIdx + start.length, endIdx).replace(/<[^>]+>/g, "").trim();
    };

    // Parse hearing history from table rows
    const hearingHistory: EcourtCaseStatus["hearingHistory"] = [];
    const hearingRegex = /<tr[^>]*>\s*<td[^>]*>(\d{2}-\d{2}-\d{4})<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>/gi;
    let hearingMatch;
    while ((hearingMatch = hearingRegex.exec(html)) !== null) {
      hearingHistory.push({
        date: hearingMatch[1],
        judge: hearingMatch[2].trim(),
        businessOnDate: hearingMatch[3].trim(),
        purpose: hearingMatch[4].trim(),
      });
    }

    // Parse orders
    const orders: EcourtCaseStatus["orders"] = [];
    const orderRegex = /<tr[^>]*>\s*<td[^>]*>(\d{2}-\d{2}-\d{4})<\/td>\s*<td[^>]*>([^<]*)<\/td>/gi;
    let orderMatch;
    // Only parse after "Order" section marker if present
    const orderSection = html.indexOf("Order");
    if (orderSection > -1) {
      const orderHtml = html.substring(orderSection);
      while ((orderMatch = orderRegex.exec(orderHtml)) !== null) {
        orders.push({
          date: orderMatch[1],
          description: orderMatch[2].trim(),
        });
      }
    }

    const caseStatus: EcourtCaseStatus = {
      cnrNumber: cnrNumber.toUpperCase(),
      caseNumber: getTableValue("Case Number") || getTableValue("Registration Number"),
      caseType: getTableValue("Case Type"),
      filingDate: getTableValue("Filing Date"),
      registrationDate: getTableValue("Registration Date"),
      courtName: getTableValue("Court Name") || getTableValue("Court Number"),
      judge: getTableValue("Judge") || getTableValue("Coram"),
      status: getTableValue("Case Status") || getTableValue("Status"),
      nextHearingDate: getTableValue("Next Hearing Date") || getTableValue("Next Date") || null,
      petitioner: getTableValue("Petitioner") || getTextBetween("Petitioner", "</"),
      respondent: getTableValue("Respondent") || getTextBetween("Respondent", "</"),
      petitionerAdvocate: getTableValue("Petitioner Advocate") || getTableValue("Pet. Advocate"),
      respondentAdvocate: getTableValue("Respondent Advocate") || getTableValue("Res. Advocate"),
      acts: [],
      hearingHistory,
      orders,
      caseTransferHistory: [],
    };

    // Parse acts/sections
    const actsRegex = /Under Act\(s\)[^<]*<[^>]*>([^<]+)/gi;
    let actsMatch;
    while ((actsMatch = actsRegex.exec(html)) !== null) {
      caseStatus.acts.push(actsMatch[1].trim());
    }

    // Only return if we got meaningful data
    if (caseStatus.caseNumber || caseStatus.status || caseStatus.petitioner) {
      return caseStatus;
    }

    return null;
  } catch {
    return null;
  }
}

function parseSearchResults(html: string): EcourtSearchResult[] {
  const results: EcourtSearchResult[] = [];

  try {
    // Parse table rows from search results
    const rowRegex = /<tr[^>]*class="[^"]*case_row[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(html)) !== null) {
      const cells = rowMatch[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      const cellValues = cells.map((c) => c.replace(/<[^>]+>/g, "").trim());

      if (cellValues.length >= 4) {
        // Try to extract CNR from link
        const cnrMatch = rowMatch[1].match(/cnr_number=([A-Z0-9]+)/i);

        results.push({
          cnrNumber: cnrMatch ? cnrMatch[1] : "",
          caseNumber: cellValues[0] || "",
          caseType: cellValues[1] || "",
          year: cellValues[2] || "",
          petitioner: cellValues[3] || "",
          respondent: cellValues[4] || "",
          status: cellValues[5] || "",
          court: cellValues[6] || "",
        });
      }
    }

    // Fallback: try JSON response (some endpoints return JSON)
    if (results.length === 0) {
      try {
        const jsonData = JSON.parse(html);
        if (Array.isArray(jsonData)) {
          return jsonData.map((item: any) => ({
            cnrNumber: item.cnr_number || item.cnr || "",
            caseNumber: item.case_number || item.case_no || "",
            caseType: item.case_type || "",
            year: item.year || "",
            petitioner: item.petitioner || item.pet_name || "",
            respondent: item.respondent || item.res_name || "",
            status: item.status || item.case_status || "",
            court: item.court_name || item.court || "",
          }));
        }
      } catch {
        // Not JSON, continue with empty results
      }
    }
  } catch {
    // Parse error, return empty
  }

  return results;
}

function parseCauseList(html: string): any[] {
  const items: any[] = [];

  try {
    // Try JSON first
    try {
      const jsonData = JSON.parse(html);
      if (Array.isArray(jsonData)) return jsonData;
    } catch {
      // Not JSON
    }

    // Parse HTML table
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    let isHeader = true;

    while ((rowMatch = rowRegex.exec(html)) !== null) {
      if (isHeader) { isHeader = false; continue; }

      const cells = rowMatch[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      const cellValues = cells.map((c) => c.replace(/<[^>]+>/g, "").trim());

      if (cellValues.length >= 3) {
        items.push({
          serialNumber: cellValues[0],
          caseNumber: cellValues[1],
          parties: cellValues[2],
          advocate: cellValues[3] || "",
          purpose: cellValues[4] || "",
          courtRoom: cellValues[5] || "",
        });
      }
    }
  } catch {
    // Parse error
  }

  return items;
}
