"""LLM-as-judge and deterministic evaluators.

Each judge returns `{"value": float|int, "comment": str}`. Pure functions — no
Langfuse side effects here; the runner decides where to post each score.
"""

import asyncio
import json
import logging
import os
import re
from urllib.parse import urlparse

import boto3

logger = logging.getLogger("deep-research")

_JUDGE_MODEL_ID = "global.anthropic.claude-sonnet-4-6"
_MARKDOWN_LINK = re.compile(r"\[[^\]]+\]\(https?://[^)]+\)")
_URL_IN_LINK = re.compile(r"\]\((https?://[^)]+)\)")

# Prefix matches — lets the model vary wording slightly ("Risks & Headwinds" vs "Risks")
# without drifting off the expected thematic investment report skeleton.
_REQUIRED_SECTIONS = [
    "## Investment Thesis",
    "## Market Opportunity",
    "## Industry Structure",
    "## Key Players",
    "## Catalysts",
    "## Risks",
    "## Regulatory",
    "## Investment Implications",
    "## Conclusion",
    "## References",
]


def structure_compliance(report_md: str) -> dict:
    checks = [("starts with `# `", bool(re.match(r"^#\s+\S", report_md)))]
    checks += [(f"has `{s}`", s in report_md) for s in _REQUIRED_SECTIONS]
    checks.append(("has inline citations", bool(_MARKDOWN_LINK.search(report_md))))
    failed = [name for name, ok in checks if not ok]
    return {
        "value": 0 if failed else 1,
        "comment": f"failed: {', '.join(failed)}" if failed else "all checks passed",
    }


def citation_density(report_md: str) -> dict:
    """Ratio of inline citation links to paragraphs. Clamped to [0, 1]."""
    body = re.sub(r"^##\s+References[\s\S]*", "", report_md, flags=re.MULTILINE)
    paragraphs = [
        p for p in re.split(r"\n\s*\n", body)
        if p.strip() and not p.lstrip().startswith("#")
    ]
    if not paragraphs:
        return {"value": 0.0, "comment": "no body paragraphs"}
    links = len(_MARKDOWN_LINK.findall(body))
    density = min(1.0, links / len(paragraphs))
    return {
        "value": round(density, 2),
        "comment": f"{links} inline links across {len(paragraphs)} paragraphs",
    }


