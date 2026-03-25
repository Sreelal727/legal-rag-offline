import { prisma } from "@/lib/prisma";
import { extractStructuredContent } from "@/lib/docx-extract";
import { classifyDocuments } from "./classifier";
import { extractDeedFields } from "./field-extractor";
import { buildDeedChain } from "./chain-builder";
import { runVerifications } from "./verifier";
import { DEED_DOCUMENT_TYPES } from "./types";
import type { ProcessingStatus, ProcessingStep } from "./types";

const STEPS: ProcessingStep[] = [
  { step: "Text Extraction", status: "pending", progress: 0, message: "" },
  { step: "Document Classification", status: "pending", progress: 0, message: "" },
  { step: "Field Extraction", status: "pending", progress: 0, message: "" },
  { step: "Deed Chain Construction", status: "pending", progress: 0, message: "" },
  { step: "Verification", status: "pending", progress: 0, message: "" },
];

async function updateStatus(reportId: string, status: ProcessingStatus) {
  await prisma.scrutinyReport.update({
    where: { id: reportId },
    data: { processingStatus: JSON.stringify(status) },
  });
}

function makeStatus(currentStep: string, steps: ProcessingStep[]): ProcessingStatus {
  const completed = steps.filter((s) => s.status === "completed").length;
  return {
    currentStep,
    steps,
    overallProgress: Math.round((completed / steps.length) * 100),
  };
}

