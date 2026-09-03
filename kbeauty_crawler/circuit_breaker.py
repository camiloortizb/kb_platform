"""
Domain Circuit Breaker for K-Beauty Crawler Engine.
Implements a 3-state circuit breaker (CLOSED, OPEN, HALF_OPEN)
to prevent crawler stalls on broken, dead, or rate-limited stores.
"""
import time
import asyncio
from enum import Enum
from typing import Dict, Optional, Any
from urllib.parse import urlparse

class CircuitState(str, Enum):
    CLOSED = "CLOSED"        # Normal operations
    OPEN = "OPEN"            # Fast-fail all requests
    HALF_OPEN = "HALF_OPEN"  # Trial probe in progress

class CircuitBreakerOpenException(Exception):
    """Raised when an operation is attempted on an OPEN circuit."""
    def __init__(self, domain: str, opened_at: float, cooldown_seconds: float):
        self.domain = domain
        self.opened_at = opened_at
        self.cooldown_seconds = cooldown_seconds
        remaining = max(0.0, (opened_at + cooldown_seconds) - time.time())
        super().__init__(f"Circuit for domain '{domain}' is OPEN. Cooldown remaining: {remaining:.1f}s")

class DomainMetrics:
    def __init__(self):
        self.state: CircuitState = CircuitState.CLOSED
        self.consecutive_failures: int = 0
        self.total_failures: int = 0
        self.total_successes: int = 0
        self.opened_at: Optional[float] = None
        self.last_status_code: Optional[int] = None
        self.last_error: Optional[str] = None

class DomainCircuitBreaker:
    """
    3-State Domain Circuit Breaker.
    - CLOSED: normal execution.
    - OPEN: fast-fail if failures >= failure_threshold or status in (403, 503).
    - HALF_OPEN: after cooldown_seconds, allows 1 trial probe request.
    """
    def __init__(self, failure_threshold: int = 3, cooldown_seconds: float = 60.0):
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self._domains: Dict[str, DomainMetrics] = {}
        self._lock = asyncio.Lock()

    def _normalize_domain(self, domain_or_url: str) -> str:
        domain_or_url = domain_or_url.strip()
        if not domain_or_url:
            return "default"
        if "://" in domain_or_url:
            parsed = urlparse(domain_or_url)
            return parsed.netloc.lower() or "default"
        return domain_or_url.split("/")[0].lower()

    def get_metrics(self, domain_or_url: str) -> DomainMetrics:
        domain = self._normalize_domain(domain_or_url)
        if domain not in self._domains:
            self._domains[domain] = DomainMetrics()
        return self._domains[domain]

    def get_state(self, domain_or_url: str) -> CircuitState:
        metrics = self.get_metrics(domain_or_url)
        if metrics.state == CircuitState.OPEN:
            if metrics.opened_at is not None and (time.time() - metrics.opened_at) >= self.cooldown_seconds:
                metrics.state = CircuitState.HALF_OPEN
        return metrics.state

    def can_execute(self, domain_or_url: str) -> bool:
        state = self.get_state(domain_or_url)
        return state in (CircuitState.CLOSED, CircuitState.HALF_OPEN)

    def record_success(self, domain_or_url: str) -> None:
        metrics = self.get_metrics(domain_or_url)
        metrics.state = CircuitState.CLOSED
        metrics.consecutive_failures = 0
        metrics.total_successes += 1
        metrics.opened_at = None
        metrics.last_error = None

    def record_failure(
        self,
        domain_or_url: str,
        status_code: Optional[int] = None,
        error: Optional[Any] = None
    ) -> None:
        metrics = self.get_metrics(domain_or_url)
        metrics.consecutive_failures += 1
        metrics.total_failures += 1
        metrics.last_status_code = status_code
        if error is not None:
            metrics.last_error = str(error)

        is_hard_block = status_code in (403, 503)
        if is_hard_block or metrics.consecutive_failures >= self.failure_threshold:
            metrics.state = CircuitState.OPEN
            metrics.opened_at = time.time()

    def reset(self, domain_or_url: Optional[str] = None) -> None:
        if domain_or_url:
            domain = self._normalize_domain(domain_or_url)
            if domain in self._domains:
                del self._domains[domain]
        else:
            self._domains.clear()
