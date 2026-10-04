// Where the journey report's Grove Guide (the AI chat) sends its requests.
//
// Leave this empty to use the local server (start-grove-server.py), which answers at
// /api/grove-guide on the same address as the site.
//
// After deploying the Cloudflare Worker (see README → "Journey report and Grove Guide"),
// paste its address here, ending in /api/grove-guide, for example:
//   window.GROVE_GUIDE_URL = "https://grove-guide.your-name.workers.dev/api/grove-guide";
//
// Never put the Gemini API key in this file or any other file the browser loads.
window.GROVE_GUIDE_URL = "https://grove-guide.mdp82.workers.dev/api/grove-guide";
