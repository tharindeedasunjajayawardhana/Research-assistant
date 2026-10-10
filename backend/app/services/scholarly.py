"""External scholarly metadata search. Never invents references.

OpenAlex is used when reachable. Ordinary paper Q&A does not call this.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request

from ..ai_schemas import ScholarlyHit, ScholarlySearchOut


class ScholarlyProvider:
    name = "base"

    def search(self, query: str, limit: int = 5) -> ScholarlySearchOut:
        raise NotImplementedError


class OpenAlexProvider(ScholarlyProvider):
    name = "openalex"
    endpoint = "https://api.openalex.org/works"

    def __init__(self, mailto: str = "", timeout: float = 12.0):
        self.mailto = mailto
        self.timeout = timeout

    def search(self, query: str, limit: int = 5) -> ScholarlySearchOut:
        params = {"search": query, "per_page": str(max(1, min(limit, 10)))}
        if self.mailto:
            params["mailto"] = self.mailto
        url = self.endpoint + "?" + urllib.parse.urlencode(params)
        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": f"paper-insight-research/0.4 (mailto:{self.mailto or 'not-set'})"
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            if exc.code == 429:
                return ScholarlySearchOut(
                    query=query,
                    results=[],
                    warning="OpenAlex rate-limited the request. Try again later.",
                )
            return ScholarlySearchOut(
                query=query,
                results=[],
                warning="OpenAlex is currently unavailable.",
            )
        except Exception:
            return ScholarlySearchOut(
                query=query,
                results=[],
                warning="Could not reach OpenAlex. External search is optional.",
            )

        results: list[ScholarlyHit] = []
        for work in payload.get("results") or []:
            if not isinstance(work, dict):
                continue
            title = work.get("display_name") or work.get("title")
            if not isinstance(title, str) or not title.strip():
                continue
            authors = []
            for authorship in work.get("authorships") or []:
                author = (authorship or {}).get("author") or {}
                name = author.get("display_name")
                if isinstance(name, str) and name.strip():
                    authors.append(name.strip())
            doi = None
            ids = work.get("ids") or {}
            if isinstance(ids, dict) and isinstance(ids.get("doi"), str):
                doi = ids["doi"]
            elif isinstance(work.get("doi"), str):
                doi = work["doi"]
            date = work.get("publication_date") or work.get("from_publication_date")
            if date is not None:
                date = str(date)
            source_url = None
            if isinstance(work.get("id"), str):
                source_url = work["id"]
            primary = work.get("primary_location") or {}
            landing = (primary or {}).get("landing_page_url")
            if isinstance(landing, str):
                source_url = landing
            results.append(
                ScholarlyHit(
                    provider=self.name,
                    title=title.strip(),
                    authors=authors,
                    publication_date=date,
                    doi=doi,
                    source_url=source_url,
                    origin="external",
                )
            )
        return ScholarlySearchOut(query=query, results=results)


def get_provider(settings) -> ScholarlyProvider:
    return OpenAlexProvider(
        mailto=settings.scholarly_mailto,
        timeout=settings.scholarly_timeout_seconds,
    )


def search_scholarly(settings, query: str, limit: int = 5) -> ScholarlySearchOut:
    if not settings.scholarly_enabled:
        return ScholarlySearchOut(
            query=query,
            results=[],
            warning="External scholarly search is disabled.",
        )
    return get_provider(settings).search(query, limit=limit)
