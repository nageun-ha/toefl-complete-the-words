import os
import json
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from google import genai
from google.genai import types

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY or GEMINI_API_KEY == "your_api_key_here":
    logging.warning(
        "GEMINI_API_KEY is not set. "
        "Please set it in the .env file at the project root."
    )

client = genai.Client(api_key=GEMINI_API_KEY)

SYSTEM_INSTRUCTION = """\
You are an expert TOEFL iBT test developer. Your task is to generate a 'Complete the Words' reading practice problem and output it in a strict JSON format.

[Requirements for the Passage]
1. Topic: Choose a random core TOEFL academic topic, strictly balancing between the following four areas. Do NOT let Natural Sciences dominate:
   - Category A (Humanities & Arts): Art History, Architecture, Music Theory, Literature, Philosophy, Theater.
   - Category B (Social Sciences): Psychology, Sociology, Economics, Linguistics, Cultural Anthropology, Political Science.
   - Category C (History & Archaeology): Ancient Civilizations, Medieval History, Industrial Revolution, Migration Patterns, Trade Routes.
   - Category D (Natural Sciences): Astronomy, Biology/Ecology, Geology/Meteorology, Physics/Chemistry history. (Limit this category to less than 25% of your total generations).
2. Length & Difficulty: A single paragraph of 100-150 words, written at a US university undergraduate textbook level. Use advanced academic vocabulary (Tier 3 words), complex sentence structures (e.g., passive voice, subordinate clauses), and maintain a strictly objective, formal tone. Do not use conversational filler.

[Logic for 'Complete the Words' Masking]
1. Boundary Sentence Rule: The FIRST sentence and the LAST sentence of the paragraph MUST remain completely intact with NO blanks (no masking).
2. Target Selection: From the sentences in between (excluding the first and last), select exactly 10 target words.
3. Target Criteria: Words must be nouns, verbs, or adjectives with a length of 5 letters or more.
4. Masking Rule: For each target word, keep the first half of the letters and replace the remaining letters with underscores (_). 
   Formula: 
   - Let N = total length of the word.
   - Number of visible prefix letters (P) = floor(N / 2)
   - Number of underscores (U) = N - P
   - U MUST be exactly equal to the count of '_' characters in the masked word.
   - Example 1 (Even Length): "formation" (N=9, P=4, U=5) -> "form" + "_____" -> "form_____" (Exactly 5 underscores)
   - Example 2 (Odd Length): "vital" (N=5, P=2, U=3) -> "vi" + "___" -> "vi___" (Exactly 3 underscores)
   - Example 3 (Even Length): "process" (N=7, P=3, U=4) -> "pro" + "____" -> "pro____" (Exactly 4 underscores)
   - Example 4 (Long Word): "gravitationally" (N=15, P=7, U=8) -> "gravita" + "________" -> "gravita________" (Exactly 8 underscores)

[Self-Verification Rule]
Before finalizing the output, you MUST verify the character counts for each target word:
1. Count the exact number of characters in the original target word (N).
2. Count the exact number of letters in the visible prefix (P).
3. Count the exact number of underscores in the masked word (U).
4. Double-check that: P + U == N. If it does not match, you must regenerate the masked word with the correct number of underscores.
5. Verify that the array of "answers" contains the exact original words corresponding to the masked words in order.

[Output Format]
You must return ONLY a valid JSON object with the following exact keys:
{
  "topic": "String. The specific subject of the paragraph.",
  "original_paragraph": "String. The complete, unmodified text.",
  "masked_paragraph": "String. The text with the target words masked according to the rules above.",
  "answers": ["Array of Strings. The original target words in the order they appear."]
}
"""

MODEL_NAME = "gemini-2.5-flash"

# ---------------------------------------------------------------------------
# FastAPI Application
# ---------------------------------------------------------------------------

app = FastAPI(title="TOEFL iBT Complete the Words")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/generate-problem")
async def generate_problem():
    """Call Gemini API to generate a new Complete-the-Words problem."""
    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents="Generate a new TOEFL iBT 'Complete the Words' exercise. "
                     "Choose a topic randomly from Category A (Humanities & Arts), Category B (Social Sciences), or Category C (History & Archaeology). "
                     "Only choose Category D (Natural Sciences) occasionally. "
                     "Ensure you hide exactly 10 target academic words inside the paragraph.",
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                temperature=0.9,
            ),
        )
        data = json.loads(response.text)

        # Validate required fields
        required_keys = {"topic", "original_paragraph", "masked_paragraph", "answers"}
        if not required_keys.issubset(data.keys()):
            missing = required_keys - set(data.keys())
            raise ValueError(f"Missing keys in Gemini response: {missing}")

        if not isinstance(data["answers"], list) or len(data["answers"]) == 0:
            raise ValueError("answers must be a non-empty list")

        # Post-process: Programmatically correct the number of underscores
        # to ensure it strictly matches the expected answer length.
        import re
        def sanitize_masked_paragraph(masked_text, answers_list):
            pattern = re.compile(r'([a-zA-Z]*)(_+)')
            ans_idx = 0
            
            def replace_match(match):
                nonlocal ans_idx
                if ans_idx >= len(answers_list):
                    return match.group(0)
                
                prefix = match.group(1)
                expected_word = answers_list[ans_idx]
                
                if expected_word.lower().startswith(prefix.lower()):
                    correct_underscores = len(expected_word) - len(prefix)
                    ans_idx += 1
                    return prefix + ("_" * correct_underscores)
                
                return match.group(0)
                
            return pattern.sub(replace_match, masked_text)

        data["masked_paragraph"] = sanitize_masked_paragraph(data["masked_paragraph"], data["answers"])

        return data

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini returned invalid JSON: {str(e)}",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini response validation failed: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate problem: {str(e)}",
        )


# ---------------------------------------------------------------------------
# Serve Frontend Static Files (mount AFTER API routes)
# ---------------------------------------------------------------------------

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.isdir(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
