import logging
import os
import sys
from types import SimpleNamespace
from core import response_generator as rg
from core.knowledge_retrieval import retrieve
from core.safety_rules import check_emergency


def test_example_placeholder_is_not_a_real_key(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "your_groq_api_key_here")
    assert rg.is_groq_key_configured() is False


def test_configured_key_reports_boolean_only(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_placeholder_not_real")
    assert rg.is_groq_key_configured() is True


def test_dotenv_is_loaded_from_project_root(tmp_path, monkeypatch):
    monkeypatch.setattr(rg, "PROJECT_ROOT", tmp_path)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    (tmp_path / ".env").write_text("GROQ_API_KEY=gsk_test_from_env_file\n")

    assert rg.is_groq_key_configured() is True


def test_hindi_fallback_is_localized():
    result = rg.generate_response(
        "गाय को बुखार है", [{"urgency": "prompt", "general_guidance": "English guidance",
        "source_name": "Example source", "limitations": "English limitation"}],
        animal="cattle", use_llm=False, language_mode="hindi"
    )
    assert "पशु चिकित्सक" in result["response_text"]
    assert "English guidance" not in result["response_text"]
    assert result["llm_used"] is False
    assert result["response_mode"] == "Offline fallback"
    assert result["response_path"] == "offline fallback"


def test_rajasthani_fallback_is_localized():
    result = rg.generate_response(
        "गाय खावै कोनी", [{"urgency": "prompt", "general_guidance": "English guidance",
        "source_name": "Example source", "limitations": "English limitation"}],
        animal="cattle", use_llm=False, language_mode="rajasthani"
    )
    assert "पशु डॉक्टर" in result["response_text"]
    assert "English guidance" not in result["response_text"]


def test_low_milk_fallback_asks_follow_up_in_hindi_without_generic_no_info():
    result = rg.generate_response(
        "गाय का दूध कम हो गया है",
        [{"id": "CB005", "urgency": "prompt", "source_name": "KB source"}],
        animal="cattle", use_llm=False, language_mode="hindi",
    )
    assert "दूध कब से कम है" in result["response_text"]
    assert "थन" in result["response_text"]
    assert "पशु चिकित्सक" in result["response_text"]
    assert "भरोसेमंद जानकारी नहीं मिली" not in result["response_text"]


def test_low_milk_fallback_asks_follow_up_in_rajasthani():
    result = rg.generate_response(
        "mhari gai dudh ghat gayo",
        [{"id": "CB005", "urgency": "prompt", "source_name": "KB source"}],
        animal="cattle", use_llm=False, language_mode="rajasthani",
    )
    assert "दूध कद सूँ कम है" in result["response_text"]
    assert "पशु डॉक्टर" in result["response_text"]


def test_low_milk_without_kb_still_asks_for_details():
    result = rg.generate_response(
        "meri gai ka doodh kam ho raha", [], animal="cattle",
        use_llm=False, language_mode="hindi",
    )
    assert "दूध कब से कम है" in result["response_text"]
    assert "भरोसेमंद जानकारी नहीं मिली" not in result["response_text"]


def test_kb_match_still_calls_groq(monkeypatch):
    results = retrieve("गाय खाना नहीं खा रही है", species="cattle")["results"]
    assert results
    calls = []

    def record_call(query, context, language):
        calls.append((query, context, language))
        return {"success": False, "error_category": "test_api_failure", "latency_ms": 1}

    monkeypatch.setattr(rg, "_call_groq", record_call)
    result = rg.generate_response(
        "गाय खाना नहीं खा रही है", results, animal="cattle", language_mode="hindi"
    )

    assert len(calls) == 1
    assert calls[0][1]
    assert result["response_path"] == "offline fallback"
    assert result["response_path_reason"] == "test_api_failure"


def test_no_kb_match_still_calls_groq(monkeypatch):
    query = "Why does my goat sleep facing the sunrise every morning?"
    results = retrieve(query, species="goat", min_score=0.5)["results"]
    assert results == []
    calls = []

    def record_call(user_query, context, language):
        calls.append((user_query, context, language))
        return {"success": False, "error_category": "test_api_failure", "latency_ms": 1}

    monkeypatch.setattr(rg, "_call_groq", record_call)
    result = rg.generate_response(query, results, animal="goat")

    assert len(calls) == 1
    assert "No relevant veterinary information" in calls[0][1]
    assert result["llm_used"] is False
    assert result["response_path"] == "offline fallback"


def test_genuine_emergency_returns_safety_guidance_without_groq(monkeypatch):
    emergency = check_emergency("my cow is gasping and has open mouth breathing")
    assert emergency["is_emergency"] is True

    def fail_if_called(*args, **kwargs):
        raise AssertionError("Groq must not be called for an emergency")

    monkeypatch.setattr(rg, "_call_groq", fail_if_called)
    result = rg.generate_response(
        "my cow is gasping", [], animal="cattle",
        language_mode="hindi", emergency_result=emergency,
    )

    assert "तुरंत पशु चिकित्सक" in result["response_text"]
    assert result["response_path"] == "emergency rule"
    assert result["llm_used"] is False
    assert result["llm_error_category"] == "not_attempted_emergency"


def test_selected_language_controls_fallback_answer_and_groq_prompt(monkeypatch):
    captured = {}

    class FakeGroq:
        def __init__(self, api_key, timeout, max_retries):
            captured["timeout"] = timeout
            captured["max_retries"] = max_retries
            captured.setdefault("prompts", [])
            self.chat = SimpleNamespace(completions=SimpleNamespace(create=self.create))

        def create(self, **kwargs):
            captured["prompts"].append(kwargs["messages"][0]["content"])
            raise TimeoutError("test timeout")

    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_key")
    monkeypatch.setitem(sys.modules, "groq", SimpleNamespace(Groq=FakeGroq))

    hindi = rg.generate_response(
        "गाय का दूध कम हो गया है", [], animal="cattle", language_mode="hindi"
    )
    rajasthani = rg.generate_response(
        "गाय का दूध कम हो गया है", [], animal="cattle", language_mode="rajasthani"
    )

    assert "दूध कम होने के कई कारण" in hindi["response_text"]
    assert "दूध घटणै के कई कारण" in rajasthani["response_text"]
    assert "simple, natural Hindi" in captured["prompts"][0]
    assert "Rajasthani-friendly conversational language" in captured["prompts"][1]
    assert captured["timeout"] == rg.GROQ_TIMEOUT_SECONDS
    assert captured["max_retries"] == 0
    assert hindi["response_path_reason"] == "timeout"
    assert rajasthani["response_path_reason"] == "timeout"


def test_groq_failure_is_logged_without_api_key(monkeypatch, caplog):
    api_key = "gsk_test_secret_do_not_log"

    class FakeGroq:
        def __init__(self, api_key, timeout, max_retries):
            self.chat = SimpleNamespace(completions=SimpleNamespace(
                create=lambda **kwargs: (_ for _ in ()).throw(
                    RuntimeError(f"request failed for {api_key}")
                )
            ))

    monkeypatch.setenv("GROQ_API_KEY", api_key)
    monkeypatch.setitem(sys.modules, "groq", SimpleNamespace(Groq=FakeGroq))
    caplog.set_level(logging.ERROR, logger=rg.__name__)

    result = rg._call_groq("test question", "supported context")

    assert result["success"] is False
    assert result["error_category"] == "network_or_api_error"
    assert "RuntimeError" in caplog.text
    assert "[REDACTED]" in caplog.text
    assert api_key not in caplog.text


def test_groq_failure_activates_offline_fallback(monkeypatch):
    def failed_request(*args, **kwargs):
        return {"success": False, "error_category": "timeout", "latency_ms": 1}

    monkeypatch.setattr(rg, "_call_groq", failed_request)
    result = rg.generate_response(
        "गाय को बुखार है",
        [{"urgency": "prompt", "general_guidance": "English guidance"}],
        animal="cattle",
    )

    assert result["response_path"] == "offline fallback"
    assert result["response_path_reason"] == "timeout"
    assert result["response_mode"] == "Offline fallback"
    assert result["llm_used"] is False
    assert "English guidance" not in result["response_text"]
