import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-utils";
import { chatCompletion } from "@/lib/llm";

export async function POST(request: NextRequest) {
  const { error } = await withAuth("clients:write");
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPG, PNG, or WEBP image." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Run OCR with timeout — Tesseract handles handwriting reasonably well
    const TesseractModule = await import("tesseract.js");
    const Tesseract = TesseractModule.default || TesseractModule;

    const ocrPromise = Tesseract.recognize(buffer, "eng", {
      logger: () => {},
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("OCR_TIMEOUT")), 60000)
    );

    let data;
    try {
      const result = await Promise.race([ocrPromise, timeoutPromise]);
      data = (result as any).data;
    } catch (timeoutErr: any) {
      if (timeoutErr?.message === "OCR_TIMEOUT") {
        return NextResponse.json(
          { error: "OCR processing timed out. The image may be too large or complex. Please try a smaller/clearer image." },
          { status: 408 }
        );
      }
      throw timeoutErr;
    }

    const ocrText = data.text?.trim();

    if (!ocrText || ocrText.length < 5) {
      return NextResponse.json({
        success: false,
        error: "Could not read any text from the image. Please try a clearer photo.",
      }, { status: 400 });
    }

    // Use LLM to intelligently extract structured client details from messy OCR text
    const llmResponse = await chatCompletion([
      {
        role: "system",
        content: `You are a data extraction assistant. You will receive OCR text extracted from a handwritten note containing client/person details (typically written by a lawyer or clerk in India).

Extract whatever fields you can find and return ONLY a valid JSON object with these keys (use null for fields not found):
{
  "name": "Full name of the person",
  "email": "Email address if present",
  "phone": "Phone/mobile number if present",
  "address": "Full address if present",
  "panNumber": "PAN card number (format: ABCDE1234F) if present",
  "aadharNumber": "Aadhaar number (12 digits) if present",
  "gstNumber": "GST number if present",
  "fatherName": "Father's or husband's name if present",
  "dob": "Date of birth if present",
  "gender": "Gender if present",
  "occupation": "Occupation/profession if present",
  "notes": "Any other relevant details not captured above"
}

IMPORTANT:
- The text may be poorly recognized from handwriting, so use your best judgment to interpret misspellings or partial words
- Indian names may have titles like Sri, Smt, Mr, Mrs — include them in the name
- Phone numbers in India are typically 10 digits, sometimes with +91 prefix
- Correct obvious OCR errors (e.g., "0" vs "O", "1" vs "l")
- Return ONLY the JSON object, no other text or markdown`,
      },
      {
        role: "user",
        content: `Extract client details from this handwritten note (OCR text):\n\n${ocrText}`,
      },
    ]);

    // Parse the LLM response as JSON
    let extracted: Record<string, string | null>;
    try {
      // Strip markdown code fences if present
      let jsonStr = (llmResponse as string).trim();
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      extracted = JSON.parse(jsonStr);
    } catch {
      // If JSON parsing fails, return the raw OCR text
      return NextResponse.json({
        success: true,
        rawText: ocrText,
        extracted: { name: null, notes: ocrText },
        llmRaw: llmResponse,
        warning: "Could not parse LLM response as structured data. Raw text is available.",
      });
    }

    return NextResponse.json({
      success: true,
      rawText: ocrText,
      extracted,
    });
  } catch (err) {
    console.error("Handwritten OCR error:", err);
    return NextResponse.json(
      { error: "Failed to process the image. Please try a clearer photo." },
      { status: 500 }
    );
  }
}
