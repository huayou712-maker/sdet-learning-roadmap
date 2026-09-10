"""The teaching grader must fail closed on missed faults, errors and skips."""
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import pytest
import selfcheck


@pytest.mark.parametrize("bad", [
    (0, 0, 0, 0, 4),  # A suite which passes even on an incorrect target.
    (2, 0, 1, 0, 4),  # Collection error.
    (1, 0, 1, 0, 4),  # Fixture error.
    (1, 1, 0, 1, 4),  # Skipped checks are not accepted.
])
def test_rejects_invalid_mutation_result(monkeypatch, bad):
    monkeypatch.setattr(sys, "argv", ["selfcheck.py"])
    outputs = iter([(0, 0, 0, 0, 4), bad])
    monkeypatch.setattr(selfcheck, "run_suite", lambda *_args: next(outputs))
    assert selfcheck.main() == 1


def test_accepts_only_healthy_baseline_and_detected_faults(monkeypatch):
    monkeypatch.setattr(sys, "argv", ["selfcheck.py"])
    outputs = iter([(0, 0, 0, 0, 4)] + [(1, 1, 0, 0, 4)] * 3)
    monkeypatch.setattr(selfcheck, "run_suite", lambda *_args: next(outputs))
    assert selfcheck.main() == 0


def test_runtime_exception_is_not_counted_as_an_assertion(monkeypatch):
    # A private temp directory avoids sharing a machine-wide pytest temp root.
    with TemporaryDirectory(prefix="sdet-grader-test-") as directory:
        report = Path(directory) / "synthetic.xml"
        def fake_run(*_args, **_kwargs):
            report.write_text(
                '<testsuites><testsuite><testcase><failure type="ValueError">bad</failure>'
                '</testcase></testsuite></testsuites>', encoding="utf-8",
            )
            return SimpleNamespace(returncode=1, stdout="", stderr="")
        monkeypatch.setattr(selfcheck.subprocess, "run", fake_run)
        assert selfcheck.run_suite("tests/test_examples.py", "duplicate", report) == (1, 0, 0, 0, 1)
