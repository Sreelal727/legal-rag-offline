import type { VerificationResult } from "./types";

interface ChainNode {
  id: string;
  documentNumber: string | null;
  registrationYear: number | null;
  sroName: string | null;
  executionDate: string | Date | null;
  registrationDate: string | Date | null;
  deedType: string | null;
  grantor: string | null;
  grantee: string | null;
  surveyNumbers: string | null;
  area: number | null;
  areaUnit: string | null;
  consideration: number | null;
  stampDuty: number | null;
  isMissing: boolean;
  isLatest: boolean;
  chainDepth: number;
  parentNodeIds: string | null;
  verificationFlags: string | null;
}

interface PropertyDoc {
  id: string;
  documentType: string;
  extractedFields: string | null;
  verificationStatus: string | null;
}

export function runVerifications(
  nodes: ChainNode[],
  docs: PropertyDoc[]
): VerificationResult[] {
  const results: VerificationResult[] = [];

  results.push(...checkChainCompleteness(nodes));
  results.push(...checkAreaVerification(nodes));
  results.push(...checkSurveyNumberConsistency(nodes));
  results.push(...checkEncumbranceCertificate(docs));
  results.push(...checkTaxReceipts(docs));
  results.push(...checkStampDuty(nodes));
  results.push(...checkSuccessionDocuments(nodes, docs));
  results.push(...checkPowerOfAttorney(nodes, docs));
  results.push(...checkCourtOrders(nodes, docs));
  results.push(...checkTimeGaps(nodes));

  return results;
}

function checkChainCompleteness(nodes: ChainNode[]): VerificationResult[] {
  const results: VerificationResult[] = [];

  const missingCount = nodes.filter((n) => n.isMissing).length;
  const totalDeeds = nodes.filter((n) => !n.isMissing).length;
  const missingNodes = nodes.filter((n) => n.isMissing);

  if (missingCount === 0 && totalDeeds > 0) {
    results.push({
      id: "chain-completeness",
      category: "Chain",
      label: "Chain Completeness",
      status: "PASS",
      message: `All ${totalDeeds} referenced deeds are present in the bundle.`,
    });
  } else if (missingCount > 0) {
    const missingDetails = missingNodes
      .map((n) => `Doc No. ${n.documentNumber || "?"}/${n.registrationYear || "?"}${n.sroName ? ` of SRO ${n.sroName}` : ""}`)
      .join("; ");
    results.push({
      id: "chain-completeness",
      category: "Chain",
      label: "Chain Completeness",
      status: "FAIL",
      message: `${missingCount} deed(s) referenced but missing from bundle: ${missingDetails}`,
      details: { missingCount, missingDeeds: missingDetails },
    });
  }

  // Check chain depth / years covered
  const datesPresent = nodes
    .filter((n) => n.registrationDate && !n.isMissing)
    .map((n) => new Date(n.registrationDate!).getFullYear())
    .sort();

  if (datesPresent.length >= 2) {
    const yearSpan = datesPresent[datesPresent.length - 1] - datesPresent[0];
    if (yearSpan < 30) {
      results.push({
        id: "chain-span",
        category: "Chain",
        label: "Chain Duration",
        status: "WARNING",
        message: `Chain covers only ${yearSpan} years (${datesPresent[0]}-${datesPresent[datesPresent.length - 1]}). Recommended: 30+ years.`,
        details: { yearSpan, oldest: datesPresent[0], newest: datesPresent[datesPresent.length - 1] },
      });
    } else {
      results.push({
        id: "chain-span",
        category: "Chain",
        label: "Chain Duration",
        status: "PASS",
        message: `Chain covers ${yearSpan} years (${datesPresent[0]}-${datesPresent[datesPresent.length - 1]}).`,
      });
    }
  }

  return results;
}

