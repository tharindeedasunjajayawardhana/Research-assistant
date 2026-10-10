import { createFileRoute } from "@tanstack/react-router";
import { PaperWorkspacePage } from "@/pages/PaperWorkspacePage";
import { isResponseLanguage } from "@/lib/languages";
import type { ResponseLanguage } from "@/lib/types";

export const Route = createFileRoute("/paper/$id")({
  validateSearch: (search: Record<string, unknown>): { lang: ResponseLanguage } => ({
    lang: isResponseLanguage(search["lang"]) ? search["lang"] : "auto",
  }),
  head: () => ({
    meta: [
      { title: "Paper workspace — AI Research Assistant" },
      {
        name: "description",
        content: "Summary and citation-grounded chat for your uploaded research paper.",
      },
      { property: "og:title", content: "Paper workspace — AI Research Assistant" },
      { property: "og:description", content: "Summary and citation-grounded chat for your paper." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkspaceRoute,
});

function WorkspaceRoute() {
  const { id } = Route.useParams();
  const { lang } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <PaperWorkspacePage
      paperId={id}
      lang={lang}
      onLangChange={(l) => navigate({ search: { lang: l }, replace: true })}
    />
  );
}
