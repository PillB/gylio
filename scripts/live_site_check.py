#!/usr/bin/env python3
"""Live, dependency-free production validator for GYLIO GitHub Pages.

This intentionally uses Python's standard library so it can run on a clean
GitHub Actions runner. It validates facts present in the public static artifact:
HTTP reachability, app-shell/deep-link fallback, same-origin assets, standalone
Deployment Academy structure, and key response metadata. React-rendered UI and
user flows belong to the companion Playwright live audit.
"""
from __future__ import annotations

import argparse
import json
import re
import ssl
import sys
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

USER_AGENT = "GYLIO-Live-Validator/1.1 (+https://github.com/PillB/gylio)"


class DocumentParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.links: list[str] = []
        self.scripts: list[str] = []
        self.stylesheets: list[str] = []
        self.metas: list[dict[str, str]] = []
        self.html_attrs: dict[str, str] = {}
        self.h1_count = 0
        self.step_count = 0
        self.checkbox_count = 0

    def handle_starttag(self, tag: str, attrs) -> None:
        data = {k: (v or "") for k, v in attrs}
        if tag == "html":
            self.html_attrs = data
        if "id" in data:
            self.ids.append(data["id"])
        if tag == "a" and data.get("href"):
            self.links.append(data["href"])
        if tag == "script" and data.get("src"):
            self.scripts.append(data["src"])
        if tag == "link" and data.get("rel") == "stylesheet" and data.get("href"):
            self.stylesheets.append(data["href"])
        if tag == "meta":
            self.metas.append(data)
        if tag == "h1":
            self.h1_count += 1
        if data.get("data-step"):
            self.step_count += 1
        if tag == "input" and data.get("type", "").lower() == "checkbox":
            self.checkbox_count += 1


def request(url: str, *, attempts: int = 5) -> tuple[int, dict[str, str], bytes]:
    ctx = ssl.create_default_context()
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        req = Request(url, headers={"User-Agent": USER_AGENT, "Cache-Control": "no-cache"})
        try:
            with urlopen(req, timeout=25, context=ctx) as response:
                return response.status, dict(response.headers.items()), response.read()
        except HTTPError as exc:
            # GitHub Pages deep SPA paths commonly return the custom 404 body
            # with HTTP 404; preserve the body so we can validate the fallback.
            return exc.code, dict(exc.headers.items()), exc.read()
        except (URLError, TimeoutError, OSError) as exc:
            last_error = exc
            if attempt < attempts:
                time.sleep(attempt * 2)
    raise RuntimeError(f"Unable to fetch {url}: {last_error}")


def parse(html: str) -> DocumentParser:
    parser = DocumentParser()
    parser.feed(html)
    return parser


