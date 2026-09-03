"""
Playwright Browser Lifecycle and Resource Optimization Manager.
Manages singleton Chromium instance, ephemeral context pooling, aggressive
resource route blocking (analytics, ads, web fonts, media), and generation recycling.
"""
import asyncio
from typing import Optional, List, Set
from playwright.async_api import async_playwright, Playwright, Browser, BrowserContext, Page

BLOCKED_RESOURCE_TYPES: Set[str] = {"media", "font", "websocket"}

BLOCKED_DOMAINS: List[str] = [
    "google-analytics.com",
    "googletagmanager.com",
    "facebook.net",
    "connect.facebook.net",
    "criteo.com",
    "hotjar.com",
    "clarity.ms",
    "kakao.com/sdk",
    "kakaocdn.net/channel",
    "wcs.naver.net",
    "talk.naver.com",
    "toast.com",
    "channel.io",
    "channeltalk",
    "klaviyo.com",
    "static.klaviyo.com",
    "cdn.jsdelivr.net/npm/sweetalert",
    "tiktok.com",
    "snap.licdn.com"
]

CHROMIUM_LAUNCH_ARGS: List[str] = [
    "--disable-blink-features=AutomationControlled",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-breakpad",
    "--disable-component-update",
    "--mute-audio",
    "--blink-settings=imagesEnabled=true"
]

class BrowserManager:
    """
    Singleton Browser Manager with ephemeral context factory and generation recycling.
    """
    _instance: Optional['BrowserManager'] = None
    _lock = asyncio.Lock()

    def __init__(self, max_pages_before_recycle: int = 100):
        self.max_pages_before_recycle = max_pages_before_recycle
        self.playwright: Optional[Playwright] = None
        self.browser: Optional[Browser] = None
        self.pages_crawled: int = 0
        self.is_running: bool = False

    @classmethod
    async def get_instance(cls, max_pages_before_recycle: int = 100) -> 'BrowserManager':
        async with cls._lock:
            if cls._instance is None:
                cls._instance = cls(max_pages_before_recycle=max_pages_before_recycle)
            return cls._instance

    async def _ensure_browser(self) -> Browser:
        if self.browser is not None and self.browser.is_connected():
            if self.pages_crawled >= self.max_pages_before_recycle:
                await self.recycle()
            else:
                return self.browser

        if self.playwright is None:
            self.playwright = await async_playwright().start()

        self.browser = await self.playwright.chromium.launch(
            headless=True,
            args=CHROMIUM_LAUNCH_ARGS
        )
        self.is_running = True
        return self.browser

    async def setup_route_interception(self, context: BrowserContext) -> None:
        """Route interception to block non-essential media, fonts, and tracking scripts."""
        async def intercept_route(route):
            req = route.request
            if req.resource_type in BLOCKED_RESOURCE_TYPES:
                await route.abort()
                return
            
            url_lower = req.url.lower()
            if any(d in url_lower for d in BLOCKED_DOMAINS):
                await route.abort()
                return
                
            await route.continue_()

        await context.route("**/*", intercept_route)

    async def new_context(
        self,
        viewport_width: int = 1920,
        viewport_height: int = 1080,
        user_agent: Optional[str] = None,
        locale: str = "ko-KR",
        enable_route_blocking: bool = True
    ) -> BrowserContext:
        """Create an ephemeral, isolated browser context with blocked tracker routes."""
        browser = await self._ensure_browser()
        ua = user_agent or (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
        )
        context = await browser.new_context(
            viewport={"width": viewport_width, "height": viewport_height},
            user_agent=ua,
            locale=locale,
            extra_http_headers={
                "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"
            }
        )
        if enable_route_blocking:
            await self.setup_route_interception(context)
        return context

    async def new_page(self, context: Optional[BrowserContext] = None) -> Page:
        """Helper to create a new page and track crawler generation count."""
        if context is None:
            context = await self.new_context()
        page = await context.new_page()
        self.pages_crawled += 1
        return page

    async def recycle(self) -> None:
        """Recycle the Chromium process to reclaim memory and reset internal state."""
        if self.browser is not None:
            try:
                await self.browser.close()
            except Exception:
                pass
            self.browser = None
        self.pages_crawled = 0

    async def close(self) -> None:
        """Clean shutdown of browser and playwright instances."""
        if self.browser is not None:
            try:
                await self.browser.close()
            except Exception:
                pass
            self.browser = None

        if self.playwright is not None:
            try:
                await self.playwright.stop()
            except Exception:
                pass
            self.playwright = None

        self.is_running = False
        self.pages_crawled = 0
