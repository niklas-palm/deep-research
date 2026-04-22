"""Read the current OTEL trace/span IDs so scores can target the right observation."""

from opentelemetry import trace


def current_ids() -> tuple[str, str] | None:
    """Return (trace_id_hex, span_id_hex) of the active OTEL span, or None if none active."""
    ctx = trace.get_current_span().get_span_context()
    if not ctx.is_valid:
        return None
    return f"{ctx.trace_id:032x}", f"{ctx.span_id:016x}"
