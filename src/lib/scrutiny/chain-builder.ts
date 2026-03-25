import type { ExtractedDeedFields, DeedReference } from "./types";

interface DeedDocInput {
  id: string;
  extractedFields: string | null;
  documentType: string;
}

export interface ChainNodeData {
  propertyDocumentId: string | null;
  documentNumber: string | null;
  registrationYear: number | null;
  sroName: string | null;
  executionDate: string | null;
  registrationDate: string | null;
  deedType: string | null;
  grantor: string[] | null;
  grantee: string[] | null;
  surveyNumbers: string[] | null;
  area: number | null;
  areaUnit: string | null;
  areaOriginal: string | null;
  consideration: number | null;
  stampDuty: number | null;
  parentNodeIds: string[] | null;
  referencedDeedNos: DeedReference[] | null;
  isMissing: boolean;
  isLatest: boolean;
  chainDepth: number;
  verificationFlags: string[] | null;
}

interface ParsedDeed {
  docId: string;
  fields: ExtractedDeedFields;
  regDate: Date | null;
  nodeId: string; // temporary ID for linking
}

export function buildDeedChain(deedDocs: DeedDocInput[]): ChainNodeData[] {
  // Parse all deed documents
  const parsedDeeds: ParsedDeed[] = [];

  for (const doc of deedDocs) {
    if (!doc.extractedFields) continue;

    let fields: ExtractedDeedFields;
    try {
      fields = JSON.parse(doc.extractedFields);
    } catch {
      continue;
    }

    const regDate = fields.registrationDate ? new Date(fields.registrationDate) : null;

    parsedDeeds.push({
      docId: doc.id,
      fields,
      regDate,
      nodeId: `node-${doc.id}`,
    });
  }

  if (parsedDeeds.length === 0) return [];

  // Sort by registration date (newest first)
  parsedDeeds.sort((a, b) => {
    if (!a.regDate && !b.regDate) return 0;
    if (!a.regDate) return 1;
    if (!b.regDate) return -1;
    return b.regDate.getTime() - a.regDate.getTime();
  });

  // Build node map for matching references
  const nodeMap = new Map<string, ParsedDeed>();
  for (const deed of parsedDeeds) {
    // Key by docNo + year for matching
    if (deed.fields.documentNumber) {
      const key = makeMatchKey(
        deed.fields.documentNumber,
        deed.fields.registrationYear,
        deed.fields.sroName
      );
      nodeMap.set(key, deed);
    }
  }

  // Build chain nodes
  const nodes: ChainNodeData[] = [];
  const missingDeeds = new Map<string, DeedReference>(); // track missing references

  for (let i = 0; i < parsedDeeds.length; i++) {
    const deed = parsedDeeds[i];
    const isLatest = i === 0;
    const parentIds: string[] = [];
    const flags: string[] = [];

    // Match referenced deeds
    for (const ref of deed.fields.referencedDeeds) {
      const refKey = makeMatchKey(ref.docNo, ref.year, ref.sro);

      // Try to find matching deed in bundle
      const matched = findMatchingDeed(ref, nodeMap);
      if (matched) {
        parentIds.push(matched.docId);
      } else {
        // Check if we already created a missing node for this
        if (!missingDeeds.has(refKey)) {
          missingDeeds.set(refKey, ref);
        }
        parentIds.push(`missing-${refKey}`);
      }
    }

    nodes.push({
      propertyDocumentId: deed.docId,
      documentNumber: deed.fields.documentNumber,
      registrationYear: deed.fields.registrationYear,
      sroName: deed.fields.sroName,
      executionDate: deed.fields.executionDate,
      registrationDate: deed.fields.registrationDate,
      deedType: deed.fields.deedType,
      grantor: deed.fields.grantor,
      grantee: deed.fields.grantee,
      surveyNumbers: deed.fields.surveyNumbers,
      area: deed.fields.area?.value || null,
      areaUnit: deed.fields.area?.unit || "cents",
      areaOriginal: deed.fields.area?.original || null,
      consideration: deed.fields.consideration,
      stampDuty: deed.fields.stampDuty,
      parentNodeIds: parentIds.length > 0 ? parentIds : null,
      referencedDeedNos: deed.fields.referencedDeeds.length > 0 ? deed.fields.referencedDeeds : null,
      isMissing: false,
      isLatest,
      chainDepth: 0, // will be computed later
      verificationFlags: flags.length > 0 ? flags : null,
    });
  }

  // Create missing deed nodes
  for (const [key, ref] of missingDeeds) {
    nodes.push({
      propertyDocumentId: null,
      documentNumber: ref.docNo,
      registrationYear: ref.year,
      sroName: ref.sro,
      executionDate: null,
      registrationDate: ref.year ? `${ref.year}-01-01` : null,
      deedType: null,
      grantor: null,
      grantee: null,
      surveyNumbers: null,
      area: null,
      areaUnit: null,
      areaOriginal: null,
      consideration: null,
      stampDuty: null,
      parentNodeIds: null,
      referencedDeedNos: null,
      isMissing: true,
      isLatest: false,
      chainDepth: 0,
      verificationFlags: ["MISSING_DEED: Referenced deed not found in bundle"],
    });
  }

  // Compute chain depths via BFS from latest
  computeChainDepths(nodes);

  return nodes;
}

