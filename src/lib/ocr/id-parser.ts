/**
 * Parses OCR text from Indian ID documents and extracts structured data.
 */

export interface ParsedIDData {
  documentType: "AADHAAR" | "PAN" | "VOTER_ID" | "UNKNOWN";
  name?: string;
  fatherName?: string;
  dob?: string;
  gender?: string;
  address?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  voterIdNumber?: string;
  phone?: string;
}

export function parseIDText(text: string): ParsedIDData {
  const cleaned = text.replace(/\r\n/g, "\n").trim();

  // Detect document type
  const isAadhaar =
    /aadhaar|आधार|uid|unique\s*identification/i.test(cleaned) ||
    /\b\d{4}\s?\d{4}\s?\d{4}\b/.test(cleaned);
  const isPAN =
    /income\s*tax|permanent\s*account|pan/i.test(cleaned) ||
    /\b[A-Z]{5}\d{4}[A-Z]\b/.test(cleaned);
  const isVoter =
    /election|voter|electors?\s*photo|epic/i.test(cleaned) ||
    /\b[A-Z]{3}\d{7}\b/.test(cleaned);

  if (isAadhaar) return parseAadhaar(cleaned);
  if (isPAN) return parsePAN(cleaned);
  if (isVoter) return parseVoterID(cleaned);

  // Try generic extraction
  return { documentType: "UNKNOWN", ...extractGenericFields(cleaned) };
}

function parseAadhaar(text: string): ParsedIDData {
  const result: ParsedIDData = { documentType: "AADHAAR" };

  // Extract 12-digit Aadhaar number (XXXX XXXX XXXX)
  const aadhaarMatch = text.match(/\b(\d{4}\s?\d{4}\s?\d{4})\b/);
  if (aadhaarMatch) {
    result.aadhaarNumber = aadhaarMatch[1].replace(/\s/g, "");
  }

  // Extract DOB - various formats
  const dobMatch = text.match(
    /(?:DOB|Date\s*of\s*Birth|जन्म\s*तिथि)[:\s]*(\d{2}[\/-]\d{2}[\/-]\d{4})/i
  );
  if (dobMatch) {
    result.dob = dobMatch[1];
  } else {
    // Try standalone date pattern near "Year of Birth" or just a date
    const dateMatch = text.match(/\b(\d{2}[\/-]\d{2}[\/-]\d{4})\b/);
    if (dateMatch) result.dob = dateMatch[1];
  }

  // Extract gender
  const genderMatch = text.match(/\b(MALE|FEMALE|male|female|पुरुष|महिला|TRANSGENDER)\b/i);
  if (genderMatch) {
    const g = genderMatch[1].toUpperCase();
    result.gender = g === "पुरुष" ? "MALE" : g === "महिला" ? "FEMALE" : g;
  }

  // Extract name - usually the first prominent name line
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const nameLineIdx = lines.findIndex((l) =>
    /^(name|नाम)/i.test(l)
  );
  if (nameLineIdx !== -1) {
    const namePart = lines[nameLineIdx].replace(/^(name|नाम)[:\s]*/i, "").trim();
    if (namePart) {
      result.name = cleanName(namePart);
    } else if (lines[nameLineIdx + 1]) {
      result.name = cleanName(lines[nameLineIdx + 1]);
    }
  } else {
    // Try to find name from lines that look like proper names (all caps, 2-4 words)
    for (const line of lines) {
      if (/^[A-Z][a-z]+ [A-Z][a-z]+/.test(line) || /^[A-Z]{2,} [A-Z]{2,}/.test(line)) {
        if (!/aadhaar|government|india|uid|unique/i.test(line)) {
          result.name = cleanName(line);
          break;
        }
      }
    }
  }

  // Extract address
  const addressIdx = lines.findIndex((l) => /^(address|पता)/i.test(l));
  if (addressIdx !== -1) {
    const addressParts: string[] = [];
    const addrStart = lines[addressIdx].replace(/^(address|पता)[:\s]*/i, "").trim();
    if (addrStart) addressParts.push(addrStart);
    for (let i = addressIdx + 1; i < Math.min(addressIdx + 5, lines.length); i++) {
      if (/^\d{6}$/.test(lines[i].trim())) {
        addressParts.push(lines[i].trim());
        break;
      }
      if (/aadhaar|uid|\d{4}\s?\d{4}\s?\d{4}/i.test(lines[i])) break;
      addressParts.push(lines[i]);
    }
    if (addressParts.length) result.address = addressParts.join(", ");
  }

  return result;
}

