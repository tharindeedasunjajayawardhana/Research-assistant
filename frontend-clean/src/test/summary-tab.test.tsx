import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SummaryTab } from "@/components/summary/SummaryTab";
import { CitationProvider } from "@/components/citation/CitationContext";
import * as api from "@/lib/api";
import type { Summary } from "@/lib/types";

vi.mock("@/lib/api");

const mockSummary: Summary = {
  title: "Attention Is All You Need",
  authors: ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar"],
  publication_details: "NeurIPS 2017",
  abstract: {
    text: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks.",
    sources: [1],
  },
  problem_statement: {
    text: "Recurrent models preclude parallelization within training examples.",
    sources: [2],
  },
  methodology: {
    text: "We propose the Transformer, a model architecture eschewing recurrence and entirely relying on an attention mechanism.",
    sources: [2, 3],
  },
  key_results: {
    text: "BLEU score of 28.4 on WMT 2014 English-to-German translation task.",
    sources: [7, 8],
  },
  limitations: {
    text: "Self-attention requires quadratic memory with respect to sequence length.",
    sources: [9],
  },
  conclusion: {
    text: "The Transformer is the first sequence transduction model based entirely on attention.",
    sources: [10],
  },
  future_work: {
    text: "Extending self-attention to inputs of other modalities including audio and video.",
    sources: [11],
  },
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CitationProvider>{ui}</CitationProvider>
    </QueryClientProvider>,
  );
}

describe("SummaryTab", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders all 7 structured sections and publication details", async () => {
    vi.mocked(api.getSummary).mockResolvedValue(mockSummary);

    renderWithClient(<SummaryTab paperId="test-paper-1" lang="en" />);

    expect(await screen.findByText("Attention Is All You Need")).toBeInTheDocument();
    expect(screen.getByText("Ashish Vaswani")).toBeInTheDocument();
    expect(screen.getByText("NeurIPS 2017")).toBeInTheDocument();

    // 7 Sections
    expect(screen.getByText("Paper Overview / Abstract")).toBeInTheDocument();
    expect(screen.getByText("Problem Statement & Motivation")).toBeInTheDocument();
    expect(screen.getByText("Methodology & Setup")).toBeInTheDocument();
    expect(screen.getByText("Key Results & Quantitative Findings")).toBeInTheDocument();
    expect(screen.getByText("Limitations & Constraints")).toBeInTheDocument();
    expect(screen.getByText("Conclusion & Contributions")).toBeInTheDocument();
    expect(screen.getByText("Future Work & Open Directions")).toBeInTheDocument();

    // Content
    expect(
      screen.getByText(/quadratic memory with respect to sequence length/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Extending self-attention to inputs of other modalities/i),
    ).toBeInTheDocument();
  });
});
