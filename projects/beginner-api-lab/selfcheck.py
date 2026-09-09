"""Check that a passing suite detects three controlled incorrect implementations."""
import argparse
import os
import re
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent


def run_suite(suite, fault, report):
    result = subprocess.run(
        [sys.executable, "-m", "pytest", str(suite), "-q", "--lab-fault", fault,
         "--junitxml", str(report)],
        cwd=ROOT, capture_output=True, text=True, timeout=45,
        env={**os.environ, "PYTEST_DISABLE_PLUGIN_AUTOLOAD": "1"},
    )
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
    tree = ET.parse(report).getroot() if report.exists() else None
    failures = sum(
        failure.get("type") == "AssertionError" or bool(
            re.search(r":\s*AssertionError(?::|\s*$)", (failure.text or "").strip().split("\n")[-1])
        ) for failure in tree.findall(".//failure")
    ) if tree is not None else 0
    errors = len(tree.findall(".//error")) if tree is not None else 1
    skipped = len(tree.findall(".//skipped")) if tree is not None else 1
    tests = len(tree.findall(".//testcase")) if tree is not None else 0
    return result.returncode, failures, errors, skipped, tests


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("suite", nargs="?", default="tests/test_examples.py")
    args = parser.parse_args()
    suite = (ROOT / args.suite).resolve()
    if not suite.is_relative_to(ROOT / "tests") or not suite.is_file():
        parser.error("Choose a test file inside this lab's tests/ directory.")
    # These temporary files contain only synthetic JUnit output, never learning progress.
    with TemporaryDirectory(prefix="sdet-lab-check-") as directory:
        directory = Path(directory)
        baseline = run_suite(suite, "none", directory / "baseline.xml")
        if baseline[0] != 0 or baseline[2] or baseline[3] or baseline[4] == 0:
            print("BASELINE FAILED: fix errors; do not skip tests.")
            return 1
        for fault in ("age-boundary", "duplicate", "status-code"):
            code, failures, errors, skipped, _ = run_suite(suite, fault, directory / (fault + ".xml"))
            if code != 1 or not failures or errors or skipped:
                print("FAULT NOT VALIDLY DETECTED:", fault)
                return 1
            print("DETECTED:", fault)
    print("Suite detects all three teaching faults. This is not a learner completion record.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
