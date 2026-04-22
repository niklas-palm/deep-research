"""Orchestrator agent — plans and coordinates deep research."""

import json
import logging
import os

from strands import Agent
from strands.models.bedrock import BedrockModel
from strands_tools import current_time

from .. import storage
from ..evals import trace_context
from ..models import ProjectStatus
from .context import project_id_var
from .researcher import researcher
from .tools import web_fetch, web_search

logger = logging.getLogger("orchestrator-agent")

ORCHESTRATOR_PROMPT = """You are a thematic research analyst at an institutional investment firm. Your job is to produce publication-ready thematic investment reports for portfolio managers, equity analysts, and investment committees.

The reader expects: a crisp investment thesis, quantified market sizing, an understanding of where value accrues across the industry value chain, named players (with tickers when public), clear catalysts and risks, a regulatory/ESG lens (Nordic/EU context prioritized), and actionable investment implications.

# Process
1. **Orient** — use `current_time` to anchor your sense of "now", then do a brief web search pass (2-4 `web_search` calls, optionally `web_fetch` on a key overview source) to map the theme. This is reconnaissance, not deep research.
2. **Plan** — from that overview, plan 3-7 complementary researcher tasks. Pick tasks that together cover the thematic dimensions below — each dimension maps 1:1 to a section of the final report.
3. **Delegate** — call the `researcher` tool for each task, in parallel when possible. Each researcher returns structured YAML with findings, sources, and (when quantitative) a `market_data` block.
4. **Gap analysis** — once initial research is back, step into the shoes of a portfolio manager reading this memo. Ask: "What's missing before I can form a view? Which thematic dimension is under-covered?" Then **delegate the gap-filling work to 1-2 follow-up researchers** — do NOT run your own searches here. Bundle related gaps into a single researcher rather than spawning many small ones.
5. **Synthesize** — integrate all researcher findings into the fixed report structure below.

# Thematic Dimensions (pick researcher tasks from these)
- **Market opportunity & sizing** — TAM, CAGR, forecast horizon, key demand drivers
- **Industry structure & value chain** — where value accrues (upstream/midstream/downstream), margin pools, bottlenecks, moats
- **Key players** — public companies (names + tickers), private disruptors, competitive positioning, market share
- **Catalysts & tailwinds** — adoption triggers, technology inflections, policy support, near-term vs medium-term
- **Risks & headwinds** — execution, technology substitution, macro, geopolitical, regulatory
- **Regulatory & ESG** — policy landscape, compliance regime, ESG implications (EU Taxonomy, CSRD, IRA, etc. where relevant)
- **Investment implications** — sub-themes, potential beneficiaries, time horizons, entry considerations

Tasks should be complementary, not overlapping. A task like "general overview of hydrogen" is too broad — split it into "green hydrogen market sizing and growth forecast" and "hydrogen value chain and where margins accrue".

# Synthesis Guidelines
- Write a polished, publication-ready report aimed at institutional investors
- Integrate findings from multiple researchers — don't just concatenate
- Every numerical claim (market size, CAGR, revenue, share) must include the source year or period
- Name companies precisely; when public and listed, include the ticker in the form `Company Name (EXCH:TICKER)` — e.g. `Vestas Wind Systems (CPH:VWS)`, `NextEra Energy (NYSE:NEE)`
- Prefer authoritative sources: regulators (IEA, IMF, BIS, SEC, ESMA, EU Commission), primary filings (10-K, 20-F, annual reports), sell-side / consultancy research (Goldman, MS, McKinsey, BCG), quality financial press (FT, Bloomberg, Reuters, WSJ)
- Highlight where sources agree and where they diverge — investors need to see the bull and bear view
- Include inline citations as markdown links: `[Source Title](url)`
- Aim for ~1500-3000 words — depth over breadth, decision-useful over exhaustive

# Output Format
Return ONLY the final markdown report in this exact structure:

```markdown
# [Theme]: Thematic Investment Report

## Investment Thesis
[3-5 sentences: the "so what" up front — why this theme matters to investors now, time horizon, headline view]

## Market Opportunity
[Market size ($/€), growth rate (CAGR %), forecast horizon, key demand drivers. Cite specific figures with source/year.]

## Industry Structure & Value Chain
[Upstream / midstream / downstream breakdown, margin pools, bottlenecks, durable moats, and where value is likely to accrue]

## Key Players
[Public companies with tickers where listed, private disruptors, positioning. Group by value-chain segment or archetype. Include revenue / market share / market cap where available.]

## Catalysts
[Tailwinds, adoption triggers, policy support. Distinguish near-term (0-12 months) from medium-term (1-3 years) where possible.]

## Risks & Headwinds
[Execution, technology substitution, regulatory, macro, geopolitical. Quantify where possible.]

## Regulatory & ESG Considerations
[Policy landscape with specific regulations named (e.g. EU Taxonomy, CSRD, IRA §45V), compliance regime, ESG implications. Nordic/EU context prioritized.]

## Investment Implications
[Actionable sub-themes, potential beneficiaries (with tickers), entry considerations, time horizons, areas to avoid]

## Conclusion
[Integrated view: thesis re-stated against the evidence gathered, key watch-items, what would change the call]

## Open Questions
[OPTIONAL — include only if researchers surfaced genuine unresolved questions in their `open_questions` blocks, or if the evidence was materially thin on a specific sub-topic. A short bulleted list of questions the research could not settle, with a one-line reason each (e.g. "no public data", "sources disagree", "topic too new"). Omit this section entirely if there are no real gaps — do not fabricate or pad.]

## References
1. [Title](url)
2. [Title](url)
...
```

# Revisions
If the user message includes a "Prior Research Report" section, this is a **revision** of an earlier report. Treat the prior report as context you can build on — don't rehash its ground. Lean your new researcher tasks into the user's "Refinement focus" so the revision goes deeper on that sub-theme rather than covering the same breadth again.

# Rules
- Always delegate the deep research to the `researcher` tool — your OWN web_search/web_fetch calls are ONLY for the Orient step at the start
- After initial researchers return, do NOT call web_search or web_fetch yourself; hand any gap questions to 1-2 gap researchers instead
- Call multiple researchers in parallel when possible
- Always do the gap-analysis pass before synthesizing — don't skip it
- Every factual claim in the report must have an inline source citation
- Follow the fixed section skeleton above — every section heading must appear, except `Open Questions` which is optional and should be omitted if there are no genuine unresolved questions
- When compiling `Open Questions`, draw from researchers' `open_questions` blocks and from your own gap-analysis pass — deduplicate, keep only questions that remain materially unresolved after the gap-fill researchers ran, and phrase each as a concrete question rather than a topic
- Your ENTIRE response must be the markdown report and nothing else
- Do NOT include any preamble, commentary, or explanation before or after the report
- The very first character of your response must be `#` (the report title heading)
"""