function makeMatchKey(docNo: string | null, year: number | null, sro: string | null): string {
  const normalizedDocNo = (docNo || "").replace(/\D/g, "").trim();
  const normalizedSro = normalizeSroName(sro || "");
  return `${normalizedDocNo}|${year || ""}|${normalizedSro}`;
}

function normalizeSroName(sro: string): string {
  return sro
    .toLowerCase()
    .replace(/sub\s*registrar\s*(office)?/gi, "")
    .replace(/sro/gi, "")
    .replace(/[^a-z]/g, "")
    .trim();
}

function findMatchingDeed(
  ref: DeedReference,
  nodeMap: Map<string, ParsedDeed>
): ParsedDeed | null {
  // Try exact match
  const exactKey = makeMatchKey(ref.docNo, ref.year, ref.sro);
  if (nodeMap.has(exactKey)) return nodeMap.get(exactKey)!;

  // Try without SRO
  const noSroKey = makeMatchKey(ref.docNo, ref.year, null);
  for (const [key, deed] of nodeMap) {
    if (key.startsWith(noSroKey.split("|").slice(0, 2).join("|"))) {
      return deed;
    }
  }

  // Try just doc number match
  const docNoOnly = (ref.docNo || "").replace(/\D/g, "").trim();
  if (docNoOnly) {
    for (const [key, deed] of nodeMap) {
      if (key.startsWith(`${docNoOnly}|`)) {
        return deed;
      }
    }
  }

  return null;
}

function computeChainDepths(nodes: ChainNodeData[]): void {
  // Build adjacency: child -> parents
  const docIdToIndex = new Map<string, number>();
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].propertyDocumentId) {
      docIdToIndex.set(nodes[i].propertyDocumentId!, i);
    }
  }

  // BFS from latest node (depth 0)
  const latestIdx = nodes.findIndex((n) => n.isLatest);
  if (latestIdx === -1) return;

  const visited = new Set<number>();
  const queue: [number, number][] = [[latestIdx, 0]];
  visited.add(latestIdx);

  while (queue.length > 0) {
    const [idx, depth] = queue.shift()!;
    nodes[idx].chainDepth = depth;

    const parentIds = nodes[idx].parentNodeIds || [];
    for (const parentId of parentIds) {
      let parentIdx: number | undefined;

      if (parentId.startsWith("missing-")) {
        // Find the missing node
        parentIdx = nodes.findIndex(
          (n) => n.isMissing && makeMatchKey(n.documentNumber, n.registrationYear, n.sroName) === parentId.replace("missing-", "")
        );
      } else {
        parentIdx = docIdToIndex.get(parentId);
      }

      if (parentIdx !== undefined && parentIdx >= 0 && !visited.has(parentIdx)) {
        visited.add(parentIdx);
        queue.push([parentIdx, depth + 1]);
      }
    }
  }

  // Assign depth to unvisited nodes (disconnected)
  for (let i = 0; i < nodes.length; i++) {
    if (!visited.has(i)) {
      nodes[i].chainDepth = 999; // disconnected
    }
  }
}
