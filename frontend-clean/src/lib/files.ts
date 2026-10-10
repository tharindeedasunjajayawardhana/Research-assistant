export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** Returns a friendly error message, or null when the file is acceptable. */
export function validatePaperFile(file: File): string | null {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Please upload a PDF file.";
  if (file.size > MAX_UPLOAD_BYTES) return "Files larger than 20 MB are not supported.";
  return null;
}
