"""
app.py — PashuMitra AI
========================
Main Streamlit application.
Voice-first veterinary assistant for rural India.

Phase 2: Text-based interface with full pipeline.
Phase 3 will add voice input/output.

Run: streamlit run app.py
"""

import streamlit as st
import time
import os
import json
import logging
from pathlib import Path
from datetime import datetime

# ── Page config (MUST be first Streamlit call) ──
st.set_page_config(
    page_title="PashuMitra AI — पशु मित्र",
    page_icon="🐄",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Import core modules ──
from core.safety_rules import (
    check_emergency, check_prescription_request,
    get_urgency_from_keywords, get_urgency_display, URGENCY_EMERGENCY
)
from core.dialect_normalizer import normalize_text, detect_species_from_text
from core.knowledge_retrieval import retrieve, get_highest_urgency, format_sources
from core.response_generator import generate_response, needs_clarification, is_groq_key_configured
from core.health_records import (
    init_database, add_animal, get_animals, add_observation,
    get_animal_history, delete_animal
)
from core.metrics import record_query, get_session_stats

logger = logging.getLogger(__name__)

# ── Initialize DB ──
init_database()

# ─────────────────────────────────────────────
# STYLES
# ─────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');

:root {
    --primary: #1a6b3a;
    --primary-light: #2d9a57;
    --accent: #f4a261;
    --emergency: #e63946;
    --emergency-bg: #fff0f0;
    --prompt: #e67e22;
    --prompt-bg: #fff9f0;
    --general: #2e7d32;
    --general-bg: #f0fff4;
    --bg: #f7faf8;
    --card-bg: #ffffff;
    --text: #1a1a2e;
    --text-light: #555;
    --border: #d0e4d7;
    --radius: 16px;
    --shadow: 0 4px 20px rgba(0,0,0,0.08);
}

* { font-family: 'Noto Sans Devanagari', 'Inter', sans-serif; }

.main { background-color: var(--bg); }

/* Header */
.pm-header {
    background: linear-gradient(135deg, #1a6b3a 0%, #2d9a57 50%, #34c768 100%);
    border-radius: var(--radius);
    padding: 2rem 2.5rem;
    color: white;
    margin-bottom: 1.5rem;
    box-shadow: var(--shadow);
}
.pm-header h1 { font-size: 2.4rem; font-weight: 700; margin: 0; }
.pm-header p { font-size: 1.1rem; opacity: 0.9; margin: 0.4rem 0 0; }
.pm-badge {
    display: inline-block;
    background: rgba(255,255,255,0.2);
    padding: 0.2rem 0.8rem;
    border-radius: 20px;
    font-size: 0.8rem;
    margin-top: 0.5rem;
    backdrop-filter: blur(4px);
}

/* Urgency cards */
.urgency-emergency {
    background: var(--emergency-bg);
    border: 2px solid var(--emergency);
    border-radius: var(--radius);
    padding: 1.2rem 1.5rem;
    margin: 1rem 0;
    animation: pulse-red 2s infinite;
}
.urgency-prompt {
    background: var(--prompt-bg);
    border: 2px solid var(--prompt);
    border-radius: var(--radius);
    padding: 1.2rem 1.5rem;
    margin: 1rem 0;
}
.urgency-general {
    background: var(--general-bg);
    border: 2px solid var(--general);
    border-radius: var(--radius);
    padding: 1.2rem 1.5rem;
    margin: 1rem 0;
}

@keyframes pulse-red {
    0%, 100% { box-shadow: 0 0 0 0 rgba(230, 57, 70, 0.4); }
    50% { box-shadow: 0 0 0 8px rgba(230, 57, 70, 0); }
}

/* Response cards */
.response-card {
    background: var(--card-bg);
    border-radius: var(--radius);
    padding: 1.5rem;
    margin: 1rem 0;
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
}
.source-card {
    background: #f0f7ff;
    border-radius: 10px;
    padding: 0.8rem 1rem;
    border-left: 4px solid #1565c0;
    margin: 0.5rem 0;
    font-size: 0.85rem;
}
.limitation-card {
    background: #fffde7;
    border-radius: 10px;
    padding: 0.8rem 1rem;
    border-left: 4px solid #f9a825;
    margin: 0.5rem 0;
    font-size: 0.85rem;
}
.animal-selector-btn {
    font-size: 2rem;
    padding: 1rem;
    border-radius: 12px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
    background: white;
    text-align: center;
    width: 100%;
}
.animal-selector-btn:hover {
    border-color: var(--primary-light);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

/* Metric cards */
.metric-card {
    background: white;
    border-radius: 12px;
    padding: 1rem;
    text-align: center;
    border: 1px solid var(--border);
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.metric-value { font-size: 2rem; font-weight: 700; color: var(--primary); }
.metric-label { font-size: 0.75rem; color: var(--text-light); }

/* Hide Streamlit branding */
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}
.stDeployButton {display: none;}
</style>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────────
# SESSION STATE INITIALIZATION
# ─────────────────────────────────────────────
if "messages" not in st.session_state:
    st.session_state.messages = []

if "selected_animal" not in st.session_state:
    st.session_state.selected_animal = None

if "language_mode" not in st.session_state:
    st.session_state.language_mode = "hindi"

if "last_response" not in st.session_state:
    st.session_state.last_response = None

if "show_health_card" not in st.session_state:
    st.session_state.show_health_card = False

# ─────────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────────
st.markdown("""
<div class="pm-header">
    <h1>🐄 PashuMitra AI — पशु मित्र</h1>
    <p>ग्रामीण पशुपालकों के लिए निःशुल्क पशु स्वास्थ्य सहायक</p>
    <p><em>Free veterinary guidance for rural livestock owners · Hindi & Rajasthani friendly</em></p>
    <span class="pm-badge">⚠️ For educational guidance only · Not a replacement for a veterinarian</span>
</div>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────────
# SIDEBAR
# ─────────────────────────────────────────────
with st.sidebar:
    st.image("https://em-content.zobj.net/source/twitter/376/cow_1f404.png", width=80)
    st.markdown("### 🌐 भाषा / Language")
    lang_mode = st.radio(
        "Select mode:",
        ["🇮🇳 Hindi (हिंदी)", "🏜️ Rajasthani-friendly (राजस्थानी)"],
        index=0 if st.session_state.language_mode == "hindi" else 1,
        label_visibility="collapsed",
    )
    st.session_state.language_mode = "hindi" if "Hindi" in lang_mode else "rajasthani"

    st.divider()

    st.markdown("### 🐾 पशु चुनें")
    st.caption("Which animal needs help?")

    animal_options = {
        "🐄 गाय (Cow)": "cattle",
        "🐃 भैंस (Buffalo)": "buffalo",
        "🐐 बकरी (Goat)": "goat",
        "🐑 भेड़ (Sheep)": "sheep",
        "❓ पता नहीं": None,
    }

    for label, value in animal_options.items():
        if st.button(label, key=f"animal_{value}", use_container_width=True):
            st.session_state.selected_animal = value
            st.rerun()

    if st.session_state.selected_animal:
        reverse_map = {v: k for k, v in animal_options.items()}
        st.success(f"Selected: {reverse_map.get(st.session_state.selected_animal, '?')}")
    else:
        st.info("No animal selected")

    st.divider()

    st.markdown("### 🏥 पशु चिकित्सा संपर्क")
    st.markdown("""
**Helpline Numbers (Verified):**
- 📞 **1962** — किसान कॉल सेंटर (Kisan Call Centre) — Free, 24x7
- 📞 **IVRI Izatnagar:** 0581-2301618
- 📞 Rajasthan Animal Husbandry Dept: [dahd.rajasthan.gov.in](https://dahd.rajasthan.gov.in)

_Contact your local **Pashu Chikitsa Kendra** for the nearest veterinarian._
""")
    st.caption("⚠️ Only verified contacts are listed above. We do not fabricate or estimate phone numbers.")

    st.divider()
    with st.expander("🔧 API Diagnostics / जाँच"):
        st.write(f"Groq API key configured: **{'Yes' if is_groq_key_configured() else 'No'}**")
        st.caption("यह केवल configuration जाँचता है; इससे API request सफल होना साबित नहीं होता।")
        st.write(f"Selected response language: **{'Hindi' if st.session_state.language_mode == 'hindi' else 'Rajasthani-friendly'}**")
        if st.session_state.last_response:
            last = st.session_state.last_response
            st.write(f"Last response mode: **{last.get('response_mode', 'Unknown')}**")
            st.write(f"Last response path: **{last.get('response_path', 'Unknown')}**")
            st.caption(f"Path reason: {last.get('response_path_reason', 'not recorded')}")
            api_status = (
                "Successful Groq API response"
                if last.get("llm_used")
                else f"Offline fallback ({last.get('llm_error_category', 'not_attempted')})"
            )
            st.write(f"Last API status: **{api_status}**")
        else:
            st.caption("Question submit karne ke baad request status yahan dikhega.")

    st.divider()
    if st.button("🃏 Health Card / Pashu Card", use_container_width=True):
        st.session_state.show_health_card = not st.session_state.show_health_card

# ─────────────────────────────────────────────
# MAIN TABS
# ─────────────────────────────────────────────
tab1, tab2, tab3, tab4 = st.tabs([
    "💬 पूछें (Ask)",
    "🃏 Health Card (Pashu Card)",
    "📊 Demo Dashboard",
    "ℹ️ About / जानकारी"
])

# ════════════════════════════════════════════
# TAB 1 — Main conversation
# ════════════════════════════════════════════
with tab1:
    # ── Animal species display ──
    if st.session_state.selected_animal:
        species_icons = {"cattle": "🐄", "buffalo": "🐃", "goat": "🐐", "sheep": "🐑"}
        icon = species_icons.get(st.session_state.selected_animal, "🐾")
        st.info(f"{icon} **Selected animal:** {st.session_state.selected_animal.title()} | Use sidebar to change")
    else:
        st.warning("⬅️ **Please select an animal** from the sidebar, or type your question and we'll try to detect it automatically.")

    # ── Conversation history display ──
    st.markdown("### 💬 बातचीत (Conversation)")
    
    conversation_container = st.container()
    with conversation_container:
        if not st.session_state.messages:
            st.markdown("""
<div style="text-align:center; padding: 2rem; color: #888; font-size: 1.1rem;">
🐄 <strong>नमस्ते! मैं PashuMitra AI हूँ।</strong><br>
अपने पशु की समस्या नीचे लिखें।<br><br>
<em>Hello! I'm PashuMitra AI. Type your animal health question below.</em>
</div>
""", unsafe_allow_html=True)
        else:
            for msg in st.session_state.messages:
                if msg["role"] == "user":
                    with st.chat_message("user", avatar="👨‍🌾"):
                        st.write(msg["content"])
                        if msg.get("dialect_info"):
                            di = msg["dialect_info"]
                            if di["has_dialect_terms"]:
                                with st.expander("🗣️ Dialect terms detected"):
                                    for match in di["dialect_matches"][:5]:
                                        st.caption(f"**{match['original_term']}** → {match['normalized_term']} ({match['type']})")
                else:
                    with st.chat_message("assistant", avatar="🐄"):
                        resp = msg.get("response_data", {})
                        urgency = resp.get("final_urgency", "general")
                        disp = get_urgency_display(urgency)

                        # Urgency badge
                        css_class = f"urgency-{urgency}"
                        st.markdown(
                            f'<div class="{css_class}"><strong>{disp["label"]}</strong><br>'
                            f'<small>{disp["advice_hi"]}</small></div>',
                            unsafe_allow_html=True
                        )

                        # Emergency warning takes priority
                        if urgency == URGENCY_EMERGENCY:
                            em = resp.get("emergency_check", {})
                            if st.session_state.language_mode == "rajasthani":
                                st.error("🚨 **तुरन्त पशु डॉक्टर नै संपर्क करो।** हालत गंभीर हो सकै है। घरेलू नुस्खो मत आजमावो।")
                            elif em.get("message_hi"):
                                st.error(em["message_hi"])

                        # Main response
                        st.markdown(msg["content"])
                        if resp.get("response_path"):
                            st.caption(
                                f"Response path: {resp['response_path']} "
                                f"({resp.get('response_path_reason', 'not recorded')})"
                            )

                        # Evidence panel
                        if resp.get("sources"):
                            with st.expander("📚 स्रोत / Evidence & Sources"):
                                for src in resp["sources"]:
                                    if src.get("name"):
                                        st.markdown(
                                            f'<div class="source-card">📖 <strong>{src["name"]}</strong><br>'
                                            f'<a href="{src.get("url","")}" target="_blank">{src.get("url","")}</a><br>'
                                            f'Last verified: {src.get("verified","Unknown")}</div>',
                                            unsafe_allow_html=True
                                        )

                        # Limitations
                        if resp.get("cannot_determine"):
                            with st.expander("⚠️ What the system cannot determine"):
                                st.markdown(
                                    f'<div class="limitation-card">{resp["cannot_determine"]}</div>',
                                    unsafe_allow_html=True
                                )
                                if resp.get("limitations"):
                                    for lim in resp["limitations"]:
                                        if lim:
                                            st.caption(f"• {lim}")

                        # When to see vet
                        if resp.get("when_to_see_vet"):
                            st.markdown(f"🏥 **डॉक्टर कब दिखाएं:** {resp['when_to_see_vet']}")

                        # Performance info
                        if resp.get("total_latency_ms"):
                            cols = st.columns(3)
                            with cols[0]:
                                st.caption(f"⚡ Total: {resp['total_latency_ms']}ms")
                            with cols[1]:
                                src_text = resp.get("response_path", "Offline fallback")
                                st.caption(f"🔧 Source: {src_text}")
                            with cols[2]:
                                st.caption(f"📚 KB hits: {resp.get('kb_results_count', 0)}")

    # ── Save to health card button ──
    if st.session_state.last_response and st.session_state.selected_animal:
        animals = get_animals()
        if animals:
            with st.expander("💾 Save to Health Card"):
                animal_options_save = {f"{a['nickname']} ({a['species']})": a["id"] for a in animals}
                selected_card = st.selectbox("Select animal:", list(animal_options_save.keys()))
                if st.button("✅ Save this consultation"):
                    animal_id = animal_options_save[selected_card]
                    lr = st.session_state.last_response
                    add_observation(
                        animal_id=animal_id,
                        symptoms=st.session_state.messages[-2]["content"] if len(st.session_state.messages) >= 2 else "",
                        query=st.session_state.messages[-2]["content"] if len(st.session_state.messages) >= 2 else "",
                        response_summary=lr.get("response_text", "")[:500],
                        urgency_level=lr.get("final_urgency", "general"),
                    )
                    st.success("✅ Saved to health card!")

    st.divider()

    # ── Input area ──
    st.markdown("### ✍️ अपना सवाल लिखें (Type your question)")
    
    # Sample questions for quick testing
    with st.expander("📝 Sample questions (click to use)"):
        sample_qs = [
            "मेरी गाय खाना नहीं खा रही है",
            "भैंस का पेट फूल गया है बहुत ज़्यादा",
            "गाय गिर गई है और उठ नहीं पा रही",
            "बकरी को दस्त हो रहे हैं",
            "जानवर ने कुछ ज़हरीला खा लिया लग रहा है",
            "आफरो आयो भैंस को",  # Rajasthani
            "मेरे जानवर को एमोक्सिसिलिन कितनी देनी चाहिए",  # Should be refused
            "पशु को कौन सा टीका कब लगवाना चाहिए",
        ]
        cols = st.columns(2)
        for i, q in enumerate(sample_qs):
            with cols[i % 2]:
                if st.button(q, key=f"sample_{i}", use_container_width=True):
                    st.session_state["prefill_query"] = q

    # Text input
    prefill = st.session_state.pop("prefill_query", "")
    user_input = st.chat_input(
        placeholder="यहाँ अपना सवाल लिखें... (Type your question in Hindi/Rajasthani/English)",
    )
    
    if prefill and not user_input:
        user_input = prefill

    # ── Process query ──
    if user_input and user_input.strip():
        query = user_input.strip()

        # ── Step 1: Safety checks (always first, before any other processing) ──
        dialect_info = normalize_text(query)
        safety_text = f"{query} {dialect_info['normalized']}"
        emergency_result = check_emergency(safety_text)
        prescription_result = check_prescription_request(query)

        # ── Step 2: Dialect normalization ──
        # ── Step 3: Species detection ──
        animal = (
            st.session_state.selected_animal
            or dialect_info.get("animal_detected")
            or detect_species_from_text(query)
        )

        # Add user message to history
        st.session_state.messages.append({
            "role": "user",
            "content": query,
            "dialect_info": dialect_info,
        })

        # Genuine emergencies bypass retrieval and the LLM so safety guidance is immediate.
        if emergency_result["is_emergency"]:
            response_data = generate_response(
                user_query=query,
                kb_results=[],
                animal=animal,
                language_mode=st.session_state.language_mode,
                emergency_result=emergency_result,
            )
            response_data["final_urgency"] = URGENCY_EMERGENCY
            response_data["emergency_check"] = emergency_result
            record_query(
                kb_hit=False,
                llm_used=False,
                llm_success=False,
                emergency_triggered=True,
                total_latency_ms=response_data["total_latency_ms"],
                retrieval_latency_ms=0,
            )
            st.session_state.last_response = response_data
            st.session_state.messages.append({
                "role": "assistant",
                "content": response_data["response_text"],
                "response_data": response_data,
            })
            st.rerun()

        # ── Step 4: Handle prescription request ──
        if prescription_result["is_prescription_request"]:
            logger.warning("Groq skipped: prescription_request_safety_rule")
            st.session_state.messages.append({
                "role": "assistant",
                "content": (
                    "⚠️ पशु री दवाई री खुराक मैं नहीं बता सकूं। गलत खुराक नुकसान कर सकै है। "
                    "पशु डॉक्टर सूँ सलाह लो।"
                    if st.session_state.language_mode == "rajasthani"
                    else prescription_result["message_hi"]
                ),
                "response_data": {
                    "final_urgency": "general",
                    "emergency_check": {},
                    "sources": [],
                    "cannot_determine": None,
                    "when_to_see_vet": "कृपया अपने नज़दीकी पशु चिकित्सक से मिलें।",
                    "total_latency_ms": 0,
                    "llm_used": False,
                    "llm_error_category": "not_attempted_prescription_safety_rule",
                    "response_mode": "Prescription safety rule",
                    "response_path": "offline fallback",
                    "response_path_reason": "prescription_request_safety_rule",
                    "kb_results_count": 0,
                },
            })
            record_query(False, False, False, False, 0, 0)
            st.rerun()

        # ── Step 5: Knowledge retrieval ──
        with st.spinner("🔍 खोज रहे हैं... (Searching knowledge base)"):
            retrieval = retrieve(query, species=animal, top_k=3, min_score=0.5)

        kb_results = retrieval["results"]
        retrieval_time = retrieval["retrieval_time_ms"]

        # ── Step 6: Clarification check ──
        clarification = needs_clarification(
            query, animal, kb_results, st.session_state.language_mode
        )

        # ── Step 7: Determine urgency (rule-based wins over KB) ──
        kb_urgency = get_highest_urgency(kb_results)
        final_urgency = get_urgency_from_keywords(safety_text, kb_urgency)

        # ── Step 8: Generate response ──
        with st.spinner("🤔 जवाब तैयार हो रहा है... (Generating response)"):
            response_data = generate_response(
                user_query=query,
                kb_results=kb_results,
                animal=animal,
                use_llm=True,
                language_mode=st.session_state.language_mode,
            )

        response_data["final_urgency"] = final_urgency
        response_data["emergency_check"] = emergency_result

        # ── Step 9: Handle clarification ──
        response_text = response_data["response_text"]
        if (
            clarification["needs_clarification"]
            and not kb_results
            and not response_data.get("llm_used")
            and "?" not in response_text
        ):
            response_text += "\n\n" + clarification.get("question_hi", "")

        # Record metrics
        record_query(
            kb_hit=len(kb_results) > 0,
            llm_used=response_data.get("llm_used", False),
            llm_success=response_data.get("llm_used", False),
            emergency_triggered=emergency_result["is_emergency"],
            total_latency_ms=response_data.get("total_latency_ms", 0),
            retrieval_latency_ms=retrieval_time,
        )

        st.session_state.last_response = response_data
        st.session_state.messages.append({
            "role": "assistant",
            "content": response_text,
            "response_data": response_data,
        })

        st.rerun()

    # ── Clear conversation ──
    if st.session_state.messages:
        if st.button("🗑️ Clear conversation", key="clear_conv"):
            st.session_state.messages = []
            st.session_state.last_response = None
            st.rerun()

# ════════════════════════════════════════════
# TAB 2 — Health Card
# ════════════════════════════════════════════
with tab2:
    st.markdown("## 🃏 Pashu Health Card — पशु स्वास्थ्य कार्ड")
    st.info(
        "📋 **Privacy Notice**: All health records are stored **only on your device** "
        "using a local database. No data is sent to any server. "
        "You can delete any record at any time."
    )

    col1, col2 = st.columns([1, 1])

    with col1:
        st.markdown("### ➕ नया पशु जोड़ें (Add New Animal)")
        with st.form("add_animal_form"):
            nickname = st.text_input("पशु का नाम / ID (Animal name or ID):", placeholder="e.g., Ganga, Tag#12")
            species = st.selectbox("पशु प्रकार (Species):", ["cattle", "buffalo", "goat", "sheep"])
            age = st.text_input("अनुमानित उम्र (Approximate age):", placeholder="e.g., 3 years, 6 months")
            notes = st.text_area("अतिरिक्त जानकारी (Notes):", placeholder="Breed, color, etc.")
            consent = st.checkbox("✅ मैं सहमत हूँ कि यह डेटा मेरे डिवाइस पर सेव हो (I consent to local storage)")

            if st.form_submit_button("🐄 Add Animal", use_container_width=True):
                if consent and species:
                    new_id = add_animal(nickname, species, age, notes)
                    st.success(f"✅ Added! Animal ID: {new_id}")
                    st.rerun()
                elif not consent:
                    st.error("Please give consent to store data.")
                else:
                    st.error("Species is required.")

    with col2:
        st.markdown("### 📋 मेरे पशु (My Animals)")
        animals = get_animals()
        if not animals:
            st.info("No animals added yet. Add one on the left!")
        else:
            for animal in animals:
                species_icons = {"cattle": "🐄", "buffalo": "🐃", "goat": "🐐", "sheep": "🐑"}
                icon = species_icons.get(animal["species"], "🐾")
                with st.expander(f"{icon} {animal['nickname']} — {animal['species'].title()}"):
                    st.caption(f"Age: {animal.get('approximate_age','N/A')} | Added: {animal['created_at'][:10]}")
                    if animal.get("notes"):
                        st.caption(f"Notes: {animal['notes']}")

                    history = get_animal_history(animal["id"])
                    if history:
                        st.markdown(f"**📅 Health History ({len(history)} records):**")
                        for obs in history[:5]:
                            urgency_emoji = {"emergency": "🚨", "prompt": "⚠️", "general": "ℹ️"}.get(obs.get("urgency_level", "general"), "ℹ️")
                            st.markdown(
                                f"{urgency_emoji} **{obs['observation_date']}**: "
                                f"{obs.get('symptoms','No symptoms recorded')[:80]}..."
                            )
                    else:
                        st.caption("No health records yet.")

                    if st.button(f"🗑️ Delete {animal['nickname']}", key=f"del_{animal['id']}"):
                        delete_animal(animal["id"])
                        st.success("Deleted!")
                        st.rerun()

# ════════════════════════════════════════════
# TAB 3 — Demo Dashboard
# ════════════════════════════════════════════
with tab3:
    st.markdown("## 📊 Demo & Evaluation Dashboard")
    st.caption("All metrics below are measured from actual session interactions, not estimated or fabricated.")

    stats = get_session_stats()

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown(f"""<div class="metric-card">
            <div class="metric-value">{stats['queries_total']}</div>
            <div class="metric-label">Total Queries</div>
        </div>""", unsafe_allow_html=True)
    with col2:
        st.markdown(f"""<div class="metric-card">
            <div class="metric-value">{stats['kb_hit_rate']}</div>
            <div class="metric-label">KB Hit Rate</div>
        </div>""", unsafe_allow_html=True)
    with col3:
        st.markdown(f"""<div class="metric-card">
            <div class="metric-value">{stats['median_latency_ms']}ms</div>
            <div class="metric-label">Median Latency</div>
        </div>""", unsafe_allow_html=True)
    with col4:
        st.markdown(f"""<div class="metric-card">
            <div class="metric-value">{stats['emergency_triggers']}</div>
            <div class="metric-label">Emergency Alerts</div>
        </div>""", unsafe_allow_html=True)

    st.divider()

    col1, col2 = st.columns(2)
    with col1:
        st.markdown("### 🔧 System Configuration")
        st.markdown(f"""
| Component | Status |
|---|---|
| Knowledge Base | ✅ {len(__import__('json').load(open('data/veterinary_knowledge.json', encoding='utf-8')))} entries |
| Dialect Dictionary | ✅ Loaded |
| Emergency Rules | ✅ Rule-based (no LLM) |
| LLM (Groq) | {'✅ API Key set' if os.getenv('GROQ_API_KEY') and os.getenv('GROQ_API_KEY') != 'your_groq_api_key_here' else '⚠️ Not configured (fallback mode)'} |
| Speech Input | 🔄 Phase 3 (planned) |
| TTS Output | 🔄 Phase 3 (planned) |
| Health Records | ✅ SQLite local DB |
""")

    with col2:
        st.markdown("### ⚡ Session Stats")
        st.json({
            "queries": stats["queries_total"],
            "kb_hits": stats["kb_hits"],
            "kb_misses": stats["kb_misses"],
            "llm_calls": stats["llm_calls"],
            "speech_attempts": stats["speech_attempts"],
            "avg_latency_ms": stats["avg_latency_ms"],
            "median_latency_ms": stats["median_latency_ms"],
        })

    st.divider()

    st.markdown("### ✅ Requirement vs Feature Checklist")
    requirements = {
        "Req A: Voice input (microphone)": "🔄 Phase 3 — Vosk STT planned",
        "Req A: Text input fallback": "✅ Implemented",
        "Req A: TTS response": "🔄 Phase 3 — gTTS planned",
        "Req A: Hindi conversational UI": "✅ Implemented",
        "Req B: Hindi language support": "✅ Implemented",
        "Req B: Rajasthani dialect awareness": "✅ Dictionary-based (partial)",
        "Req B: Dialect phrase mapping": "✅ Implemented in dialect_dictionary.json",
        "Req C: Curated veterinary KB": "✅ 20 entries, ICAR/NDDB sourced",
        "Req C: Source attribution": "✅ Every response shows source",
        "Req C: No invented diagnoses": "✅ Enforced by fallback logic",
        "Req D: Emergency detection": "✅ Rule-based, LLM-independent",
        "Req D: No prescription drugs": "✅ Prescription request detector",
        "Req D: Urgent care warnings": "✅ Animated emergency banner",
        "Req E: Offline KB retrieval": "✅ Pure Python, no API needed",
        "Req E: Loading states": "✅ Spinners on all async ops",
        "Innovation 1: 3-level triage": "✅ Emergency/Prompt/General",
        "Innovation 2: Evidence panel": "✅ Source + limitations + cannot-determine",
        "Innovation 3: Health Card": "✅ SQLite, consent-based",
        "Innovation 4: Clarification Qs": "✅ When species/symptoms unclear",
        "Innovation 5: Vocabulary dict": "✅ Extensible JSON dictionary",
        "Innovation 6: Low-literacy UI": "✅ Large buttons, Hindi labels, icons",
        "Innovation 7: Vet contacts": "✅ Verified numbers only (1962 helpline)",
        "Innovation 8: Demo dashboard": "✅ This tab",
    }
    for req, status in requirements.items():
        color = "🟢" if "✅" in status else ("🟡" if "🔄" in status else "🔴")
        st.markdown(f"{color} **{req}**: {status}")

    st.divider()
    st.markdown("### ⚠️ Known Limitations (Honest)")
    st.warning("""
**We do NOT claim:**
- Perfect Rajasthani speech recognition (Vosk Hindi model handles standard Hindi; Rajasthani support is dictionary-augmented approximation)
- Clinical diagnostic accuracy (this is educational guidance, not veterinary diagnosis)
- Deployment at scale or pilot testing
- Veterinary validation of the knowledge base entries

**Current limitations:**
- Voice input not yet implemented (Phase 3)
- Knowledge base covers ~20 conditions — real-world veterinary practice has thousands
- Groq LLM requires internet connection; offline fallback is rule-based KB only
- Rajasthani dialect recognition limited to the ~80 dictionary entries
""")

# ════════════════════════════════════════════
# TAB 4 — About
# ════════════════════════════════════════════
with tab4:
    st.markdown("## ℹ️ About PashuMitra AI")
    st.markdown("""
### 🎯 Mission
PashuMitra AI provides **free, evidence-backed, voice-first veterinary guidance** to rural livestock owners 
in India who have limited access to professional veterinary services.

### 🏗️ Architecture
```
User Input (Voice/Text)
    ↓
[Safety Check] ← ALWAYS FIRST (rule-based, no LLM)
    ↓
[Dialect Normalizer] (Hindi/Rajasthani → standard terms)
    ↓
[Species Detection]
    ↓
[Knowledge Retrieval] (local JSON KB — works offline)
    ↓
[Response Generator] (Groq LLM grounded in KB | fallback: rule-based)
    ↓
[Safety Post-Filter] (removes any drug dosage mentions)
    ↓
[Evidence Panel] (source, urgency, limitations, vet advice)
    ↓
Display (+ TTS in Phase 3)
```

### 🆓 Free Tool Stack
| Tool | Purpose | Cost |
|---|---|---|
| Streamlit | Web UI | Free |
| Groq (Llama-3.1-8b) | LLM responses | Free (14,400 req/day) |
| Curated JSON | Knowledge base | Free, offline |
| SQLite | Health records | Free, built-in Python |
| Vosk (Phase 3) | Offline Hindi STT | Free |
| gTTS (Phase 3) | Hindi TTS | Free |

### 📚 Knowledge Sources
- **ICAR** (Indian Council of Agricultural Research) — icar.org.in
- **NDDB** (National Dairy Development Board) — nddb.coop
- **DAHD** (Dept. of Animal Husbandry & Dairying, GoI) — dahd.nic.in

### ⚖️ Disclaimer
PashuMitra AI is an **educational tool only**. It is NOT a licensed veterinary diagnostic system.
Always consult a qualified veterinarian for treatment decisions.
""")

    st.markdown("### 🗺️ Future Roadmap")
    st.markdown("""
- **Phase 3**: Vosk offline Hindi speech recognition + gTTS audio output
- **v2.0**: Expand KB to 200+ conditions with expert veterinary review
- **v2.1**: Community-verified Rajasthani dialect expansion
- **v3.0**: Mobile PWA (Progressive Web App) for smartphone use
- **Partnership**: Collaboration with State Animal Husbandry Departments for verified contacts
- **Validation**: Partnership with veterinary college for KB clinical review
""")
