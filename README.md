# The Enchanted Grove

A choose-your-own-adventure about money choices. Princess Rowan travels through the Enchanted Forest to reach the Tower of Shadows and rescue Prince Ellis.

## Play

Open `index.html` in a browser. The game is plain HTML, CSS, and JavaScript; there is no build step. Each journey rolls a starting purse of 50, 75, 100, 150, or 200 gold. Choices affect gold, health, supplies, reputation, inventory, and the ending.

## Add ElevenLabs narration

The animated intro works with captions on its own. To add a gentle narrated version:

1. In ElevenLabs Text to Speech, generate an MP3 using the script below and a voice your team has permission to use.
2. Save the exported file as `assets/audio/grove-intro.mp3` in this project.
3. In `game.js`, set `elevenLabsNarrationPath` to `"assets/audio/grove-intro.mp3"`.
4. Turn on Narration in the site header and play the intro. Until that setting is changed, the browser uses its available system speech voice.

Narration script:

> Once upon a time, beneath the moonlit branches of the Enchanted Grove, a prince was taken to the Tower of Shadows. At the far end of the forest, his lantern blinked like a distant star. Princess Rowan stepped beneath the trees. She could not choose what was in her purse. She could choose how to care for it. Her story begins now.

Do not put an ElevenLabs API key in browser code or commit one to GitHub. Generate and export the audio outside the site. The browser voice can vary by device; the exported ElevenLabs audio gives you a consistent voice for the demo.

## Publish with GitHub Pages

Push the project to GitHub, then open **Settings → Pages** for the repository. Choose **Deploy from a branch**, select `main` and the root folder, and save. Add the optional narration MP3 before publishing if you want voice audio in the live demo.

The game is for learning and reflection, not personal financial advice. Starting circumstances and player strategies are treated without a good/bad score.