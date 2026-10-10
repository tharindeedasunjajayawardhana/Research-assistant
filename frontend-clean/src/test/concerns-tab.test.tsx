import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ConcernsTab } from "@/components/concerns/ConcernsTab";
import { CitationProvider } from "@/components/citation/CitationContext";
import * as api from "@/lib/api";
import type { ConcernsReport } from "@/lib/types";

vi.mock("@/lib/api");

const mockConcernsReport: ConcernsReport = {
  paper_id: "test-paper-1",
  total_concerns: 2,
  author_acknowledged_count: 1,
  ai_identified_count: 1,
  disclaimer: "Evidence alerts are heuristic and should be verified against source text.",
  summary: "Methodological sample size limitations detected alongside author-stated scope bounds.",
  concerns: [
    {
      id: "concern-1",
      title: "Small Sample Size",
      category: "sample_size_and_power",
      category_label: "Sample Size & Statistical Power",
      status: "potential_concern",
      status_label: "Potential Concern",
      confidence: "high",
      description: "Small sample size (N=12) with limited statistical power.",
      why_it_matters: "May result in underpowered statistical findings.",
      snippet: "Only 12 subjects participated in trial phase 1.",
      page: 4,
      acknowledged_by_authors: false,
      suggested_investigation: "How would statistical power change if N were increased to 100?",
    },
    {
      id: "concern-2",
      title: "English-Only Corpus",
      category: "dataset_generalizability",
      category_label: "Dataset Generalizability",
      status: "author_acknowledged_limitation",
      status_label: "Author-Acknowledged Limitation",
      confidence: "high",
      description: "Evaluation was restricted to English language corpus.",
      why_it_matters: "Limits generalization to other linguistic structures.",
      snippet: "We limit our study to English benchmarks as noted in Section 5.",
      page: 12,
      acknowledged_by_authors: true,
      suggested_investigation: "Does this technique generalize to multilingual benchmarks?",
    },
  ],
  cached: false,
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CitationProvider>{ui}</CitationProvider>
    </QueryClientProvider>,
  );
}

describe("ConcernsTab", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders concerns report with categories, severities, and quotes", async () => {
    vi.mocked(api.getConcerns).mockResolvedValue(mockConcernsReport);

    renderWithClient(<ConcernsTab paperId="test-paper-1" lang="en" />);

    await waitFor(() => {
      expect(screen.getByText("Research Concerns & Evidence Alerts")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Methodological sample size limitations detected alongside author-stated scope bounds.",
        ),
      ).toBeInTheDocument();
    });

    // Check items rendered
    expect(
      screen.getByText("Small sample size (N=12) with limited statistical power."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Evaluation was restricted to English language corpus."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("“Only 12 subjects participated in trial phase 1.”"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("How would statistical power change if N were increased to 100?"),
    ).toBeInTheDocument();
  });

  it("filters items when clicking Author Limitations filter button", async () => {
    vi.mocked(api.getConcerns).mockResolvedValue(mockConcernsReport);

    renderWithClient(<ConcernsTab paperId="test-paper-1" lang="en" />);

    await waitFor(() => {
      expect(
        screen.getByText("Small sample size (N=12) with limited statistical power."),
      ).toBeInTheDocument();
    });

    const authorBtn = screen.getByRole("button", { name: /Author-Acknowledged \(1\)/i });
    fireEvent.click(authorBtn);

    expect(
      screen.queryByText("Small sample size (N=12) with limited statistical power."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Evaluation was restricted to English language corpus."),
    ).toBeInTheDocument();
  });
});
