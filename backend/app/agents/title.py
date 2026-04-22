"""Infer a concise research-project title from the user's query."""

import logging
import os

import boto3

logger = logging.getLogger("deep-research")

_TITLE_MODEL_ID = "global.anthropic.claude-sonnet-4-6"

_TITLE_PROMPT = """You generate concise titles for research projects. Given a research query, reply with ONLY a 3-5 word title capturing the core topic. No quotes, no punctuation at the end.

Query: {query}"""


def _bedrock():
    return boto3.client(
        "bedrock-runtime",
        region_name=os.environ.get("BEDROCK_REGION", "eu-west-1"),
    )


def infer_title(query: str) -> str:
    query = (query or "").strip()
    if not query:
        return "Untitled Research"
    try:
        resp = _bedrock().converse(
            modelId=_TITLE_MODEL_ID,
            messages=[{"role": "user", "content": [{"text": _TITLE_PROMPT.format(query=query)}]}],
            inferenceConfig={"maxTokens": 30},
        )
        title = resp["output"]["message"]["content"][0]["text"].strip().strip('"').strip("'")
        title = title.splitlines()[0].strip().rstrip(".")
        return title or query[:40]
    except Exception as e:
        logger.warning(f"[title] inference failed, falling back to query prefix: {e}")
        return query[:40]