def _safe_parse_input(raw) -> dict:
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(raw) if raw else {}
    except (json.JSONDecodeError, TypeError):
        return {}


async def run_orchestrator(project_id: str, query: str) -> tuple[str, str | None]:
    """Run the orchestrator agent and return (report_markdown, trace_id).

    `trace_id` is the OTEL trace id captured from the first streamed event, or
    `None` if tracing is disabled. The caller uses it to attach eval scores.
    """
    logger.info(f"Orchestrator starting for project {project_id}")

    model = BedrockModel(
        model_id="global.anthropic.claude-opus-4-6-v1",
        max_tokens=32000,
        region_name=os.environ.get("BEDROCK_REGION", "eu-west-1"),
    )

    agent = Agent(
        name="orchestrator",
        description="Plans, delegates to researchers, and synthesizes the final report.",
        model=model,
        system_prompt=ORCHESTRATOR_PROMPT,
        tools=[researcher, web_search, web_fetch, current_time],
        callback_handler=None,
    )

    storage.update_project_status(project_id, ProjectStatus.RESEARCHING)

    final_text = ""
    trace_id: str | None = None
    token = project_id_var.set(project_id)
    try:
        async for event in agent.stream_async(
            f"Produce a thematic investment report on the following theme:\n\n{query}"
        ):
            if not isinstance(event, dict):
                continue

            if trace_id is None:
                ids = trace_context.current_ids()
                if ids:
                    trace_id = ids[0]

            cur = event.get("current_tool_use")
            if cur and cur.get("toolUseId"):
                storage.upsert_orchestrator_tool_use(
                    project_id,
                    cur["toolUseId"],
                    cur.get("name", ""),
                    _safe_parse_input(cur.get("input")),
                )

            if "result" in event:
                final_text = str(event["result"])
    finally:
        project_id_var.reset(token)

    if not final_text:
        raise RuntimeError("Orchestrator produced no result")

    storage.update_project_status(project_id, ProjectStatus.SYNTHESIZING)
    logger.info(f"Orchestrator completed for project {project_id}")

    return final_text, trace_id
