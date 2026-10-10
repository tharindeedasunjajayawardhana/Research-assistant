import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, validatePaperFile } from "./files";

function pdf(name: string, size: number, type = "application/pdf") {
  return new File([new Uint8Array(size)], name, { type });
}

describe("validatePaperFile", () => {
  it("accepts a single PDF under the size limit", () => {
    expect(validatePaperFile(pdf("paper.pdf", 1024))).toBeNull();
  });

  it("rejects non-PDF files", () => {
    expect(validatePaperFile(pdf("notes.txt", 12, "text/plain"))).toBe("Please upload a PDF file.");
  });

  it("rejects files larger than 20 MB", () => {
    expect(validatePaperFile(pdf("huge.pdf", MAX_UPLOAD_BYTES + 1))).toBe(
      "Files larger than 20 MB are not supported.",
    );
  });
});
