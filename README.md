# Into the Unknown

A choose-your-own-adventure about money choices. A princess travels through the Enchanted Forest to reach the Tower of Shadows and rescue Prince Ellis.

## Play

Serve the project over HTTP (for example, with VS Code Live Server or GitHub Pages) and open its page in a browser; double-clicking `index.html` uses `file://` and prevents some browsers from loading the local narration MP3. The game is plain HTML, CSS, and JavaScript; there is no build step. Enter a name and email on the opening screen; the name personalizes the princess throughout the story. Contact details stay in memory for the current browser session and are not sent to or saved on a server. Each journey rolls a starting purse of 50, 75, 100, 150, or 200 gold. Choices affect gold, health, supplies, reputation, inventory, and the ending.

Use the site menu to visit the About, Resources, and My Profile pages. Completed journeys and their reports are saved in local browser storage on the device you played on; they are not uploaded to a server. The one exception is the optional Grove Guide: if a player uses it, that report's choices (never their name or email) are sent to Google's Gemini AI. See "Journey report and Grove Guide" below.

## Story video

After a player enters their name and email and opens the story, `assets/Story_withPinkHair.mp4` plays full screen with sound, and the adventure's first choice appears when it ends. "Skip story" goes straight to the first choice. The sound button in the top bar mutes and unmutes the video. If the video cannot play, an on-screen message points the player to "Skip story". The player's starting gold is shown in the resource bar once the adventure begins.

`assets/audio/enchanted-grove-intro.mp3`, the earlier narration recording, is no longer used.

Do not put an ElevenLabs API key in browser code or commit one to GitHub.

## Journey report and Grove Guide

When a journey ends, the game scores it and saves a report with it. The ending screen and the journey list in My Profile link to that report.

- **Scoring is done by the game, not the AI.** Each choice is rated *wise*, *fair*, or *risky* by the answer key at the top of `journey-report.js`, using the player's gold and items at the moment they chose. Wise counts 2 points, fair 1, risky 0; the score is the percentage of the maximum. Choosing a trail is never scored. To change a rating or its explanation, edit the answer key.
- **The Grove Guide is an AI (Google Gemini)** that writes a short reflection on the report and answers the player's questions about it. It only receives the report: choices, outcomes, and ratings. The player's name and email are never sent.

### The API key stays on a server, never in the site

Everything in this repository is downloaded by every visitor's browser, so a key placed in any of these files can be copied and used by anyone. (Google also automatically disables keys it finds in public GitHub repositories.) The Gemini key lives only in a small private middleman. The browser sends the report there, and the middleman adds the key and calls Gemini.

### Keeping it free

Both pieces cost nothing:

- **Gemini's free tier.** A Gemini API key is free as long as the Google Cloud project behind it has **no billing account attached**. Without billing, Google cannot charge anything. When the free daily allowance runs out, the Guide shows "The Grove Guide … is resting" until the allowance resets. To check, open https://aistudio.google.com/apikey: the key's project should show **Free** under Plan (not "Tier 1" or a paid tier). Never select **Set up billing** for that project. On the free tier, Google may use what is sent to improve its products; that's one more reason the Guide is only ever sent story choices, never names or emails.
- **Cloudflare Workers' free plan.** It needs no credit card and allows 100,000 requests a day.

The Guide also keeps its use small: 8 questions per report, short replies, at most 30 requests an hour from one address, and saved reflections and chats aren't requested again.

### Set up the Grove Guide once, for everyone (Cloudflare Worker)

Do this once. Afterwards, anyone who has the code (teammates and judges running it on their own computer, and visitors to the published site) can use the Grove Guide with no key or setup of their own.

1. Create a free account at https://dash.cloudflare.com (no credit card needed). Open **Workers & Pages → Create → Create Worker**, name it `grove-guide`, and select **Deploy**.
2. Select **Edit code**, replace everything with the contents of `server/grove-guide-worker.js`, and select **Deploy**.
3. In the Worker's **Settings → Variables and Secrets**, add:
   - `GEMINI_API_KEY`, type **Secret**, value: your free-tier Gemini key;
   - `ALLOWED_ORIGINS`, type **Text**, value: your published site's address with no trailing slash, e.g. `https://your-name.github.io`. Copies of the site running on someone's own computer (localhost, Live Server) are always allowed, so you don't list those.
4. Copy the Worker's address (shown at the top, like `https://grove-guide.your-name.workers.dev`). In `ai-config.js`, set `window.GROVE_GUIDE_URL` to that address followed by `/api/grove-guide`, for example:
   `window.GROVE_GUIDE_URL = "https://grove-guide.your-name.workers.dev/api/grove-guide";`
5. Commit and push. The Worker's address is safe to share; the key stays inside Cloudflare.

### Or run it only on your laptop (`start-grove-server.py`)

This is useful before the Worker is set up, or for testing changes to the prompts. It serves the site and the Grove Guide on your computer, using your own key. It is only used while `GROVE_GUIDE_URL` in `ai-config.js` is empty.

1. Optional, so you don't have to paste the key each time: create a file named `.env` in the project folder containing one line, `GEMINI_API_KEY=your-key`. `.gitignore` already keeps `.env` out of GitHub.
2. In a terminal in the project folder, run `py start-grove-server.py` (Windows) or `python3 start-grove-server.py` (Mac/Linux). Without a `.env` file, it asks you to paste the key.
3. Open http://localhost:8000, or keep using VS Code's Live Server: while `start-grove-server.py` is running, the Grove Guide on any local address (like Live Server's port 5500) talks to it automatically. Keep the terminal open; closing it stops the Guide.

Both versions use the same prompts and limits. If you change one, change the other to match.

## Publish with GitHub Pages

Push the project to GitHub, then open **Settings → Pages** for the repository. Choose **Deploy from a branch**, select `main` and the root folder, and save. The narration MP3 is included in the project.

The game is for learning and reflection, not personal financial advice. Starting circumstances and player strategies are treated without a good/bad score.