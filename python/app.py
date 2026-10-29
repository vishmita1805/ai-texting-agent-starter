"""Python version of the AI texting agent, using FastAPI.

Run:  uvicorn app:app --reload --port 3000
"""
import os
import time
from collections import defaultdict

from dotenv import load_dotenv
from fastapi import FastAPI, Form, Response
from openai import OpenAI
from twilio.twiml.messaging_response import MessagingResponse

load_dotenv()

SYSTEM_PROMPT = os.getenv(
    "SYSTEM_PROMPT",
    "You are a friendly assistant replying over text message. "
    "Keep replies short, in plain text, and under 300 characters.",
)
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
MAX_TURNS = int(os.getenv("MAX_TURNS", "10"))
TTL_SECONDS = 24 * 60 * 60
SMS_MAX_CHARS = 1500

client = OpenAI()
app = FastAPI(title="AI Texting Agent")

# conversation id (phone number) -> list of {"role", "content", "at"}
memory: dict[str, list[dict]] = defaultdict(list)


def history_for(sender: str) -> list[dict]:
    fresh = [t for t in memory[sender] if time.time() - t["at"] < TTL_SECONDS]
    memory[sender] = fresh[-MAX_TURNS * 2 :]
    return memory[sender]


def ask_model(sender: str, text: str) -> str:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += [{"role": t["role"], "content": t["content"]} for t in history_for(sender)]
    messages.append({"role": "user", "content": text})
    res = client.chat.completions.create(model=MODEL, messages=messages, max_tokens=300)
    reply = (res.choices[0].message.content or "").strip()
    return reply[: SMS_MAX_CHARS - 1] + "…" if len(reply) > SMS_MAX_CHARS else reply


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/webhooks/sms")
def sms_webhook(From: str = Form(...), Body: str = Form("")):
    text = Body.strip()
    if text.lower() in ("reset", "start over"):
        memory.pop(From, None)
        reply = "Conversation cleared. What can I help with?"
    elif not text:
        reply = "Send me a message and I will reply."
    else:
        try:
            reply = ask_model(From, text) or "Sorry, I did not catch that. Could you rephrase?"
            now = time.time()
            memory[From] += [
                {"role": "user", "content": text, "at": now},
                {"role": "assistant", "content": reply, "at": now},
            ]
        except Exception as err:  # keep the conversation alive if the model fails
            print("LLM request failed:", err)
            reply = "Sorry, I had trouble answering that. Please try again in a moment."

    twiml = MessagingResponse()
    twiml.message(reply)
    return Response(content=str(twiml), media_type="text/xml")
