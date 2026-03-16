import mammoth from "mammoth";
import { readFileSync } from "fs";

export async function extractTextFromDocx(filePath: string): Promise<string> {
  const buffer = readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function extractHtmlFromDocx(filePath: string): Promise<string> {
  const buffer = readFileSync(filePath);
  const result = await mammoth.convertToHtml({ buffer });
  return result.value;
}
