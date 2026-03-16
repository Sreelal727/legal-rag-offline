import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-utils";
import { parseIDText } from "@/lib/ocr/id-parser";
import Tesseract from "tesseract.js";

export async function POST(request: NextRequest) {
  const { error } = await withAuth("clients:write");
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPG, PNG, or WEBP image." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Run OCR with Tesseract.js
    const { data } = await Tesseract.recognize(buffer, "eng", {
      logger: () => {}, // suppress logs
    });

    const ocrText = data.text;
    const confidence = data.confidence;

    // Parse the OCR text to extract ID fields
    const parsed = parseIDText(ocrText);

    return NextResponse.json({
      success: true,
      confidence,
      rawText: ocrText,
      extracted: parsed,
    });
  } catch (err) {
    console.error("OCR processing error:", err);
    return NextResponse.json(
      { error: "Failed to process the image. Please try a clearer photo." },
      { status: 500 }
    );
  }
}
