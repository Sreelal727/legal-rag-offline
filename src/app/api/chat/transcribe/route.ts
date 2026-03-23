import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-utils";

export const maxDuration = 30;

const HF_API_KEY = process.env.LLM_API_KEY || "";
const WHISPER_MODEL = process.env.WHISPER_MODEL || "openai/whisper-large-v3-turbo";

/**
 * POST /api/chat/transcribe
 * Receives audio blob, sends to HuggingFace Whisper for transcription.
 */
export async function POST(request: NextRequest) {
  const { error } = await withAuth("notices:read");
  if (error) return error;

  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as File;

    if (!audio) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await audio.arrayBuffer());

    // Try HuggingFace Inference API first
    const hfResponse = await fetch(
      `https://router.huggingface.co/hf-inference/models/${WHISPER_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": audio.type || "audio/webm",
        },
        body: audioBuffer,
      }
    );

    if (!hfResponse.ok) {
      // Fallback: try the standard inference API endpoint
      const fallbackResponse = await fetch(
        `https://api-inference.huggingface.co/models/${WHISPER_MODEL}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": audio.type || "audio/webm",
          },
          body: audioBuffer,
        }
      );

      if (!fallbackResponse.ok) {
        const errText = await fallbackResponse.text();
        console.error("Whisper API error:", errText);
        return NextResponse.json(
          { error: "Transcription failed. Please try again." },
          { status: 500 }
        );
      }

      const fallbackData = await fallbackResponse.json();
      return NextResponse.json({ text: fallbackData.text || "" });
    }

    const data = await hfResponse.json();
    return NextResponse.json({ text: data.text || "" });
  } catch (e: any) {
    console.error("Transcribe error:", e);
    return NextResponse.json(
      { error: e?.message || "Transcription failed" },
      { status: 500 }
    );
  }
}
