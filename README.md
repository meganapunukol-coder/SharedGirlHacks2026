# Into the Unknown

A choose-your-own-adventure about money choices. A princess travels through the Enchanted Forest to reach the Tower of Shadows and rescue Prince Ellis.

## Play

Serve the project over HTTP (for example, with VS Code Live Server or GitHub Pages) and open its page in a browser; double-clicking `index.html` uses `file://` and prevents some browsers from loading the local narration MP3. The game is plain HTML, CSS, and JavaScript; there is no build step. Enter a name and email on the opening screen; the name personalizes the princess throughout the story. Contact details stay in memory for the current browser session and are not sent to or saved on a server. Each journey rolls a starting purse of 50, 75, 100, 150, or 200 gold. Choices affect gold, health, supplies, reputation, inventory, and the ending.

Use the site menu to visit the About, Resources, and My Profile pages. Completed journey summaries are saved in local browser storage on the device you played on; they are not uploaded to a server.

## Intro narration

The opening uses the provided ElevenLabs recording at `assets/audio/enchanted-grove-intro.mp3`. The full story transcript stays visible while the recording plays, and the adventure choices appear when the audio finishes. If the recording cannot play, an on-screen message appears and the player can skip to the trail choices. The starting-gold amount is shown beside the transcript. The recording uses the story's generic "your name" wording so its voice stays consistent with the transcript for every player.

Do not put an ElevenLabs API key in browser code or commit one to GitHub.

## Publish with GitHub Pages

Push the project to GitHub, then open **Settings → Pages** for the repository. Choose **Deploy from a branch**, select `main` and the root folder, and save. The narration MP3 is included in the project.

The game is for learning and reflection, not personal financial advice. Starting circumstances and player strategies are treated without a good/bad score.