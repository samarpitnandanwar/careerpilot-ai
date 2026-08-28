// ============================================================================
// CareerPilot AI — Resume Text Extraction
// ============================================================================
//
// Extracts readable text from PDF and DOCX files.
// PDF uses pdfjs-dist (Mozilla PDF.js) — handles all standard PDFs.
// DOCX uses mammoth.
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfjsLib = require("pdfjs-dist");
import mammoth from "mammoth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractionResult {
  text: string;
  charCount: number;
}

export class ExtractionError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

// ---------------------------------------------------------------------------
// PDF extraction via pdfjs-dist
// ---------------------------------------------------------------------------

export async function extractPdfText(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const data = new Uint8Array(buffer);
    const doc = await pdfjsLib.getDocument({ data }).promise;

    const textParts: string[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();

      const pageText = content.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => ("str" in item ? String(item.str) : ""))
        .join(" ");

      textParts.push(pageText);
    }

    const text = textParts.join("\n").replace(/\n\s*\n/g, "\n\n").trim();

    if (text.length === 0) {
      throw new ExtractionError(
        "This PDF contains no extractable text. It may be a scanned/image-only document.",
        "EMPTY_PDF",
      );
    }

    return { text, charCount: text.length };
  } catch (error) {
    if (error instanceof ExtractionError) throw error;
    throw new ExtractionError(
      "Failed to read this PDF. The file may be corrupted or password-protected.",
      "PDF_PARSE_ERROR",
    );
  }
}

// ---------------------------------------------------------------------------
// DOCX extraction via mammoth
// ---------------------------------------------------------------------------

export async function extractDocxText(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });

    const text = result.value?.trim() ?? "";

    if (text.length === 0) {
      throw new ExtractionError(
        "This DOCX file contains no extractable text.",
        "EMPTY_DOCX",
      );
    }

    if (result.messages.length > 0) {
      console.warn("[Resume] DOCX extraction warnings:", result.messages.length);
    }

    return { text, charCount: text.length };
  } catch (error) {
    if (error instanceof ExtractionError) throw error;
    throw new ExtractionError(
      "Failed to read this DOCX file. The file may be corrupted.",
      "DOCX_PARSE_ERROR",
    );
  }
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export async function extractResumeText(
  buffer: Buffer,
  fileType: string,
): Promise<ExtractionResult> {
  switch (fileType) {
    case "application/pdf":
      return extractPdfText(buffer);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return extractDocxText(buffer);
    default:
      throw new ExtractionError(
        "Only PDF and DOCX files are supported.",
        "UNSUPPORTED_FILE_TYPE",
      );
  }
}
