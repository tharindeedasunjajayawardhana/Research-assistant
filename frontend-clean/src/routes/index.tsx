import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/pages/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Research Assistant — Understand papers. Cite the page." },
      {
        name: "description",
        content:
          "Upload a research paper, get a structured summary, and ask questions answered with page citations.",
      },
      { property: "og:title", content: "AI Research Assistant" },
      { property: "og:description", content: "Understand papers. Ask questions. Cite the page." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});
