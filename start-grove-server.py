"""Run the site on this computer with the AI Grove Guide working.

    py start-grove-server.py        (Windows)
    python3 start-grove-server.py   (Mac / Linux)

then open http://localhost:8000

It serves the website and answers /api/grove-guide by calling Google's Gemini with the
API key, which stays on this computer and is never sent to the browser. The key is read
from the GEMINI_API_KEY environment variable, else from a .env file next to this script
(one line: GEMINI_API_KEY=your-key), else you are asked to paste it when the server starts.

The prompts and limits here match server/grove-guide-worker.js (the Cloudflare version);
change both together.
"""

import getpass
import http.server
import json
import os
import re
import threading
import time
import urllib.error
import urllib.request
from collections import defaultdict, deque

PORT = 8000
ROOT = os.path.dirname(os.path.abspath(__file__))
MODEL = "gemini-flash-lite-latest"  # Google's cheapest current model; plenty for short reports.

# Cost limits. Each report allows 8 questions (enforced in the browser); the server also
# refuses oversized requests and more than 30 requests per hour from one address.
MAX_MESSAGES = 16
MAX_MESSAGE_CHARS = 500   # a player's question
MAX_REPLY_CHARS = 2000    # an earlier Guide reply sent back as conversation history
MAX_REPORT_CHARS = 15000
MAX_OUTPUT_TOKENS = {"summary": 450, "chat": 350}
REQUESTS_PER_HOUR = 30
FREE_LIMIT_MESSAGE = "The Grove Guide has answered a lot of questions today and is resting. Please try again later or tomorrow!"

SYSTEM_PROMPT = """You are the Grove Guide, a warm, encouraging mentor inside "Into the Unknown", a \
choose-your-own-adventure game where a princess crosses an enchanted forest to rescue a prince. \
The game teaches young players money ideas: needs versus wants, opportunity cost, saving, \
interest, risk, insurance, scams, and the value of time, relationships, and information.

Below is the player's journey report as JSON. The game calculated the score and each choice's \
rating ("wise", "fair", "risky") from its answer key, with the reason in "why" and better \
choices that were available in "wiserOptions". Treat these as correct; do not re-score or dispute them.

Rules:
- Speak to the player directly as "you". Use friendly, simple language suitable for ages 10 to 16.
- Ground every point in specific choices and outcomes from the report.
- Be honest about risky choices but kind and encouraging; never shame the player.
- Connect choices to the real-world money idea behind them, with short everyday examples.
- This is a learning game, not personal financial advice. Do not recommend real financial \
products, companies, or investments.
- Only discuss this journey and the money ideas in it. If asked about anything else, \
kindly steer back to the journey.
- Never ask for personal information such as names, ages, addresses, or contact details.
- Keep answers short: at most about 120 words in chat. Use plain text; use "- " for bullet points.

Journey report:
"""

SUMMARY_REQUEST = """Write my journey reflection in plain text, under 170 words:
- one opening sentence about my journey overall and my score,
- the line "What you did well:" followed by 2 or 3 bullet points,
- the line "What to try next time:" followed by 2 or 3 bullet points,
- one encouraging closing sentence."""


def load_api_key():
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    env_path = os.path.join(ROOT, ".env")
    if not key and os.path.exists(env_path):
        with open(env_path, encoding="utf-8") as env_file:
            for line in env_file:
                name, _, value = line.partition("=")
                if name.strip() == "GEMINI_API_KEY":
                    key = value.strip().strip('"').strip("'")
    if not key:
        key = getpass.getpass("Paste your Gemini API key (it will not be shown or saved): ").strip()
    return key


API_KEY = ""
recent_requests = defaultdict(deque)
rate_lock = threading.Lock()


def allow_request(address):
    now = time.time()
    with rate_lock:
        times = recent_requests[address]
        while times and now - times[0] > 3600:
            times.popleft()
        if len(times) >= REQUESTS_PER_HOUR:
            return False
        times.append(now)
        return True


