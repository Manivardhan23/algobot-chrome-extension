import os
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Initialize Gemini Client
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

app = FastAPI(title="AlgoBot Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str

class CodeContext(BaseModel):
    problem_title: str
    code: str
    user_query: str | None = "I need a hint"
    history: list[ChatMessage] = []
    preferred_model: str | None = None  # if set, use only this model

class HintsRequest(BaseModel):
    problem_title: str
    code: str
    preferred_model: str | None = None  # if set, use only this model

# Models to try in order — confirmed available on this API key
MODELS = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash"]

CHAT_SYSTEM_PROMPT = """You are an expert technical interviewer helping a candidate solve a LeetCode/NeetCode problem.

CRITICAL RULES:
1. DO NOT give them the final code or the complete solution.
2. Point out logical flaws, incorrect edge cases, or syntax errors in their logic.
3. Give a conceptual hint to guide them toward the optimal approach.
4. If they ask follow-up questions, remember the context of the full conversation.
5. Keep your response brief, encouraging, and under 5 sentences.
6. You may use plain text or very simple formatting — no long markdown blocks."""

HINTS_SYSTEM_PROMPT = """You are an expert coding mentor. Given a LeetCode/NeetCode problem title and the candidate's current code, generate exactly 4 progressive hints in JSON format.

The hints must escalate in specificity:
- Hint 1 (Basic): A high-level nudge about the general problem category or pattern. No algorithm names. No code.
- Hint 2 (Approach): Name the algorithm or data structure and explain why it fits. Still no code.
- Hint 3 (Implementation): Give a concrete step-by-step breakdown of the logic. Pseudocode is okay.
- Hint 4 (Full Solution): Provide the complete working solution with a brief explanation.

Respond ONLY with valid JSON in this exact format, no extra text:
{
  "hints": [
    "Hint 1 text here",
    "Hint 2 text here",
    "Hint 3 text here",
    "Hint 4 text here"
  ]
}"""


async def call_gemini(prompt: str, system: str, history: list = None, preferred_model: str = None):
    """
    Try a single model (preferred_model or primary default).
    Returns (text, status) where status is None | 'overloaded' | 'error'.
    """
    model_name = preferred_model or MODELS[0]
    try:
        print(f"Trying model: {model_name}")
        if history is not None:
            chat = client.chats.create(
                model=model_name,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=0.6,
                ),
                history=history,
            )
            response = chat.send_message(prompt)
        else:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=0.4,
                ),
            )
        print(f"✅ Success with model: {model_name}")
        return response.text, None
    except Exception as e:
        error_str = str(e)
        print(f"❌ Model {model_name} failed: {error_str}")
        is_overload = any(c in error_str for c in ["503", "UNAVAILABLE", "429", "404", "NOT_FOUND"]) \
                      or "quota" in error_str.lower()
        return None, "overloaded" if is_overload else "error"


@app.get("/")
def health_check():
    return {"status": "AlgoBot backend is running!"}


@app.post("/get-hint")
async def get_hint(data: CodeContext):
    print(f"\n--- Chat: {data.problem_title} | model: {data.preferred_model or MODELS[0]} ---")

    gemini_history = []
    for msg in data.history:
        role = "user" if msg.role == "user" else "model"
        gemini_history.append(
            types.Content(role=role, parts=[types.Part(text=msg.content)])
        )

    current_user_message = f"""Problem: {data.problem_title}

My current code:
```
{data.code}
```

My question: {data.user_query}"""

    text, status = await call_gemini(
        current_user_message, CHAT_SYSTEM_PROMPT,
        history=gemini_history,
        preferred_model=data.preferred_model
    )

    if text:
        return {"status": "success", "hint": text, "user_message": current_user_message}
    elif status == "overloaded":
        return {
            "status": "overloaded",
            "tried_model": data.preferred_model or MODELS[0],
            "user_message": current_user_message,
        }
    else:
        return {
            "status": "error",
            "hint": "⚠️ Something went wrong. Please try again.",
            "user_message": current_user_message,
        }


@app.post("/get-progressive-hints")
async def get_progressive_hints(data: HintsRequest):
    print(f"\n--- Hints: {data.problem_title} | model: {data.preferred_model or MODELS[0]} ---")

    prompt = f"""Problem: {data.problem_title}

Candidate's current code:
```
{data.code}
```

Generate 4 progressive hints as described."""

    text, status = await call_gemini(
        prompt, HINTS_SYSTEM_PROMPT,
        preferred_model=data.preferred_model
    )

    if text:
        try:
            # Strip markdown code fences if model wraps them
            clean = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            parsed = json.loads(clean)
            return {"status": "success", "hints": parsed["hints"]}
        except Exception as e:
            print(f"JSON parse error: {e}\nRaw: {text}")
            return {"status": "error", "hints": []}
    elif status == "overloaded":
        return {
            "status": "overloaded",
            "tried_model": data.preferred_model or MODELS[0],
            "hints": []
        }
    else:
        return {"status": "error", "hints": []}