export async function processScrutinyBundle(reportId: string): Promise<void> {
  const steps = STEPS.map((s) => ({ ...s }));

  // Get all property documents
  const docs = await prisma.propertyDocument.findMany({
    where: { scrutinyReportId: reportId },
    orderBy: { sortOrder: "asc" },
  });

  if (docs.length === 0) throw new Error("No documents to process");

  // ===== STEP 1: Text Extraction =====
  steps[0].status = "running";
  steps[0].message = `Extracting text from ${docs.length} documents...`;
  await updateStatus(reportId, makeStatus("Text Extraction", steps));

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    steps[0].message = `Extracting ${i + 1}/${docs.length}: ${doc.fileName || "document"}`;
    steps[0].progress = Math.round(((i + 1) / docs.length) * 100);
    await updateStatus(reportId, makeStatus("Text Extraction", steps));

    if (doc.extractedText && doc.extractedText.length > 50) {
      continue; // Already extracted
    }

    let extractedText = "";

    if (doc.filePath && doc.fileName) {
      const ext = doc.fileName.split(".").pop()?.toLowerCase();
      const isImage = ["jpg", "jpeg", "png", "tiff", "tif"].includes(ext || "");

      if (isImage || doc.ocrRequired) {
        // OCR for images - use Tesseract
        try {
          const Tesseract = await import("tesseract.js");
          const { data } = await Tesseract.recognize(doc.filePath, "eng+mal");
          extractedText = data.text;
        } catch (err) {
          console.error(`OCR failed for ${doc.fileName}:`, err);
          extractedText = "[OCR extraction failed]";
        }

        await prisma.propertyDocument.update({
          where: { id: doc.id },
          data: { ocrCompleted: true },
        });
      } else {
        // Standard text extraction
        try {
          const result = await extractStructuredContent(doc.filePath, doc.fileName);
          extractedText = result.text;
        } catch (err) {
          console.error(`Extraction failed for ${doc.fileName}:`, err);
          extractedText = "[Text extraction failed]";
        }
      }

      // Check if OCR is needed for PDFs with little text
      if (ext === "pdf" && extractedText.replace(/\s/g, "").length < 50) {
        try {
          const Tesseract = await import("tesseract.js");
          const { data } = await Tesseract.recognize(doc.filePath, "eng+mal");
          if (data.text.replace(/\s/g, "").length > extractedText.replace(/\s/g, "").length) {
            extractedText = data.text;
          }
        } catch {
          // Keep whatever we have
        }
        await prisma.propertyDocument.update({
          where: { id: doc.id },
          data: { ocrRequired: true, ocrCompleted: true },
        });
      }
    }

    await prisma.propertyDocument.update({
      where: { id: doc.id },
      data: { extractedText },
    });

    // Update in-memory copy
    (docs[i] as any).extractedText = extractedText;
  }

  steps[0].status = "completed";
  steps[0].progress = 100;

  // ===== STEP 2: Document Classification =====
  steps[1].status = "running";
  steps[1].message = "Classifying documents...";
  await updateStatus(reportId, makeStatus("Document Classification", steps));

  const docsForClassification = docs
    .filter((d) => (d as any).extractedText && (d as any).extractedText.length > 10)
    .map((d) => ({ id: d.id, text: (d as any).extractedText || d.extractedText || "" }));

  const classifications = await classifyDocuments(docsForClassification);

  for (const [docId, classification] of classifications) {
    await prisma.propertyDocument.update({
      where: { id: docId },
      data: {
        documentType: classification.documentType,
        classification: JSON.stringify(classification),
        language: classification.language,
      },
    });
  }

  steps[1].status = "completed";
  steps[1].progress = 100;

  // ===== STEP 3: Field Extraction (deeds only) =====
  steps[2].status = "running";
  await updateStatus(reportId, makeStatus("Field Extraction", steps));

  // Re-fetch docs with updated classification
  const updatedDocs = await prisma.propertyDocument.findMany({
    where: { scrutinyReportId: reportId },
  });

  const deedDocs = updatedDocs.filter((d) =>
    DEED_DOCUMENT_TYPES.includes(d.documentType as any)
  );

  steps[2].message = `Extracting fields from ${deedDocs.length} deed documents...`;
  await updateStatus(reportId, makeStatus("Field Extraction", steps));

  for (let i = 0; i < deedDocs.length; i++) {
    const doc = deedDocs[i];
    steps[2].message = `Extracting ${i + 1}/${deedDocs.length}: ${doc.fileName || doc.documentType}`;
    steps[2].progress = Math.round(((i + 1) / deedDocs.length) * 100);
    await updateStatus(reportId, makeStatus("Field Extraction", steps));

    if (doc.extractedText) {
      const fields = await extractDeedFields(doc.id, doc.extractedText);
      await prisma.propertyDocument.update({
        where: { id: doc.id },
        data: { extractedFields: JSON.stringify(fields) },
      });
    }
  }

  steps[2].status = "completed";
  steps[2].progress = 100;

  // ===== STEP 4: Deed Chain Construction =====
  steps[3].status = "running";
  steps[3].message = "Building deed chain...";
  await updateStatus(reportId, makeStatus("Deed Chain Construction", steps));

  // Clear existing chain nodes
  await prisma.deedChainNode.deleteMany({ where: { scrutinyReportId: reportId } });

  // Re-fetch deed docs with fields
  const deedDocsWithFields = await prisma.propertyDocument.findMany({
    where: {
      scrutinyReportId: reportId,
      documentType: { in: DEED_DOCUMENT_TYPES as unknown as string[] },
    },
  });

  const chainNodes = buildDeedChain(deedDocsWithFields);

  for (const node of chainNodes) {
    await prisma.deedChainNode.create({
      data: {
        scrutinyReportId: reportId,
        propertyDocumentId: node.propertyDocumentId,
        documentNumber: node.documentNumber,
        registrationYear: node.registrationYear,
        sroName: node.sroName,
        executionDate: node.executionDate ? new Date(node.executionDate) : null,
        registrationDate: node.registrationDate ? new Date(node.registrationDate) : null,
        deedType: node.deedType,
        grantor: node.grantor ? JSON.stringify(node.grantor) : null,
        grantee: node.grantee ? JSON.stringify(node.grantee) : null,
        surveyNumbers: node.surveyNumbers ? JSON.stringify(node.surveyNumbers) : null,
        area: node.area,
        areaUnit: node.areaUnit || "cents",
        areaOriginal: node.areaOriginal,
        consideration: node.consideration,
        stampDuty: node.stampDuty,
        parentNodeIds: node.parentNodeIds ? JSON.stringify(node.parentNodeIds) : null,
        referencedDeedNos: node.referencedDeedNos ? JSON.stringify(node.referencedDeedNos) : null,
        isMissing: node.isMissing,
        isLatest: node.isLatest,
        chainDepth: node.chainDepth,
        verificationFlags: node.verificationFlags ? JSON.stringify(node.verificationFlags) : null,
      },
    });
  }

  steps[3].status = "completed";
  steps[3].progress = 100;

  // ===== STEP 5: Verification =====
  steps[4].status = "running";
  steps[4].message = "Running verification checks...";
  await updateStatus(reportId, makeStatus("Verification", steps));

  const allDocs = await prisma.propertyDocument.findMany({
    where: { scrutinyReportId: reportId },
  });
  const allNodes = await prisma.deedChainNode.findMany({
    where: { scrutinyReportId: reportId },
  });

  const verifications = runVerifications(allNodes, allDocs);

  await prisma.scrutinyReport.update({
    where: { id: reportId },
    data: { verificationData: JSON.stringify(verifications) },
  });

  steps[4].status = "completed";
  steps[4].progress = 100;

  // ===== DONE =====
  await prisma.scrutinyReport.update({
    where: { id: reportId },
    data: {
      status: "REVIEW",
      processingStatus: JSON.stringify(makeStatus("completed", steps)),
    },
  });
}
