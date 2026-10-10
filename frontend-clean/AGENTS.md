<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Architecture

- All data access goes through src/lib/api.ts (USE_MOCK toggles mock vs FastAPI at VITE_API_URL); components use hooks in src/hooks, never fetch — so the backend can be swapped without touching UI.
- Domain types live only in src/lib/types.ts; citation parsing only in src/lib/citations.ts.
- Page UIs live in src/pages and are mounted by thin TanStack route files (src/routes), since TanStack Start replaces App.tsx/main.tsx.
- Workspace tabs are a config list in WorkspaceTabs.tsx; add future tabs there.
