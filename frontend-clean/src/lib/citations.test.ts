import { describe, expect, it } from "vitest";
import { expandPages, formatPageRanges, parseCitations } from "./citations";
import { validatePaperFile } from "./files";

describe("citations", () => {
  it("expands page ranges", () => expect(expandPages("4–6")).toEqual([4, 5, 6]));
  it("formats low-text pages compactly", () =>
    expect(formatPageRanges([12, 13])).toBe("Pages 12–13"));
  it("parses inline citations", () => {
    const segs = parseCitations("Uses attention [Page 5].");
    expect(segs[1]).toEqual({ type: "citation", pages: [5] });
  });
});

describe("upload validation", () => {
  it("rejects non-PDF", () =>
    expect(validatePaperFile(new File(["x"], "a.txt", { type: "text/plain" }))).toBe(
      "Please upload a PDF file.",
    ));
  it("rejects files over 20 MB", () => {
    const f = new File(["x"], "a.pdf", { type: "application/pdf" });
    Object.defineProperty(f, "size", { value: 20 * 1024 * 1024 + 1 });
    expect(validatePaperFile(f)).toBe("Files larger than 20 MB are not supported.");
  });
});
