"""Multi-paper comparison service.

Analyzes 2 to 10 uploaded research papers, generating structured profiles
for each paper (objectives, methods, datasets, findings, limitations)
and a synthesis of consensus agreements, empirical disagreements,
and shared evidence gaps with explicit paper and page citations.
"""

from __future__ import annotations

import json
import logging
from sqlalchemy.orm import Session

from ..ai_schemas import (
    CompareOut,
    CompareRequest,
    ComparisonSynthesisOut,
    PaperProfileOut,
    SourceOut,
)
from ..models import Paper, PaperPage
from .llm import LlmError, generate
from .rag import retrieve_evidence
from .retrieval import Hit

log = logging.getLogger(__name__)


def compare_multiple_papers(
    db: Session,
    request: CompareRequest,
    settings,
) -> CompareOut:
    """Compare multiple uploaded papers across methodology, datasets, findings, and consensus."""
    resolved_lang = "en" if request.lang == "auto" else request.lang

    papers: list[Paper] = []
    for pid in request.paper_ids:
        p = db.get(Paper, pid)
        if p is None or p.status != "ready":
            continue
        papers.append(p)

    if len(papers) < 2:
        raise ValueError("Select at least two ready papers to perform a comparison.")

    # Gather evidence per paper
    focus = request.focus_query or "objectives methodology dataset key findings limitations conclusions"
    paper_contexts: list[str] = []
    all_hits: list[Hit] = []

    for p in papers:
        first_page = db.get(PaperPage, (p.id, 1))
        intro = first_page.text.strip()[:1500] if first_page else ""
        hits = retrieve_evidence(db, p.id, focus, settings, paper_ids=[p.id])
        all_hits.extend(hits)
        excerpts = "\n".join(f"[Page {h.page_no}] {h.text[:500]}" for h in hits[:4])
        paper_contexts.append(
            f"=== Paper ID: {p.id} | Filename: {p.filename} ===\n"
            f"[Page 1 Overview]: {intro}\n"
            f"[Evidence Excerpts]:\n{excerpts}\n"
        )

    full_context = "\n\n".join(paper_contexts)

    target_lang = {
        "en": "English",
        "ja": "Japanese",
        "si": "Sinhala",
        "zh": "Chinese",
        "es": "Spanish",
        "fr": "French",
        "de": "German",
    }.get(resolved_lang, "English")

    system = (
        "You are an academic comparative analyst. Compare the provided research papers "
        "using ONLY the provided excerpts. Never blend papers into unattributed claims. "
        "Strict rules:\n"
        "1. For each paper, summarize objectives, methodology, datasets, findings, and limitations.\n"
        "2. Identify clear consensus agreements between the papers.\n"
        "3. Identify conflicting findings or disagreements, preserving nuances in datasets or conditions.\n"
        "4. Note evidence gaps where neither or only one paper provides data.\n"
        "5. Return JSON only with this structure:\n"
        '{\n'
        '  "summary": string (comparative overview),\n'
        '  "profiles": [\n'
        '    {\n'
        '      "paper_id": string,\n'
        '      "title": string,\n'
        '      "objectives": string,\n'
        '      "methodology": string,\n'
        '      "datasets": string,\n'
        '      "findings": string,\n'
        '      "limitations": string\n'
        '    }\n'
        '  ],\n'
        '  "agreements": [string],\n'
        '  "disagreements": [string],\n'
        '  "evidence_gaps": [string]\n'
        '}\n'
        f"Write all summaries in {target_lang}."
    )

    prompt = f"Focus Question/Topic: {focus}\n\nExcerpts by Paper:\n{full_context}"
    raw = generate(settings, system, prompt, json_mode=True)
    raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    try:
        data = json.loads(raw)
        profiles_map = {p.id: p for p in papers}
        profiles_out: list[PaperProfileOut] = []

        raw_profiles = data.get("profiles", [])
        if isinstance(raw_profiles, list):
            for prof in raw_profiles:
                if not isinstance(prof, dict):
                    continue
                pid = str(prof.get("paper_id") or "")
                paper_obj = profiles_map.get(pid)
                if not paper_obj:
                    continue
                profiles_out.append(
                    PaperProfileOut(
                        paper_id=pid,
                        title=str(prof.get("title") or paper_obj.filename),
                        filename=paper_obj.filename,
                        objectives=str(prof.get("objectives") or "Not explicitly established."),
                        methodology=str(prof.get("methodology") or "Not explicitly established."),
                        datasets=str(prof.get("datasets") or "Not explicitly established."),
                        findings=str(prof.get("findings") or "Not explicitly established."),
                        limitations=str(prof.get("limitations") or "Not explicitly established."),
                    )
                )

        # Fallback if LLM missed any paper in profiles list
        for p in papers:
            if not any(prof.paper_id == p.id for prof in profiles_out):
                profiles_out.append(
                    PaperProfileOut(
                        paper_id=p.id,
                        title=p.filename,
                        filename=p.filename,
                        objectives="See individual paper summary.",
                        methodology="Extracted from paper pages.",
                        datasets="Refer to paper content.",
                        findings="Refer to paper key results.",
                        limitations="Refer to limitations.",
                    )
                )

        cross_cites: list[SourceOut] = [
            SourceOut(
                page=h.page_no,
                snippet=" ".join(h.text.split())[:250],
                paper_id=h.paper_id,
                chunk_id=h.chunk_id,
                chunk_index=h.chunk_index,
            )
            for h in all_hits[:8]
        ]

        synthesis = ComparisonSynthesisOut(
            agreements=[str(a) for a in data.get("agreements", []) if isinstance(a, str)],
            disagreements=[str(d) for d in data.get("disagreements", []) if isinstance(d, str)],
            evidence_gaps=[str(g) for g in data.get("evidence_gaps", []) if isinstance(g, str)],
            cross_citations=cross_cites,
        )

        return CompareOut(
            paper_ids=[p.id for p in papers],
            profiles=profiles_out,
            synthesis=synthesis,
            summary=str(data.get("summary") or "Comparative analysis across selected research papers."),
        )

    except (ValueError, KeyError, TypeError) as exc:
        log.exception("Comparison parsing failed")
        raise LlmError("We couldn't generate the comparative analysis. Please try again.") from exc