def source_diversity(report_md: str) -> dict:
    """Distinct citation hostnames normalized by body size.

    A report that cites the same 3 sources 40 times should score lower than one
    that pulls from 40 different sources. We count unique hostnames (stripping
    `www.`) across the body, then divide by the expected richness for the
    report's length (~1 distinct source per 150 words of prose). Clamped to
    [0, 1].
    """
    body = re.sub(r"^##\s+References[\s\S]*", "", report_md, flags=re.MULTILINE)
    words = len(body.split())
    if words == 0:
        return {"value": 0.0, "comment": "empty body"}

    hosts: set[str] = set()
    for url in _URL_IN_LINK.findall(body):
        host = urlparse(url).hostname or ""
        if host.startswith("www."):
            host = host[4:]
        if host:
            hosts.add(host)

    if not hosts:
        return {"value": 0.0, "comment": "no inline citations"}

    expected = max(1, words // 150)
    score = min(1.0, len(hosts) / expected)
    return {
        "value": round(score, 2),
        "comment": f"{len(hosts)} distinct sources across {words} words",
    }


_CURRENCY_AMOUNT = re.compile(
    r"[\$€£¥]\s?\d[\d.,]*\s?(?:thousand|million|billion|trillion|K|M|B|T)?\b",
    re.IGNORECASE,
)
_PERCENTAGE = re.compile(r"\b\d+(?:\.\d+)?\s?%")
_YEAR_REF = re.compile(r"\b20[0-3]\d\b")
_TICKER = re.compile(r"\([A-Z]{2,6}:[A-Z.]{1,6}\)")


def data_specificity(report_md: str) -> dict:
    """Density of concrete data points (currency amounts, percentages, years, tickers)
    per ~200 words of body prose. Clamped to [0, 1].

    Thematic investment memos live or die on specifics — this catches reports that
    read like prose essays instead of numbers-backed analysis."""
    body = re.sub(r"^##\s+References[\s\S]*", "", report_md, flags=re.MULTILINE)
    words = len(body.split())
    if words == 0:
        return {"value": 0.0, "comment": "empty body"}

    amounts = len(_CURRENCY_AMOUNT.findall(body))
    pcts = len(_PERCENTAGE.findall(body))
    years = len(_YEAR_REF.findall(body))
    tickers = len(_TICKER.findall(body))
    total = amounts + pcts + years + tickers

    score = min(1.0, total / (words / 200))
    return {
        "value": round(score, 2),
        "comment": (
            f"{amounts} currency amounts, {pcts} percentages, "
            f"{tickers} tickers, {years} year refs across {words} words"
        ),
    }


_PLAN_JUDGE_PROMPT = """You are an evaluator scoring a research plan for an institutional thematic investment report.

The orchestrator delegated these research subtasks:
{tasks}

Score the plan 1-5 on how well the tasks cover the dimensions required for an institutional thematic investment report:
market sizing, industry structure & value chain, key players, catalysts, risks/headwinds, regulatory/ESG, investment implications.

- 5 = covers all or nearly all dimensions with complementary, non-overlapping tasks
- 3 = covers some dimensions but misses 2-3 key ones, or has noticeable overlap
- 1 = missing most dimensions, heavily overlapping, or off-topic for an investment report

Respond with ONLY a JSON object: {{"score": <1-5>, "reason": "<one sentence>"}}"""


_RESEARCH_JUDGE_PROMPT = """You are an evaluator scoring the output of a single research agent working for an institutional investment firm.

Task given to the agent:
{task}

Agent's YAML findings:
{findings}

Score 1-5 on usefulness to a portfolio manager or equity analyst:
- Specificity: concrete numbers with units/years, named companies with tickers where public, named regulations
- Source quality: regulators/primary (IEA, IMF, BIS, SEC, ESMA) > company filings (10-K, 20-F) > sell-side/consultancy > financial press > blogs
- Balance: both opportunity and risk surfaced; bull and bear views where relevant

- 5 = rich, specific, authoritative sources, balanced — PM-ready
- 3 = adequate but thin on numbers, missing tickers, or heavy on one side
- 1 = shallow, unsourced, generic, or unusable for an investment memo

Respond with ONLY a JSON object: {{"score": <1-5>, "reason": "<one sentence>"}}"""


def _bedrock():
    return boto3.client(
        "bedrock-runtime",
        region_name=os.environ.get("BEDROCK_REGION", "eu-west-1"),
    )


_SCORE_FALLBACK = re.compile(r'"score"\s*:\s*(\d+)')
_REASON_FALLBACK = re.compile(r'"reason"\s*:\s*"([^"]*)"?')


def _call_bedrock(prompt: str) -> dict:
    resp = _bedrock().converse(
        modelId=_JUDGE_MODEL_ID,
        messages=[{"role": "user", "content": [{"text": prompt}]}],
        inferenceConfig={"maxTokens": 400},
    )
    text = resp["output"]["message"]["content"][0]["text"].strip()
    # Some runs wrap the JSON in ```json fences
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Truncated output (usually maxTokens) — extract what we can so the judge
        # still returns a usable score instead of a hard failure.
        score_match = _SCORE_FALLBACK.search(text)
        reason_match = _REASON_FALLBACK.search(text)
        if not score_match:
            raise
        return {
            "score": int(score_match.group(1)),
            "reason": (reason_match.group(1) if reason_match else "truncated output"),
        }


async def _judge(prompt: str, judge_name: str) -> dict:
    try:
        result = await asyncio.to_thread(_call_bedrock, prompt)
        score = int(result.get("score", 0))
        reason = str(result.get("reason") or result.get("comment") or "no reason provided")
        return {"value": score, "comment": reason}
    except Exception as e:
        logger.warning(f"{judge_name} judge failed: {e}")
        return {"value": 0, "comment": f"judge error: {e}"}


async def plan_quality(researcher_tasks: list[str]) -> dict:
    if not researcher_tasks:
        return {"value": 1, "comment": "no researchers were spawned"}
    prompt = _PLAN_JUDGE_PROMPT.format(tasks="\n".join(f"- {t}" for t in researcher_tasks))
    return await _judge(prompt, "plan_quality")


async def research_quality(task: str, findings_yaml: str) -> dict:
    if not findings_yaml.strip():
        return {"value": 1, "comment": "researcher produced no findings"}
    prompt = _RESEARCH_JUDGE_PROMPT.format(task=task, findings=findings_yaml[:6000])
    return await _judge(prompt, "research_quality")
