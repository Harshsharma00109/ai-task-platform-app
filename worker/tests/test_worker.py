"""
Unit tests for the Python worker's task processing logic.
Run with: python -m pytest tests/ -v
"""

import json
import sys
import os
import pytest

# Make sure we can import from src/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from worker import process_operation


# ── Uppercase ─────────────────────────────────────────────────────────────────
class TestUppercase:
    def test_basic_lowercase(self):
        result, logs = process_operation("hello world", "uppercase")
        assert result == "HELLO WORLD"

    def test_mixed_case(self):
        result, logs = process_operation("Hello World 123!", "uppercase")
        assert result == "HELLO WORLD 123!"

    def test_already_uppercase(self):
        result, logs = process_operation("ALREADY UPPER", "uppercase")
        assert result == "ALREADY UPPER"

    def test_empty_string(self):
        result, logs = process_operation("", "uppercase")
        assert result == ""

    def test_logs_populated(self):
        _, logs = process_operation("test", "uppercase")
        assert len(logs) >= 2
        assert all("timestamp" in l and "level" in l and "message" in l for l in logs)

    def test_logs_have_completed_message(self):
        _, logs = process_operation("test", "uppercase")
        messages = [l["message"] for l in logs]
        assert any("completed" in m.lower() for m in messages)


# ── Lowercase ─────────────────────────────────────────────────────────────────
class TestLowercase:
    def test_basic_uppercase(self):
        result, logs = process_operation("HELLO WORLD", "lowercase")
        assert result == "hello world"

    def test_mixed_case(self):
        result, logs = process_operation("Hello World 123!", "lowercase")
        assert result == "hello world 123!"

    def test_already_lowercase(self):
        result, logs = process_operation("already lower", "lowercase")
        assert result == "already lower"

    def test_unicode(self):
        result, logs = process_operation("HÉLLO WÖRLD", "lowercase")
        assert result == "héllo wörld"


# ── Reverse ───────────────────────────────────────────────────────────────────
class TestReverse:
    def test_simple_string(self):
        result, logs = process_operation("hello", "reverse")
        assert result == "olleh"

    def test_palindrome(self):
        result, logs = process_operation("racecar", "reverse")
        assert result == "racecar"

    def test_sentence(self):
        result, logs = process_operation("Hello World", "reverse")
        assert result == "dlroW olleH"

    def test_empty_string(self):
        result, logs = process_operation("", "reverse")
        assert result == ""

    def test_single_char(self):
        result, logs = process_operation("x", "reverse")
        assert result == "x"


# ── Word Count ────────────────────────────────────────────────────────────────
class TestWordCount:
    def test_basic_word_count(self):
        result, logs = process_operation("hello world hello", "word_count")
        data = json.loads(result)
        assert data["total_words"] == 3
        assert data["unique_words"] == 2

    def test_character_count(self):
        text = "hello world"
        result, logs = process_operation(text, "word_count")
        data = json.loads(result)
        assert data["character_count"] == len(text)

    def test_top_words_sorted(self):
        result, logs = process_operation("a a a b b c", "word_count")
        data = json.loads(result)
        top = data["top_words"]
        assert top[0]["word"] == "a"
        assert top[0]["count"] == 3
        assert top[1]["word"] == "b"
        assert top[1]["count"] == 2

    def test_top_words_max_10(self):
        # Generate text with 15 unique words each appearing once
        text = " ".join([f"word{i}" for i in range(15)])
        result, logs = process_operation(text, "word_count")
        data = json.loads(result)
        assert len(data["top_words"]) <= 10

    def test_result_is_valid_json(self):
        result, logs = process_operation("some text here", "word_count")
        data = json.loads(result)  # Should not raise
        assert "total_words" in data
        assert "unique_words" in data
        assert "character_count" in data
        assert "top_words" in data

    def test_punctuation_stripped(self):
        result, logs = process_operation("hello, world! hello.", "word_count")
        data = json.loads(result)
        # 'hello' should appear twice despite punctuation
        top_words = {w["word"]: w["count"] for w in data["top_words"]}
        assert top_words.get("hello", 0) == 2


# ── Invalid Operation ─────────────────────────────────────────────────────────
class TestInvalidOperation:
    def test_unknown_operation_raises(self):
        with pytest.raises(ValueError, match="Unknown operation"):
            process_operation("text", "invalid_operation")

    def test_empty_operation_raises(self):
        with pytest.raises(ValueError):
            process_operation("text", "")


# ── Log Structure ─────────────────────────────────────────────────────────────
class TestLogStructure:
    def test_all_logs_have_required_fields(self):
        for op in ["uppercase", "lowercase", "reverse", "word_count"]:
            _, logs = process_operation("test input", op)
            for log in logs:
                assert "timestamp" in log, f"Missing timestamp in {op} log"
                assert "level" in log, f"Missing level in {op} log"
                assert "message" in log, f"Missing message in {op} log"
                assert log["level"] in ("info", "warn", "error")

    def test_logs_start_with_operation_message(self):
        _, logs = process_operation("test", "uppercase")
        assert "uppercase" in logs[0]["message"].lower()