def build_gemini_request(body):
    """Validates the browser's request and turns it into a Gemini request, or raises ValueError."""
    mode = body.get("mode")
    report = body.get("report")
    messages = body.get("messages") or []
    if mode not in MAX_OUTPUT_TOKENS or not isinstance(report, dict) or not isinstance(messages, list):
        raise ValueError("Invalid request.")
    report_json = json.dumps(report, ensure_ascii=False)
    if len(report_json) > MAX_REPORT_CHARS:
        raise ValueError("This report is too large.")

    if mode == "summary":
        contents = [{"role": "user", "parts": [{"text": SUMMARY_REQUEST}]}]
    else:
        if not messages or len(messages) > MAX_MESSAGES:
            raise ValueError("This conversation has reached its limit.")
        contents = []
        for message in messages:
            role, text = (message or {}).get("role"), (message or {}).get("text")
            if role not in ("user", "model") or not isinstance(text, str) or not text.strip():
                raise ValueError("Invalid message.")
            limit = MAX_REPLY_CHARS if role == "model" else MAX_MESSAGE_CHARS
            contents.append({"role": role, "parts": [{"text": text[:limit]}]})
        if contents[-1]["role"] != "user":
            raise ValueError("Invalid conversation.")

    return {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT + report_json}]},
        "contents": contents,
        "generationConfig": {"maxOutputTokens": MAX_OUTPUT_TOKENS[mode], "temperature": 0.6},
    }


def call_gemini(payload):
    request = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": API_KEY},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        data = json.load(response)
    parts = (data.get("candidates") or [{}])[0].get("content", {}).get("parts", [])
    return "".join(part.get("text", "") for part in parts).strip()


class GroveHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    # Also answer pages opened from another server on this computer, such as VS Code's
    # Live Server (http://127.0.0.1:5500). Pages from anywhere else are not allowed.
    def send_local_cors_headers(self):
        origin = self.headers.get("Origin", "")
        if re.fullmatch(r"http://(localhost|127\.0\.0\.1)(:\d+)?", origin):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Vary", "Origin")

    def do_OPTIONS(self):
        self.send_response(204 if self.path == "/api/grove-guide" else 404)
        self.send_local_cors_headers()
        self.end_headers()

    def send_json(self, status, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_local_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/api/grove-guide":
            self.send_json(404, {"error": "Not found."})
            return
        if not allow_request(self.client_address[0]):
            self.send_json(429, {"error": "The Grove Guide needs a short rest. Please try again later."})
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            if length > 40000:
                raise ValueError("This request is too large.")
            payload = build_gemini_request(json.loads(self.rfile.read(length) or b"{}"))
        except (ValueError, json.JSONDecodeError) as error:
            self.send_json(400, {"error": str(error) if isinstance(error, ValueError) else "Invalid request."})
            return
        try:
            text = call_gemini(payload)
        except urllib.error.HTTPError as error:
            # On Google's free tier, running out of the daily allowance returns 429; nothing is charged.
            if error.code == 429:
                self.send_json(429, {"error": FREE_LIMIT_MESSAGE})
                return
            print(f"Gemini error {error.code}: {error.read()[:500]!r}")
            self.send_json(502, {"error": "The Grove Guide could not answer right now. Please try again."})
            return
        except (urllib.error.URLError, TimeoutError) as error:
            print(f"Could not reach Gemini: {error}")
            self.send_json(502, {"error": "The Grove Guide could not be reached. Check the internet connection."})
            return
        if not text:
            self.send_json(502, {"error": "The Grove Guide had nothing to say to that. Try asking another way."})
            return
        self.send_json(200, {"text": text})

    # Python's built-in server ignores "Range" requests, which browsers need to seek in a video
    # (the scroll-driven intro rewinds). Serve the requested slice of the file when asked.
    def send_head(self):
        range_header = self.headers.get("Range")
        match = re.fullmatch(r"bytes=(\d*)-(\d*)", range_header or "")
        path = self.translate_path(self.path)
        if not match or not os.path.isfile(path):
            return super().send_head()
        size = os.path.getsize(path)
        start_text, end_text = match.groups()
        if start_text:
            start, end = int(start_text), int(end_text) if end_text else size - 1
        else:
            start, end = max(0, size - int(end_text or 0)), size - 1
        end = min(end, size - 1)
        if start > end:
            self.send_error(416, "Requested range not satisfiable")
            return None
        file = open(path, "rb")
        file.seek(start)
        self.range_remaining = end - start + 1
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(self.range_remaining))
        self.end_headers()
        return file

    def copyfile(self, source, outputfile):
        remaining = getattr(self, "range_remaining", None)
        if remaining is None:
            super().copyfile(source, outputfile)
            return
        while remaining > 0:
            chunk = source.read(min(65536, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)
        self.range_remaining = None

    def log_message(self, format, *args):
        if self.command == "POST":
            super().log_message(format, *args)


if __name__ == "__main__":
    API_KEY = load_api_key()
    if not API_KEY:
        raise SystemExit("No API key given, so the Grove Guide cannot start.")
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), GroveHandler)
    print(f"Into the Unknown is running at http://localhost:{PORT}  (press Ctrl+C to stop)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
