"""Researcher agent — executes deep research on a specific task."""

import json
import logging
import os

from strands import Agent, tool
from strands.models.bedrock import BedrockModel
from strands_tools import current_time

from .. import storage
from ..evals import trace_context
from .context import project_id_var, researcher_id_var
from .tools import web_fetch, web_search

logger = logging.getLogger("researcher-agent")

RESEARCHER_PROMPT = """You are a research analyst supporting an institutional investment firm. Your task is to thoroughly research one dimension of an investment theme and return findings that a portfolio manager or equity analyst can act on.

# Process
1. Analyze the research task to identify the key questions and angles
2. Create 3-5 targeted search queries covering different aspects
3. Execute searches and identify the most relevant sources
4. Fetch and read the most important sources in full
5. Extract specific facts, data points, quotes, and insights — prioritize numbers and named entities
6. Return your findings as structured YAML

# Guidelines
- Use `current_time` to anchor recency — markets, forecasts, and regulations date quickly
- Use multiple searches from different angles; use parallel tool calls
- Fetch full articles for the most important sources — don't rely on snippets alone
- Cross-reference information across sources; if they conflict, surface it
- **Source prioritization** (use the best available):
  1. Regulators / primary sources — IEA, IMF, BIS, SEC, ESMA, EU Commission, central banks
  2. Company filings — 10-K, 20-F, annual reports, investor presentations
  3. Sell-side and consultancy research — Goldman Sachs, Morgan Stanley, McKinsey, BCG, Bain
  4. Quality financial press — FT, Bloomberg, Reuters, WSJ, The Economist
  5. Trade press and specialist publications
  6. Blogs / lower-tier sources — only when nothing better is available

# What to extract (depending on the task)
- **Market sizing tasks**: specific dollar/euro figures, CAGR%, forecast horizon, the publishing source and year. If multiple analysts quote different sizes, list the range.
- **Key-players tasks**: public companies with tickers in `(EXCH:TICKER)` form (e.g. `Vestas Wind Systems (CPH:VWS)`, `NextEra Energy (NYSE:NEE)`). Note private disruptors separately. Include revenue / market share / market cap where available.
- **Regulatory/ESG tasks**: name the specific regulation or framework (e.g. EU Taxonomy, CSRD, IRA §45V, SFDR) and cite the effective date.
- **Risk tasks**: quantify where possible (default rates, failure rates, historical base rates, scenario impacts).

# Output Format
Return ONLY valid YAML in this structure:

```yaml
topic: "<the research topic>"
summary: "<2-3 sentence summary of findings>"
findings:
  - heading: "<finding category>"
    details: "<detailed findings with specific numbers, company names/tickers, and named regulations where relevant>"
    sources:
      - title: "<source title>"
        url: "<source url>"
  - heading: "<another category>"
    details: "<detailed findings>"
    sources:
      - title: "<source title>"
        url: "<source url>"
market_data:    # OPTIONAL — include only when the task is quantitative (market sizing, growth, penetration)
  - metric: "<e.g. Global green hydrogen market size>"
    value: "<e.g. $4.2B>"
    year: <e.g. 2024>
    cagr: "<e.g. 38% (2024-2030)>"   # optional
    source_url: "<url>"
key_quotes:
  - quote: "<notable quote>"
    attribution: "<who said it, context>"
    source_url: "<url>"
open_questions:   # OPTIONAL — only include if you actively tried to answer a question and could not
  - question: "<the specific question you wanted answered>"
    reason: "<why you couldn't answer — e.g. paywalled source, no recent data, conflicting numbers, topic too new>"
```

# Rules
- Be thorough — use at least 3-5 searches per task
- Always include source URLs for every finding
- Prefer numbers over adjectives, named entities over generic categories
- If sources conflict, note the discrepancy in the details
- Only include `open_questions` for things you actively tried to answer and could not — do not pad with generic "further research needed" boilerplate, and omit the block entirely if you have none
- Return ONLY the YAML block, no other text
"""


def _safe_parse_input(raw) -> dict:
    # Strands streams `input` as partial JSON that's only complete on
    # contentBlockStop — intermediate deltas may fail json.loads.
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(raw) if raw else {}
    except (json.JSONDecodeError, TypeError):
        return {}


@tool
async def researcher(research_task: str) -> str:
    """Execute deep research on a specific task and return findings as YAML.

    This researcher agent searches the web extensively, reads sources,
    and returns structured YAML with findings and references.

    Args:
        research_task: The specific research task to execute

    Returns:
        Structured YAML with research findings, sources, and key quotes
    """
    logger.info(f"Researcher starting: {research_task[:100]}...")

    model = BedrockModel(
        model_id="global.anthropic.claude-haiku-4-5-20251001-v1:0",
        max_tokens=16000,
        region_name=os.environ.get("BEDROCK_REGION", "eu-west-1"),
    )

    agent = Agent(
        name="researcher",
        description="Runs deep web research on a single theme and returns structured YAML.",
        model=model,
        system_prompt=RESEARCHER_PROMPT,
        tools=[web_search, web_fetch, current_time],
        callback_handler=None,
    )

    pid = project_id_var.get()
    researcher_id = storage.start_researcher(pid, research_task) if pid else None
    final_text = ""
    span_id: str | None = None
    token = researcher_id_var.set(researcher_id)

    try:
        async for event in agent.stream_async(
            f"Research the following thoroughly for an institutional investment report:\n\n{research_task}"
        ):
            if not isinstance(event, dict):
                continue

            if span_id is None and pid and researcher_id:
                ids = trace_context.current_ids()
                if ids:
                    span_id = ids[1]
                    storage.set_researcher_span_id(pid, researcher_id, span_id)

            cur = event.get("current_tool_use")
            if cur and cur.get("toolUseId") and researcher_id:
                storage.upsert_tool_use(
                    pid,
                    researcher_id,
                    cur["toolUseId"],
                    cur.get("name", ""),
                    _safe_parse_input(cur.get("input")),
                )

            if "result" in event:
                final_text = str(event["result"])
    finally:
        researcher_id_var.reset(token)
        if researcher_id:
            if final_text:
                storage.set_researcher_findings(pid, researcher_id, final_text)
            storage.complete_researcher(pid, researcher_id)

    logger.info("Researcher completed")
    return final_text
