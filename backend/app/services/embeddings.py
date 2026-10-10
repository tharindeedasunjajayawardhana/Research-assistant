"""Generate text embeddings for semantic search.

Default model: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
- Dimensions: 384 (compatible with the existing pgvector / JSON column)
- Documented coverage: ~50 languages, including English, Japanese, Chinese,
  Spanish, French, and German. Sinhala is not documented.
- Cross-lingual retrieval: supported among documented languages because queries
  and documents share one multilingual vector space.

The previous default was BAAI/bge-small-en-v1.5 (English, 384-d). Existing
papers must be reprocessed so chunks are embedded with the new model. Dimensions
are unchanged, so no vector-schema migration is required.
"""

from functools import lru_cache

from fastembed import TextEmbedding

from ..config import get_settings

DEFAULT_MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
EMBEDDING_DIMENSIONS = 384


def configured_model_name() -> str:
    try:
        return get_settings().embedding_model or DEFAULT_MODEL_NAME
    except Exception:
        return DEFAULT_MODEL_NAME


@lru_cache(maxsize=2)
def get_embedding_model(model_name: str | None = None) -> TextEmbedding:
    """Load the embedding model once and reuse it."""
    return TextEmbedding(model_name=model_name or configured_model_name())


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Generate one 384-dimensional embedding for each input text."""
    if not texts:
        return []

    model = get_embedding_model()
    embeddings = model.embed(texts)
    vectors = [embedding.tolist() for embedding in embeddings]
    for vector in vectors:
        if len(vector) != EMBEDDING_DIMENSIONS:
            raise RuntimeError(
                f"Embedding dimension {len(vector)} does not match schema "
                f"({EMBEDDING_DIMENSIONS}). Choose a 384-d model or add a migration."
            )
    return vectors


def embed_query(query: str) -> list[float]:
    """Generate an embedding for a search query."""
    return embed_texts([query])[0]