function parsePAN(text: string): ParsedIDData {
  const result: ParsedIDData = { documentType: "PAN" };

  // Extract PAN number (ABCDE1234F)
  const panMatch = text.match(/\b([A-Z]{5}\d{4}[A-Z])\b/);
  if (panMatch) {
    result.panNumber = panMatch[1];
  }

  // Extract name
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const nameIdx = lines.findIndex((l) => /^name/i.test(l));
  if (nameIdx !== -1) {
    const namePart = lines[nameIdx].replace(/^name[:\s]*/i, "").trim();
    if (namePart) {
      result.name = cleanName(namePart);
    } else if (lines[nameIdx + 1]) {
      result.name = cleanName(lines[nameIdx + 1]);
    }
  } else {
    // PAN cards often have name in ALL CAPS after "INCOME TAX" lines
    for (const line of lines) {
      if (/^[A-Z]{2,}(\s+[A-Z]{2,}){1,3}$/.test(line)) {
        if (!/INCOME|TAX|INDIA|GOVT|PERMANENT|ACCOUNT|DEPARTMENT/i.test(line)) {
          result.name = cleanName(line);
          break;
        }
      }
    }
  }

  // Extract father's name
  const fatherIdx = lines.findIndex((l) => /father|पिता/i.test(l));
  if (fatherIdx !== -1) {
    const fatherPart = lines[fatherIdx].replace(/^father'?s?\s*name[:\s]*/i, "").trim();
    if (fatherPart) {
      result.fatherName = cleanName(fatherPart);
    } else if (lines[fatherIdx + 1]) {
      result.fatherName = cleanName(lines[fatherIdx + 1]);
    }
  }

  // Extract DOB
  const dobMatch = text.match(/\b(\d{2}[\/-]\d{2}[\/-]\d{4})\b/);
  if (dobMatch) result.dob = dobMatch[1];

  return result;
}

function parseVoterID(text: string): ParsedIDData {
  const result: ParsedIDData = { documentType: "VOTER_ID" };

  // Extract Voter ID (e.g., ABC1234567)
  const voterMatch = text.match(/\b([A-Z]{3}\d{7})\b/);
  if (voterMatch) {
    result.voterIdNumber = voterMatch[1];
  }

  // Extract name
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const nameIdx = lines.findIndex((l) => /^(name|elector)/i.test(l));
  if (nameIdx !== -1) {
    const namePart = lines[nameIdx].replace(/^(name|elector'?s?\s*name)[:\s]*/i, "").trim();
    if (namePart) {
      result.name = cleanName(namePart);
    } else if (lines[nameIdx + 1]) {
      result.name = cleanName(lines[nameIdx + 1]);
    }
  }

  // Extract father's name
  const fatherIdx = lines.findIndex((l) => /father|husband/i.test(l));
  if (fatherIdx !== -1) {
    const part = lines[fatherIdx]
      .replace(/^(father'?s?|husband'?s?)\s*name[:\s]*/i, "")
      .trim();
    if (part) result.fatherName = cleanName(part);
    else if (lines[fatherIdx + 1]) result.fatherName = cleanName(lines[fatherIdx + 1]);
  }

  // Extract gender
  const genderMatch = text.match(/\b(MALE|FEMALE|male|female)\b/i);
  if (genderMatch) result.gender = genderMatch[1].toUpperCase();

  // Extract DOB
  const dobMatch = text.match(/\b(\d{2}[\/-]\d{2}[\/-]\d{4})\b/);
  if (dobMatch) result.dob = dobMatch[1];

  // Extract address
  const addressIdx = lines.findIndex((l) => /^address/i.test(l));
  if (addressIdx !== -1) {
    const addressParts: string[] = [];
    const addrStart = lines[addressIdx].replace(/^address[:\s]*/i, "").trim();
    if (addrStart) addressParts.push(addrStart);
    for (let i = addressIdx + 1; i < Math.min(addressIdx + 5, lines.length); i++) {
      if (/^\d{6}$/.test(lines[i].trim())) {
        addressParts.push(lines[i].trim());
        break;
      }
      if (/election|voter|epic/i.test(lines[i])) break;
      addressParts.push(lines[i]);
    }
    if (addressParts.length) result.address = addressParts.join(", ");
  }

  return result;
}

function extractGenericFields(text: string): Partial<ParsedIDData> {
  const result: Partial<ParsedIDData> = {};
  const aadhaarMatch = text.match(/\b(\d{4}\s?\d{4}\s?\d{4})\b/);
  if (aadhaarMatch) result.aadhaarNumber = aadhaarMatch[1].replace(/\s/g, "");
  const panMatch = text.match(/\b([A-Z]{5}\d{4}[A-Z])\b/);
  if (panMatch) result.panNumber = panMatch[1];
  return result;
}

function cleanName(name: string): string {
  return name
    .replace(/[^a-zA-Z\s.]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
