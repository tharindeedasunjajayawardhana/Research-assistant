import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { VerifyTab } from "@/components/verify/VerifyTab";
import { CitationProvider } from "@/components/citation/CitationContext";
import * as api from "@/lib/api";
import type { VerifyResult } from "@/lib/types";

vi.mock("@/lib/api");

const mockVerifyResult: VerifyResult = {
  claim: "Transformers achieve state-of-the-art results on machine translation.",
  verdict: "supported",
  confidence: "high",
  explanation: "The authors demonstrate BLEU scores of 28.4 on WMT 2014 English-to-German.",
  evidence: [
    {
      page: 8,
      kind: "explicit",
      snippet:
        "On the WMT 2014 English-to-German translation task, the big transformer model establishes a new state-of-the-art BLEU score of 28.4.",
    },
  ],
  disclaimer: "Claim verification is based strictly on retrieved paper passages.",
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CitationProvider>{ui}</CitationProvider>
    </QueryClientProvider>,
  );
}

describe("VerifyTab", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders claim verification form and allows user to verify a claim", async () => {
    vi.mocked(api.verifyClaim).mockResolvedValue(mockVerifyResult);

    renderWithClient(<VerifyTab paperId="test-paper-1" lang="en" />);

    expect(screen.getByText("Claim Verification")).toBeInTheDocument();
    const input = screen.getByRole("textbox");
    const submitBtn = screen.getByRole("button", { name: /Verify Claim/i });

    fireEvent.change(input, {
      target: { value: "Transformers achieve state-of-the-art results on machine translation." },
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Supported by Paper")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "The authors demonstrate BLEU scores of 28.4 on WMT 2014 English-to-German.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/On the WMT 2014 English-to-German translation task/i),
    ).toBeInTheDocument();
  });
});
