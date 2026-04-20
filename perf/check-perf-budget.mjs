#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const MIN_LCP_IMPROVEMENT_PCT = 35;
const MIN_BLOG_BYTES_REDUCTION_PCT = 40;
const MIN_DETAIL_REQUEST_REDUCTION_PCT = 20;

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

  const checks = [
    checkAtLeast("/blog LCP improvement %", normalizeNumber(blog.lcp_improvement_pct), MIN_LCP_IMPROVEMENT_PCT),
    checkAtLeast("detail LCP improvement %", normalizeNumber(detail.lcp_improvement_pct), MIN_LCP_IMPROVEMENT_PCT),
    checkAtLeast("/blog bytes reduction %", normalizeNumber(blog.bytes_reduction_pct), MIN_BLOG_BYTES_REDUCTION_PCT),
    checkAtLeast("detail request reduction %", normalizeNumber(detail.request_reduction_pct), MIN_DETAIL_REQUEST_REDUCTION_PCT),
    checkNotWorse("/blog CLS", normalizeNumber(blog.before?.cls), normalizeNumber(blog.after?.cls)),
    checkNotWorse("detail CLS", normalizeNumber(detail.before?.cls), normalizeNumber(detail.after?.cls)),
  ];

  console.log(`Using comparison file: ${comparisonFile}`);

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
