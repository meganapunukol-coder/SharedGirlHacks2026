# The Enchanted Grove

A choose-your-own-adventure about money choices. Princess Rowan travels through the Enchanted Forest to reach the Tower of Shadows and rescue Prince Ellis.

## Play

Open `index.html` in a browser. The game is plain HTML, CSS, and JavaScript; there is no build step. Each journey rolls a starting purse of 50, 75, 100, 150, or 200 gold. Choices affect gold, health, supplies, reputation, inventory, and the ending.

Use the site menu to visit the About, Resources, and My Profile pages. Completed journey summaries are saved in local browser storage on the device you played on; they are not uploaded to a server.

## ElevenLabs narration

The animated intro includes captions and looks for an ElevenLabs narration MP3. To create it:

1. In ElevenLabs Text to Speech, generate an MP3 with a gentle female voice your team has permission to use.
2. Use the narration script below and save the exported file as `assets/audio/grove-intro.mp3`.
3. In `game.js`, set `elevenLabsNarrationPath` to `"assets/audio/grove-intro.mp3"`.
4. Turn on Narration in the site header and play the intro. Until the MP3 is added and configured, the browser uses its available system speech voice.

Narration script:

> Once upon a time, beneath the moonlit branches of the Enchanted Grove, a prince was trapped in a tower at the forest's far end. His lantern flickered like a distant star. Back at the grove's entrance, Princess Rowan took a breath and stepped onto the path. She could not choose the purse she carried, but she could choose how to use it. Her adventure begins now.

Do not put an ElevenLabs API key in browser code or commit one to GitHub. Generate and export the audio outside the site. The browser voice can vary by device; the exported ElevenLabs audio gives you a consistent voice for the demo.

## Publish with GitHub Pages

Push the project to GitHub, then open **Settings → Pages** for the repository. Choose **Deploy from a branch**, select `main` and the root folder, and save. Add the optional narration MP3 before publishing if you want voice audio in the live demo.

The game is for learning and reflection, not personal financial advice. Starting circumstances and player strategies are treated without a good/bad score.