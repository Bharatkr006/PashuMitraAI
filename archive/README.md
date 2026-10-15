# Archive

This directory stores archived legacy prototypes and reference artifacts that have been replaced by the modern production stack.

## Contents

- **`python_prototype/`**: The original Python + Streamlit prototype (`app.py`, `core/`, `tests/`, `requirements.txt`).
  - All core veterinary logic (safety rules, dialect normalization, knowledge base retrieval, response generation, health records, and metrics) has been ported into the modern TypeScript full-stack monorepo under `server/` and `client/`.
  - Retained solely for historical reference and validation.