def meta_content(doc: DocumentParser, name: str) -> str | None:
    for meta in doc.metas:
        if meta.get("name") == name:
            return meta.get("content")
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="https://pillb.github.io/gylio/")
    ap.add_argument("--report", default="artifacts/live-python-report.json")
    args = ap.parse_args()

    base = args.base if args.base.endswith("/") else args.base + "/"
    origin = f"{urlparse(base).scheme}://{urlparse(base).netloc}"
    checks: list[dict[str, object]] = []

    def check(name: str, ok: bool, detail: object) -> None:
        checks.append({"name": name, "ok": bool(ok), "detail": detail})
        print(f"{'PASS' if ok else 'FAIL'} | {name} | {detail}")

    # 1) Public static app shell. Runtime footer/navigation assertions live in
    # Playwright because React renders them after this HTML is downloaded.
    root_status, root_headers, root_bytes = request(base)
    root = root_bytes.decode("utf-8", errors="replace")
    root_doc = parse(root)
    check("root_http_200", root_status == 200, root_status)
    check("root_html_content_type", "text/html" in root_headers.get("Content-Type", ""), root_headers.get("Content-Type"))
    check("root_mount_exists", 'id="root"' in root, "#root")
    check("root_asset_references_present", bool(root_doc.scripts), {"scripts": root_doc.scripts, "stylesheets": root_doc.stylesheets})
    check("root_language_declared", bool(root_doc.html_attrs.get("lang")), root_doc.html_attrs.get("lang"))
    check("root_viewport_meta", meta_content(root_doc, "viewport") is not None, meta_content(root_doc, "viewport"))

    # 2) Same-origin built assets referenced by the public shell.
    asset_refs = root_doc.scripts + root_doc.stylesheets
    asset_results: list[dict[str, object]] = []
    for ref in asset_refs:
        url = urljoin(base, ref)
        if urlparse(url).netloc != urlparse(origin).netloc:
            continue
        status, headers, body = request(url)
        asset_results.append({"url": url, "status": status, "bytes": len(body), "content_type": headers.get("Content-Type")})
    check("same_origin_assets_exist", bool(asset_results) and all(x["status"] == 200 and x["bytes"] > 0 for x in asset_results), asset_results)

    # 3) BrowserRouter direct-link fallback. GitHub Pages may return HTTP 404
    # while serving dist/404.html; the body must still contain the app shell.
    deep_results = []
    for route in ("tasks", "calendar", "budget", "settings", "pricing"):
        status, _headers, body = request(urljoin(base, route))
        text = body.decode("utf-8", errors="replace")
        shell_ok = 'id="root"' in text and "assets/" in text
        deep_results.append({"route": route, "status": status, "app_shell": shell_ok})
    check("deep_link_fallback_serves_app_shell", all(x["app_shell"] and x["status"] in (200, 404) for x in deep_results), deep_results)

    # 4) Standalone Production Deployment Academy.
    guide_url = urljoin(base, "deployment-guide.html")
    guide_status, guide_headers, guide_bytes = request(guide_url)
    guide = guide_bytes.decode("utf-8", errors="replace")
    guide_doc = parse(guide)
    check("guide_http_200", guide_status == 200, guide_status)
    check("guide_html_content_type", "text/html" in guide_headers.get("Content-Type", ""), guide_headers.get("Content-Type"))
    check("guide_current_validation_marker", meta_content(guide_doc, "gylio-guide-validated") == "2026-08-23", meta_content(guide_doc, "gylio-guide-validated"))
    check("guide_24_steps", guide_doc.step_count == 24, guide_doc.step_count)
    check("guide_step_checkboxes", guide_doc.checkbox_count >= 24, guide_doc.checkbox_count)
    check("guide_single_h1", guide_doc.h1_count == 1, guide_doc.h1_count)
    duplicated_ids = sorted({value for value in guide_doc.ids if guide_doc.ids.count(value) > 1})
    check("guide_no_duplicate_ids", not duplicated_ids, duplicated_ids)
    required_topics = ["Hostinger KVM 1", "MongoDB Atlas", "Clerk", "Nginx", "PM2", "Bibliography", "Run guide self-check"]
    missing_topics = [topic for topic in required_topics if topic.lower() not in guide.lower()]
    check("guide_required_topics_present", not missing_topics, {"missing": missing_topics})
    check("guide_mobile_grid_fix_shipping", "grid-template-columns: minmax(0, 1fr)" in guide, "minmax(0, 1fr)")
    check("guide_no_secret_config_fields", not re.search(r'data-config="[^"]*(SECRET|PASSWORD|TOKEN|MONGODB_URI)[^"]*"', guide, re.I), "non-secret personalization only")

    # 5) Informational response/security metadata. These are recorded but not
    # release-blocking because GitHub Pages controls many headers.
    header_snapshot = {
        key: root_headers.get(key)
        for key in ("Strict-Transport-Security", "Content-Security-Policy", "X-Content-Type-Options", "Cache-Control", "ETag", "Last-Modified")
    }
    print("INFO | root_response_headers |", json.dumps(header_snapshot, sort_keys=True))

    failed = [item for item in checks if not item["ok"]]
    report = {
        "base": base,
        "checked_at_epoch": int(time.time()),
        "checks": checks,
        "response_headers": header_snapshot,
        "passed": len(checks) - len(failed),
        "failed": len(failed),
    }
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"SUMMARY | passed={report['passed']} failed={report['failed']} report={report_path}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
