"""Langfuse v4 client for pushing scores onto existing OTEL traces."""

from functools import lru_cache

from langfuse import Langfuse, get_client


@lru_cache(maxsize=1)
def langfuse_client() -> Langfuse:
    return get_client()