function checkAreaVerification(nodes: ChainNode[]): VerificationResult[] {
  const results: VerificationResult[] = [];

  // Track area per person: how much acquired vs how much sold
  const personArea = new Map<string, { acquired: number; sold: number }>();

  for (const node of nodes) {
    if (node.isMissing || !node.area) continue;

    const grantees = node.grantee ? JSON.parse(node.grantee) : [];
    const grantors = node.grantor ? JSON.parse(node.grantor) : [];
    const areaPerPerson = node.area / Math.max(grantees.length, 1);
    const areaPerGrantor = node.area / Math.max(grantors.length, 1);

    for (const person of grantees) {
      const name = person.toLowerCase().trim();
      if (!personArea.has(name)) personArea.set(name, { acquired: 0, sold: 0 });
      personArea.get(name)!.acquired += areaPerPerson;
    }

    for (const person of grantors) {
      const name = person.toLowerCase().trim();
      if (!personArea.has(name)) personArea.set(name, { acquired: 0, sold: 0 });
      personArea.get(name)!.sold += areaPerGrantor;
    }
  }

  // Check for over-selling
  let hasAreaIssue = false;
  const issues: string[] = [];

  for (const [person, { acquired, sold }] of personArea) {
    if (sold > 0 && acquired > 0 && sold > acquired * 1.01) {
      // Allow 1% tolerance for rounding
      hasAreaIssue = true;
      issues.push(
        `${person}: acquired ${acquired.toFixed(2)} cents but sold/transferred ${sold.toFixed(2)} cents (excess: ${(sold - acquired).toFixed(2)} cents)`
      );
    }
  }

  if (hasAreaIssue) {
    results.push({
      id: "area-mismatch",
      category: "Area",
      label: "Area Verification",
      status: "FAIL",
      message: `Area mismatch detected: ${issues.join("; ")}`,
      details: { issues },
    });
  } else if (personArea.size > 0) {
    results.push({
      id: "area-mismatch",
      category: "Area",
      label: "Area Verification",
      status: "PASS",
      message: "No area over-selling detected across the chain.",
    });
  }

  // Check partition deeds: children should sum to parent
  const partitionNodes = nodes.filter((n) => n.deedType === "PARTITION" && !n.isMissing);
  for (const pNode of partitionNodes) {
    // Find children that reference this partition
    const childNodes = nodes.filter((n) => {
      if (!n.parentNodeIds) return false;
      const parents = JSON.parse(n.parentNodeIds);
      return parents.includes(pNode.id);
    });

    if (childNodes.length > 0 && pNode.area) {
      const childAreaSum = childNodes.reduce((sum, c) => sum + (c.area || 0), 0);
      if (Math.abs(childAreaSum - pNode.area) > pNode.area * 0.01) {
        results.push({
          id: `partition-area-${pNode.id}`,
          category: "Area",
          label: "Partition Area Check",
          status: "WARNING",
          message: `Partition deed ${pNode.documentNumber || "?"}: parent area ${pNode.area.toFixed(2)} cents but children total ${childAreaSum.toFixed(2)} cents.`,
        });
      }
    }
  }

  return results;
}

function checkSurveyNumberConsistency(nodes: ChainNode[]): VerificationResult[] {
  const allSurveyNos = new Set<string>();

  for (const node of nodes) {
    if (node.isMissing || !node.surveyNumbers) continue;
    const surveyNos: string[] = JSON.parse(node.surveyNumbers);
    surveyNos.forEach((s) => allSurveyNos.add(s.trim()));
  }

  if (allSurveyNos.size === 0) {
    return [{
      id: "survey-consistency",
      category: "Survey",
      label: "Survey Number Consistency",
      status: "MANUAL_CHECK",
      message: "No survey numbers found in the chain. Manual verification needed.",
    }];
  }

  if (allSurveyNos.size === 1) {
    return [{
      id: "survey-consistency",
      category: "Survey",
      label: "Survey Number Consistency",
      status: "PASS",
      message: `Consistent survey number throughout: ${[...allSurveyNos][0]}`,
    }];
  }

  return [{
    id: "survey-consistency",
    category: "Survey",
    label: "Survey Number Consistency",
    status: "WARNING",
    message: `Multiple survey numbers found: ${[...allSurveyNos].join(", ")}. May indicate re-survey or different plots.`,
    details: { surveyNumbers: [...allSurveyNos] },
  }];
}

