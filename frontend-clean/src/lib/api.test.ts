import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, deletePaper, getPaper, messageFromApiDetail } from "./api";

describe("messageFromApiDetail", () => {
  it("reads FastAPI string details", () => {
    expect(messageFromApiDetail("Paper not found.")).toBe("Paper not found.");
  });

  it("reads FastAPI validation arrays", () => {
    expect(messageFromApiDetail([{ loc: ["body", "question"], msg: "Field required" }])).toBe(
      "Field required",
    );
  });
});

describe("API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("treats 204 responses as success without parsing JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        text: async () => "",
        json: async () => {
          throw new Error("no body");
        },
      }),
    );
    await expect(deletePaper("abc")).resolves.toBeUndefined();
  });

  it("normalizes FastAPI error payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Paper not found." }),
      }),
    );
    await expect(getPaper("missing")).rejects.toMatchObject({
      name: "ApiError",
      message: "Paper not found.",
      status: 404,
    } satisfies Partial<ApiError>);
  });
});
