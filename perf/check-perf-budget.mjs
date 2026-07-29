#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const MIN_LCP_IMPROVEMENT_PCT = 35;
const MIN_BLOG_BYTES_REDUCTION_PCT = 40;
const MIN_DETAIL_REQUEST_REDUCTION_PCT = 20;

// Homepage performance guardrails (absolute thresholds on the latest run).
const HOME_MAX_LCP_MS = 4000;
const HOME_MAX_FCP_MS = 2500;
const HOME_MAX_TBT_MS = 300;
const HOME_MAX_CLS = 0.1;
const HOME_MAX_TOTAL_BYTES = 2_500_000;
const HOME_MAX_REQUEST_COUNT = 70;

function fmt(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(1) : String(value);
}

function findComparisonFile() {
  const argPath = process.argv[2];
  const envPath = process.env.PERF_COMPARISON_FILE;

  if (argPath) return path.resolve(process.cwd(), argPath);
  if (envPath) return path.resolve(process.cwd(), envPath);

  const candidates = [
    path.resolve(process.cwd(), "perf", "before-after2-comparison.json"),
    path.resolve(process.cwd(), "..", "perf", "before-after2-comparison.json"),
    path.resolve(process.cwd(), "perf", "before-after-comparison.json"),
    path.resolve(process.cwd(), "..", "perf", "before-after-comparison.json"),
  ];

  return candidates.find((candidate) => existsSync(candidate)) || candidates[0];
}

function resolveOptionalPath(input) {
  if (!input) return null;
  return path.resolve(process.cwd(), input);
}

function parsePathnameFromUrl(urlLike) {
  if (typeof urlLike !== "string" || urlLike.length === 0) return "";

  try {
    return new URL(urlLike).pathname || "";
  } catch {
    return "";
  }
}

function looksLikeHomepageLighthouseReport(report) {
  const requested =
    report?.requestedUrl || report?.finalDisplayedUrl || report?.finalUrl || report?.mainDocumentUrl || "";

  return parsePathnameFromUrl(requested) === "/";
}

async function tryReadJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function pickPreferredHomepageAudit(paths, direction) {
  if (paths.length === 0) return null;

  const ranked = [...paths]
    .map((filePath) => {
      const base = path.basename(filePath).toLowerCase();
      let score = 0;

      if (base.includes(`${direction}2`)) score += 60;
      if (base.includes("homepage")) score += 40;
      if (base.includes("home")) score += 30;
      if (base.includes("index")) score += 15;
      if (base.includes("root")) score += 15;

      return { filePath, score, base };
    })
    .sort((a, b) => b.score - a.score || b.base.localeCompare(a.base));

  return ranked[0].filePath;
}

async function findHomepageAuditPair() {
  const argBefore = resolveOptionalPath(process.argv[3]);
  const argAfter = resolveOptionalPath(process.argv[4]);
  const envBefore = resolveOptionalPath(process.env.PERF_HOME_BEFORE_FILE);
  const envAfter = resolveOptionalPath(process.env.PERF_HOME_AFTER_FILE);

  if (argBefore && argAfter) {
    return {
      beforePath: argBefore,
      afterPath: argAfter,
      source: "argv",
    };
  }

  if (envBefore && envAfter) {
    return {
      beforePath: envBefore,
      afterPath: envAfter,
      source: "env",
    };
  }

  const perfDirCandidates = [
    path.resolve(process.cwd(), "perf"),
    path.resolve(process.cwd(), "..", "perf"),
  ];

  const perfDir = perfDirCandidates.find((candidate) => existsSync(candidate));
  if (!perfDir) return null;

  const explicitCandidates = [
    ["before-home.json", "after-home.json"],
    ["before-homepage.json", "after-homepage.json"],
    ["before-index.json", "after-index.json"],
    ["before-root.json", "after-root.json"],
    ["before2-home.json", "after2-home.json"],
    ["before2-homepage.json", "after2-homepage.json"],
  ];

  for (const [beforeName, afterName] of explicitCandidates) {
    const beforePath = path.join(perfDir, beforeName);
    const afterPath = path.join(perfDir, afterName);

    if (existsSync(beforePath) && existsSync(afterPath)) {
      return {
        beforePath,
        afterPath,
        source: "convention",
      };
    }
  }

  // Fallback: attempt a content-based discovery for files that target '/'.
  const entries = await readdir(perfDir, { withFileTypes: true });
  const auditCandidates = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => path.join(perfDir, entry.name));

  const discoveredBeforeCandidates = [];
  const discoveredAfterCandidates = [];

  for (const filePath of auditCandidates) {
    const base = path.basename(filePath).toLowerCase();

    if (
      base.includes("comparison") ||
      base.includes("metrics") ||
      base.includes("media-audit") ||
      (!base.startsWith("before") && !base.startsWith("after"))
    ) {
      continue;
    }

    try {
      const report = await tryReadJson(filePath);
      if (!looksLikeHomepageLighthouseReport(report)) continue;

      if (base.startsWith("before")) discoveredBeforeCandidates.push(filePath);
      if (base.startsWith("after")) discoveredAfterCandidates.push(filePath);
    } catch {
      // Ignore malformed candidates during discovery.
    }
  }

  const discoveredBefore = pickPreferredHomepageAudit(discoveredBeforeCandidates, "before");
  const discoveredAfter = pickPreferredHomepageAudit(discoveredAfterCandidates, "after");

  if (discoveredBefore && discoveredAfter) {
    return {
      beforePath: discoveredBefore,
      afterPath: discoveredAfter,
      source: "discovered",
    };
  }

  return null;
}

function normalizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function checkAtLeast(label, actual, minimum) {
  const pass = actual >= minimum;
  return {
    pass,
    label,
    detail: `${label}: ${fmt(actual)} (min ${fmt(minimum)})`,
  };
}

function checkAtMost(label, actual, maximum) {
  const pass = actual <= maximum;
  return {
    pass,
    label,
    detail: `${label}: ${fmt(actual)} (max ${fmt(maximum)})`,
  };
}

function checkNotWorse(label, before, after) {
  const pass = after <= before;
  return {
    pass,
    label,
    detail: `${label}: before ${fmt(before)} -> after ${fmt(after)}`,
  };
}

async function main() {
  const comparisonFile = findComparisonFile();

  if (!existsSync(comparisonFile)) {
    console.error(`Perf budget check failed: comparison file not found at ${comparisonFile}`);
    process.exit(1);
  }

  const raw = await readFile(comparisonFile, "utf8");
  const report = JSON.parse(raw);

  if (!Array.isArray(report) || report.length === 0) {
    console.error("Perf budget check failed: comparison report is empty or invalid.");
    process.exit(1);
  }

  const blog = report.find((row) => row?.page === "/blog");
  const detail = report.find((row) => row?.page !== "/blog");

  if (!blog || !detail) {
    console.error("Perf budget check failed: expected both /blog and detail-page rows in comparison report.");
    process.exit(1);
  }

  const homepageAuditPair = await findHomepageAuditPair();

  let homepageBefore = null;
  let homepageAfter = null;

  if (homepageAuditPair && existsSync(homepageAuditPair.beforePath) && existsSync(homepageAuditPair.afterPath)) {
    homepageBefore = await tryReadJson(homepageAuditPair.beforePath);
    homepageAfter = await tryReadJson(homepageAuditPair.afterPath);
  }

  const checks = [
    checkAtLeast("/blog LCP improvement %", normalizeNumber(blog.lcp_improvement_pct), MIN_LCP_IMPROVEMENT_PCT),
    checkAtLeast("detail LCP improvement %", normalizeNumber(detail.lcp_improvement_pct), MIN_LCP_IMPROVEMENT_PCT),
    checkAtLeast("/blog bytes reduction %", normalizeNumber(blog.bytes_reduction_pct), MIN_BLOG_BYTES_REDUCTION_PCT),
    checkAtLeast("detail request reduction %", normalizeNumber(detail.request_reduction_pct), MIN_DETAIL_REQUEST_REDUCTION_PCT),
    checkNotWorse("/blog CLS", normalizeNumber(blog.before?.cls), normalizeNumber(blog.after?.cls)),
    checkNotWorse("detail CLS", normalizeNumber(detail.before?.cls), normalizeNumber(detail.after?.cls)),
  ];

  if (!homepageBefore || !homepageAfter) {
    checks.push({
      pass: false,
      label: "homepage metrics source",
      detail:
        "homepage metrics source: missing homepage before/after Lighthouse JSON. Provide PERF_HOME_BEFORE_FILE and PERF_HOME_AFTER_FILE (or argv[3]/argv[4]).",
    });
  } else {
    if (!looksLikeHomepageLighthouseReport(homepageBefore) || !looksLikeHomepageLighthouseReport(homepageAfter)) {
      checks.push({
        pass: false,
        label: "homepage metrics source",
        detail: "homepage metrics source: provided files are not homepage Lighthouse reports (expected requestedUrl path '/').",
      });
    } else {
      const homeAfterFcp = normalizeNumber(homepageAfter?.audits?.["first-contentful-paint"]?.numericValue);
      const homeAfterLcp = normalizeNumber(homepageAfter?.audits?.["largest-contentful-paint"]?.numericValue);
      const homeAfterTbt = normalizeNumber(homepageAfter?.audits?.["total-blocking-time"]?.numericValue);
      const homeAfterCls = normalizeNumber(homepageAfter?.audits?.["cumulative-layout-shift"]?.numericValue);
      const homeAfterBytes = normalizeNumber(homepageAfter?.audits?.["total-byte-weight"]?.numericValue);
      const homeAfterRequests = normalizeNumber(homepageAfter?.audits?.["network-requests"]?.details?.items?.length);

      checks.push(
        checkAtMost("homepage FCP ms", homeAfterFcp, HOME_MAX_FCP_MS),
        checkAtMost("homepage LCP ms", homeAfterLcp, HOME_MAX_LCP_MS),
        checkAtMost("homepage TBT ms", homeAfterTbt, HOME_MAX_TBT_MS),
        checkAtMost("homepage CLS", homeAfterCls, HOME_MAX_CLS),
        checkAtMost("homepage transferred bytes", homeAfterBytes, HOME_MAX_TOTAL_BYTES),
        checkAtMost("homepage request count", homeAfterRequests, HOME_MAX_REQUEST_COUNT),
      );
    }
  }

  console.log(`Using comparison file: ${comparisonFile}`);
  if (homepageAuditPair) {
    console.log(
      `Homepage audit source (${homepageAuditPair.source}): before=${homepageAuditPair.beforePath}, after=${homepageAuditPair.afterPath}`,
    );
  }

  let failures = 0;
  for (const check of checks) {
    if (check.pass) {
      console.log(`PASS: ${check.detail}`);
      continue;
    }

    failures += 1;
    console.error(`FAIL: ${check.detail}`);
  }

  if (failures > 0) {
    console.error(`Perf budget check failed with ${failures} failing check(s).`);
    process.exit(1);
  }

  console.log("Perf budget check passed.");
}

main().catch((error) => {
  console.error(`Perf budget check crashed: ${error.message}`);
  process.exit(1);
});