function checkEncumbranceCertificate(docs: PropertyDoc[]): VerificationResult[] {
  const ecDocs = docs.filter((d) => d.documentType === "ENCUMBRANCE_CERTIFICATE");

  if (ecDocs.length === 0) {
    return [{
      id: "ec-present",
      category: "Supporting",
      label: "Encumbrance Certificate",
      status: "FAIL",
      message: "No Encumbrance Certificate (EC) found in the bundle.",
    }];
  }

  return [{
    id: "ec-present",
    category: "Supporting",
    label: "Encumbrance Certificate",
    status: "PASS",
    message: `${ecDocs.length} Encumbrance Certificate(s) found in bundle.`,
  }];
}

function checkTaxReceipts(docs: PropertyDoc[]): VerificationResult[] {
  const taxDocs = docs.filter((d) => d.documentType === "TAX_RECEIPT");

  if (taxDocs.length === 0) {
    return [{
      id: "tax-receipt",
      category: "Supporting",
      label: "Tax Receipts",
      status: "WARNING",
      message: "No property tax receipts found in the bundle.",
    }];
  }

  return [{
    id: "tax-receipt",
    category: "Supporting",
    label: "Tax Receipts",
    status: "PASS",
    message: `${taxDocs.length} tax receipt(s) found in bundle.`,
  }];
}

function checkStampDuty(nodes: ChainNode[]): VerificationResult[] {
  const results: VerificationResult[] = [];
  const MINIMUM_STAMP_RATE = 0.08; // 8% minimum for Kerala

  for (const node of nodes) {
    if (node.isMissing || !node.consideration || !node.stampDuty) continue;
    if (node.deedType === "GIFT" || node.deedType === "WILL" || node.deedType === "INHERITANCE") continue;

    const expectedMinStamp = node.consideration * MINIMUM_STAMP_RATE;
    if (node.stampDuty < expectedMinStamp * 0.9) {
      // 10% tolerance
      results.push({
        id: `stamp-duty-${node.documentNumber || node.registrationYear}`,
        category: "Stamp Duty",
        label: `Stamp Duty - Doc ${node.documentNumber || "?"}`,
        status: "WARNING",
        message: `Stamp duty Rs. ${node.stampDuty.toLocaleString()} on consideration Rs. ${node.consideration.toLocaleString()} (${((node.stampDuty / node.consideration) * 100).toFixed(1)}%). Minimum expected: ~${(MINIMUM_STAMP_RATE * 100).toFixed(0)}%.`,
      });
    }
  }

  if (results.length === 0) {
    const nodesWithStamp = nodes.filter((n) => !n.isMissing && n.stampDuty);
    if (nodesWithStamp.length > 0) {
      results.push({
        id: "stamp-duty-overall",
        category: "Stamp Duty",
        label: "Stamp Duty Verification",
        status: "PASS",
        message: "Stamp duty amounts appear adequate for all deeds with data.",
      });
    }
  }

  return results;
}

