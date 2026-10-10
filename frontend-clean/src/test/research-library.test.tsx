import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ResearchLibrary } from "@/components/library/ResearchLibrary";
import * as api from "@/lib/api";
import type { Paper } from "@/lib/types";

vi.mock("@/lib/api");
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    children?: React.ReactNode;
  }) => <a {...props}>{children}</a>,
}));

const mockPapers: Paper[] = [
  {
    id: "paper-1",
    title: "Deep Residual Learning for Image Recognition",
    author: "Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun",
    year: "2016",
    filename: "resnet.pdf",
    language: "en",
    language_name: "English",
    low_text_pages: [],
    page_count: 28,
    status: "ready",
    created_at: "2026-03-01T12:00:00Z",
  },
  {
    id: "paper-2",
    title: "Language Models are Few-Shot Learners",
    author: "Tom B. Brown et al.",
    year: "2020",
    filename: "gpt3.pdf",
    language: "en",
    language_name: "English",
    low_text_pages: [],
    page_count: 75,
    status: "ready",
    created_at: "2026-03-02T12:00:00Z",
  },
];

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("ResearchLibrary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders list of papers in library with metadata and actions", async () => {
    vi.mocked(api.listPapers).mockResolvedValue(mockPapers);

    renderWithClient(<ResearchLibrary />);

    expect(
      await screen.findByText("Deep Residual Learning for Image Recognition"),
    ).toBeInTheDocument();
    expect(screen.getByText("Language Models are Few-Shot Learners")).toBeInTheDocument();
    expect(screen.getByText("28 pages")).toBeInTheDocument();
    expect(screen.getByText("75 pages")).toBeInTheDocument();
  });

  it("opens delete confirmation modal when delete icon is clicked", async () => {
    vi.mocked(api.listPapers).mockResolvedValue(mockPapers);

    renderWithClient(<ResearchLibrary />);

    expect(
      await screen.findByText("Deep Residual Learning for Image Recognition"),
    ).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });
    expect(deleteButtons[0]).toBeDefined();
    fireEvent.click(deleteButtons[0]!);

    expect(screen.getByText("Delete Research Paper?")).toBeInTheDocument();
    expect(screen.getByText(/This will safely remove/i)).toBeInTheDocument();
  });
});
