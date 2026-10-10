import logging
from functools import lru_cache

from google import genai
from google.genai import types
from google.genai.errors import APIError, ClientError, ServerError

log = logging.getLogger(__name__)


class LlmError(Exception):
    """A problem with the AI service that is safe to show to the user."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


@lru_cache(maxsize=2)
def _client(api_key: str) -> genai.Client:
    return genai.Client(api_key=api_key)


def generate(settings, system: str, prompt: str, json_mode: bool = False) -> str:
    if not settings.gemini_api_key:
        raise LlmError(
            "The AI service isn't configured. Add GEMINI_API_KEY to the backend .env file."
        )
    config = types.GenerateContentConfig(
        system_instruction=system,
        temperature=0.2,
        response_mime_type="application/json" if json_mode else None,
    )
    import time

    last_exc = None
    response = None
    attempts = max(1, int(getattr(settings, "llm_max_retries", 1)) + 1)
    for attempt in range(attempts):
        try:
            response = _client(settings.gemini_api_key).models.generate_content(
                model=settings.gemini_model, contents=prompt, config=config
            )
            last_exc = None
            break
        except Exception as exc:
            last_exc = exc
            log.warning("Gemini request attempt %d failed: %s", attempt + 1, type(exc).__name__)

            if isinstance(exc, ClientError):
                log.error("Permanent client error detected, not retrying: code=%s", getattr(exc, "code", "unknown"))
                break
            elif isinstance(exc, ServerError):
                if attempt < attempts - 1:
                    time.sleep(1.5 * (attempt + 1))
            else:
                if attempt < attempts - 1:
                    time.sleep(1.5 * (attempt + 1))

    if last_exc is not None or response is None:
        log.error("Gemini request failed after %d attempt(s)", attempts)

        if isinstance(last_exc, APIError):
            log.error("Gemini API error details: code=%s, status=%s, message=%s",
                     last_exc.code, last_exc.status, last_exc.message)

        if isinstance(last_exc, ClientError):
            if last_exc.code == 401:
                raise LlmError(
                    "AI service authentication failed. Please check the GEMINI_API_KEY in your .env file."
                ) from last_exc
            elif last_exc.code == 403:
                raise LlmError(
                    "AI service permission denied. Your API key may not have access to this model."
                ) from last_exc
            elif last_exc.code == 404:
                raise LlmError(
                    f"The configured AI model '{settings.gemini_model}' was not found. "
                    "Please check GEMINI_MODEL in your .env file."
                ) from last_exc
            elif last_exc.code == 429:
                raise LlmError(
                    "AI service quota exceeded (free-tier limit). Please try again later or upgrade your plan."
                ) from last_exc
            else:
                raise LlmError(
                    f"AI service request failed (HTTP {last_exc.code}). Please try again."
                ) from last_exc
        elif isinstance(last_exc, ServerError):
            raise LlmError(
                "AI service is temporarily unavailable. Please try again in a moment."
            ) from last_exc
        else:
            raise LlmError("The AI service couldn't answer right now. Please try again.") from last_exc
    try:
        text = (response.text or "").strip()
    except Exception:
        text = ""
    if not text:
        raise LlmError("The AI service returned an empty answer. Please try again.")
    return text