function checkSuccessionDocuments(nodes: ChainNode[], docs: PropertyDoc[]): VerificationResult[] {
  const inheritanceNodes = nodes.filter(
    (n) => !n.isMissing && (n.deedType === "INHERITANCE" || n.deedType === "WILL")
  );

  if (inheritanceNodes.length === 0) return [];

  const hasSuccessionCert = docs.some((d) => d.documentType === "SUCCESSION_CERTIFICATE");
  const hasLegalHeirCert = docs.some((d) => d.documentType === "LEGAL_HEIR_CERTIFICATE");
  const hasDeathCert = docs.some((d) => d.documentType === "DEATH_CERTIFICATE");

  const results: VerificationResult[] = [];

  if (!hasSuccessionCert && !hasLegalHeirCert) {
    results.push({
      id: "succession-cert",
      category: "Succession",
      label: "Succession/Legal Heir Certificate",
      status: "FAIL",
      message: "Inheritance transfers found but no Succession Certificate or Legal Heir Certificate in bundle.",
    });
  } else {
    results.push({
      id: "succession-cert",
      category: "Succession",
      label: "Succession/Legal Heir Certificate",
      status: "PASS",
      message: "Succession/Legal Heir Certificate found for inheritance transfers.",
    });
  }

  if (!hasDeathCert) {
    results.push({
      id: "death-cert",
      category: "Succession",
      label: "Death Certificate",
      status: "WARNING",
      message: "Inheritance transfers found but no Death Certificate in bundle.",
    });
  }

  return results;
}

function checkPowerOfAttorney(nodes: ChainNode[], docs: PropertyDoc[]): VerificationResult[] {
  // Check if any grantor/grantee mentions "power of attorney", "PoA", "attorney"
  const hasPoa = docs.some((d) => d.documentType === "POWER_OF_ATTORNEY");

  // Check deed texts for PoA mentions
  const poaMentionNodes = nodes.filter((n) => {
    if (n.isMissing) return false;
    const grantor = n.grantor ? JSON.parse(n.grantor).join(" ").toLowerCase() : "";
    return grantor.includes("attorney") || grantor.includes("poa") || grantor.includes("power of attorney");
  });

  if (poaMentionNodes.length > 0 && !hasPoa) {
    return [{
      id: "poa-doc",
      category: "Supporting",
      label: "Power of Attorney",
      status: "WARNING",
      message: "Some transfers appear to involve Power of Attorney but no PoA document found in bundle.",
    }];
  }

  return [];
}

function checkCourtOrders(nodes: ChainNode[], docs: PropertyDoc[]): VerificationResult[] {
  const courtDecreeNodes = nodes.filter(
    (n) => !n.isMissing && n.deedType === "COURT_DECREE"
  );

  if (courtDecreeNodes.length === 0) return [];

  const hasCourtOrder = docs.some((d) => d.documentType === "COURT_ORDER");

  if (!hasCourtOrder) {
    return [{
      id: "court-order",
      category: "Supporting",
      label: "Court Order",
      status: "FAIL",
      message: "Transfer by court decree found but no Court Order document in bundle.",
    }];
  }

  return [{
    id: "court-order",
    category: "Supporting",
    label: "Court Order",
    status: "PASS",
    message: "Court Order document found for court decree transfer.",
  }];
}

function checkTimeGaps(nodes: ChainNode[]): VerificationResult[] {
  const results: VerificationResult[] = [];
  const MAX_GAP_YEARS = 15;

  const datedNodes = nodes
    .filter((n) => !n.isMissing && n.registrationDate)
    .sort((a, b) => new Date(a.registrationDate!).getTime() - new Date(b.registrationDate!).getTime());

  for (let i = 1; i < datedNodes.length; i++) {
    const prev = new Date(datedNodes[i - 1].registrationDate!);
    const curr = new Date(datedNodes[i].registrationDate!);
    const gapYears = (curr.getTime() - prev.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    if (gapYears > MAX_GAP_YEARS) {
      results.push({
        id: `time-gap-${i}`,
        category: "Chain",
        label: "Time Gap in Chain",
        status: "WARNING",
        message: `${Math.round(gapYears)}-year gap between deed ${datedNodes[i - 1].documentNumber || "?"} (${prev.getFullYear()}) and ${datedNodes[i].documentNumber || "?"} (${curr.getFullYear()}).`,
      });
    }
  }

  if (results.length === 0 && datedNodes.length > 1) {
    results.push({
      id: "time-gaps",
      category: "Chain",
      label: "Time Continuity",
      status: "PASS",
      message: "No significant time gaps in the deed chain.",
    });
  }

  return results;
}
