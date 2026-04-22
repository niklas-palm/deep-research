"""Web search and fetch tools for research agents."""

import logging
import os
from collections import OrderedDict
from threading import Lock

import requests
from strands import tool

from .. import storage
from .context import project_id_var, researcher_id_var

logger = logging.getLogger("research-tools")

SEARXNG_URL = os.environ.get("SEARXNG_URL", "http://searxng:8080")
JINA_READER_URL = "https://r.jina.ai"

_FETCH_CACHE_MAX = 128
_fetch_cache: "OrderedDict[str, str]" = OrderedDict()
_fetch_cache_lock = Lock()


@tool
def web_search(query: str, max_results: int = 10) -> str:
    """Search the web via a local SearXNG meta-search instance.

    Args:
        query: The search query
        max_results: Maximum number of results to return (default: 10)

    Returns:
        Formatted search results with titles, URLs, and snippets
    """
    logger.info(f"Searching: {query}")

    try:
        response = requests.get(
            f"{SEARXNG_URL}/search",
            params={"q": query, "format": "json"},
            timeout=15,
        )
        response.raise_for_status()
        results = response.json().get("results", [])[:max_results]

        if not results:
            return f"No results found for: {query}"

        formatted = [
            f"[{i}] {r.get('title', 'No title')}\n"
            f"URL: {r.get('url', 'No URL')}\n"
            f"Snippet: {r.get('content', 'No snippet')}\n"
            for i, r in enumerate(results, 1)
        ]
        return f"Search results for '{query}':\n\n" + "\n".join(formatted)

    except requests.RequestException as e:
        logger.error(f"Search failed for '{query}': {e}")
        return f"Search failed: {e}"


@tool
def web_fetch(url: str) -> str:
    """Fetch a webpage and convert it to clean markdown using Jina AI Reader.

    Args:
        url: The URL to fetch

    Returns:
        Markdown-formatted content of the webpage
    """
    with _fetch_cache_lock:
        cached = _fetch_cache.get(url)
        if cached is not None:
            _fetch_cache.move_to_end(url)
            logger.info(f"Cache hit: {url}")
            return cached

    logger.info(f"Fetching: {url}")

    try:
        response = requests.get(
            f"{JINA_READER_URL}/{url}",
            headers={"User-Agent": "Mozilla/5.0 (compatible; DeepResearch/1.0)"},
            timeout=30,
        )

        if response.status_code == 422:
            return f"Unable to fetch {url} — may be paywalled or blocked."

        response.raise_for_status()
        content = response.text

        if len(content.strip()) < 100:
            return f"No meaningful content from {url}"

        with _fetch_cache_lock:
            _fetch_cache[url] = content
            _fetch_cache.move_to_end(url)
            if len(_fetch_cache) > _FETCH_CACHE_MAX:
                _fetch_cache.popitem(last=False)

        return content

    except requests.HTTPError as e:
        logger.warning(f"HTTP error fetching {url}: {e}")
        if e.response.status_code == 429:
            pid, rid = project_id_var.get(), researcher_id_var.get()
            logger.info(f"429 detected for {url} — pid={pid} rid={rid}")
            if pid and rid:
                storage.increment_rate_limited(pid, rid)
        return f"Failed to fetch {url}: HTTP {e.response.status_code}"
    except requests.RequestException as e:
        logger.error(f"Network error fetching {url}: {e}")
        return f"Failed to fetch {url}: network error"
