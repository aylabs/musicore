"""
Integration smoke test: HTTP security headers on production PWA.
Feature 001-pwa-hosting-service — US1 (T006)

Run against production:
    pytest tests/integration/test_pwa_headers.py

Run against a local preview (requires vite preview running):
    BASE_URL=http://localhost:4173 pytest tests/integration/test_pwa_headers.py

Expected result BEFORE migration (GitHub Pages): FAIL — no COEP/COOP headers.
Expected result AFTER migration (Cloudflare Pages): PASS — all assertions green.
"""

import os
import urllib.request
import urllib.error
import pytest

BASE_URL = os.environ.get("BASE_URL", "https://graditone.com").rstrip("/")


def get_headers(path: str) -> dict[str, str]:
    """Fetch HTTP response headers for a given path. Returns lowercase header names."""
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, method="HEAD")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return {k.lower(): v for k, v in resp.headers.items()}
    except urllib.error.HTTPError as e:
        # HEAD not supported — fall back to GET
        req2 = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req2, timeout=10) as resp:
            return {k.lower(): v for k, v in resp.headers.items()}


@pytest.fixture(scope="module")
def root_headers():
    return get_headers("/")


@pytest.fixture(scope="module")
def sw_headers():
    return get_headers("/sw.js")


@pytest.fixture(scope="module")
def asset_headers():
    """Fetch headers for any JS asset in /assets/. Uses index.html to find one."""
    import re
    html_url = f"{BASE_URL}/"
    with urllib.request.urlopen(html_url, timeout=10) as resp:
        html = resp.read().decode("utf-8", errors="replace")
    # Find the first /assets/*.js reference
    match = re.search(r'(/assets/[^"\']+\.js)', html)
    if not match:
        pytest.skip("No /assets/*.js found in index.html — build may be missing")
    return get_headers(match.group(1))


class TestCrossOriginHeaders:
    """COEP and COOP must be present on every page response (SC-002)."""

    def test_coep_header_present(self, root_headers):
        assert "cross-origin-embedder-policy" in root_headers, (
            "COEP header missing — GitHub Pages does not support custom headers. "
            "Migrate to Cloudflare Pages and deploy frontend/public/_headers."
        )

    def test_coep_value(self, root_headers):
        assert root_headers.get("cross-origin-embedder-policy") == "require-corp", (
            f"Expected 'require-corp', got: {root_headers.get('cross-origin-embedder-policy')}"
        )

    def test_coop_header_present(self, root_headers):
        assert "cross-origin-opener-policy" in root_headers, (
            "COOP header missing. Add to frontend/public/_headers and deploy to Cloudflare Pages."
        )

    def test_coop_value(self, root_headers):
        assert root_headers.get("cross-origin-opener-policy") == "same-origin", (
            f"Expected 'same-origin', got: {root_headers.get('cross-origin-opener-policy')}"
        )


class TestServiceWorkerCacheControl:
    """Service worker must not be cached (SW update reliability — SC-003)."""

    def test_sw_cache_control_no_cache(self, sw_headers):
        cc = sw_headers.get("cache-control", "")
        assert "no-cache" in cc, (
            f"Expected 'no-cache' in Cache-Control for /sw.js, got: '{cc}'. "
            "Set in frontend/public/_headers."
        )


class TestAssetCacheControl:
    """Hashed assets must be immutably cached for performance (SC-003)."""

    def test_asset_cache_control_immutable(self, asset_headers):
        cc = asset_headers.get("cache-control", "")
        assert "immutable" in cc, (
            f"Expected 'immutable' in Cache-Control for /assets/* JS, got: '{cc}'. "
            "Set in frontend/public/_headers."
        )

    def test_asset_max_age_one_year(self, asset_headers):
        cc = asset_headers.get("cache-control", "")
        assert "max-age=31536000" in cc, (
            f"Expected max-age=31536000 in Cache-Control for /assets/*, got: '{cc}'."
        )
