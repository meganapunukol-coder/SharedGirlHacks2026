// Journey report: rates each choice against the answer key below, builds the report saved with
// each finished journey, renders the report page (#report/<id>), and connects the Grove Guide,
// an AI chat that explains the report. Loaded before game.js; its functions use game.js globals
// (readJourneyHistory, profileStorageKey) only when called, after every script has loaded.

// Where the Grove Guide's private middleman lives: GROVE_GUIDE_URL from ai-config.js (the
// Cloudflare Worker) if set, otherwise the laptop server (start-grove-server.py) on port 8000.
// That works both when the site is opened from the laptop server itself and from another local
// server such as VS Code's Live Server.
const laptopGuidePort = "8000";
const isLocalSite = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const groveGuideUrl = window.GROVE_GUIDE_URL ||
  (isLocalSite && window.location.port !== laptopGuidePort ? `http://127.0.0.1:${laptopGuidePort}/api/grove-guide` : "/api/grove-guide");
// Each report allows this many chat questions, which caps what one player can spend.
const guideQuestionLimit = 8;

const ratingPoints = { wise: 2, fair: 1, risky: 0 };
const ratingLabels = { wise: "Wise choice", fair: "Fair choice", risky: "Risky choice" };
const ratingIcons = { wise: "✦", fair: "◐", risky: "⚠" };

// The answer key. For each chapter, each choice (by its label in game.js) maps to a function of
// the game state *before* the choice that returns [rating, why]. Ratings are "wise", "fair" or
// "risky"; null leaves the choice out of the score. Choosing a trail is never scored.
const answerKey = {
  paths: {
    "Take the Golden Path": (s) => s.gold >= 100
      ? ["wise", "Paying 25 gold for a guaranteed safe trip was affordable with a purse this size."]
      : ["fair", "Safety has value, but 25 gold was a big share of a small purse."],
    "Take the Shadow Path": () => ["fair", "It cost no gold, but it risked health. A free option can still have a cost."],
    "Pause and reconsider": () => ["fair", "Taking time to think is sensible, though it did not move the journey forward."]
  },
  market: {
    "Buy an enchanted cupcake": (s) => s.health <= 90
      ? ["fair", "A small treat that met a real need: health was below full."]
      : ["risky", "A want, not a need: health was already high, so the 5 gold bought very little."],
    "Buy a silver sword": (s) => s.gold - 40 >= 50
      ? ["fair", "Strong protection, but it used a big share of the gold."]
      : ["risky", "Spending 40 gold on protection left too little for the tolls ahead."],
    "Buy a magical map": () => ["wise", "For 20 gold, the map opens a free Tower entrance later, saving the 50-gold gate fee."],
    "Buy a cloak of protection": () => ["fair", "Like insurance: paying now to soften a danger that may or may not come."],
    "Buy the mystery gem": () => ["risky", "A gamble. An item with an unknown value is a risk, not a plan."],
    "Restock trail supplies": () => ["fair", "Supplies are a need, though carried supplies can be lost to surprises."],
    "Help the fairy vendor": () => ["wise", "Free kindness built reputation, which can open doors gold cannot."],
    "Save your money": () => ["fair", "Keeping gold for later needs is reasonable, though the market had cheap, useful options too."]
  },
  storm: {
    "Take the royal suite": (s) => s.gold >= 120
      ? ["fair", "Affordable with a big purse, but it cost three times the basic room for the same need."]
      : ["risky", "Comfort over need: 30 gold when a 10-gold room met the same need."],
    "Take the basic room": () => ["wise", "Met the real need, rest and supplies, for the lowest gold price."],
    "Sleep under the trees": (s) => s.health > 40
      ? ["fair", "Saved gold, but paid for it in health."]
      : ["risky", "Health was already low, so saving 10 gold cost too much health."]
  },
  dragon: {
    "Pay the toll": () => ["fair", "Paying the full price works, but cheaper ways across existed."],
    "Negotiate a lower toll": () => ["fair", "Asking for a better deal is smart, though a failed roll costs health."],
    "Fight the dragon": (s) => s.items.has("sword")
      ? ["wise", "The sword bought earlier paid off: no toll paid."]
      : ["risky", "Fighting without a sword risked 20 health."],
    "Pay a traveler for another route": () => ["wise", "10 gold for information avoided a 50-gold toll."],
    "Use the forest shortcut": () => ["wise", "Used a free advantage found earlier on the Shadow Path."],
    "Ask the fairies for help": () => ["wise", "Reputation earned earlier paid off with a free crossing."]
  },
  bank: {
    "Keep all your gold with you": () => ["fair", "Full access to cash is safe, but the gold did not grow."],
    "Deposit 40 gold": (s) => s.gold - 40 >= 25
      ? ["wise", "Grew some savings with interest while keeping cash for the road."]
      : ["risky", "Locked away most of the purse, leaving little cash for surprises."],
    "Deposit all available gold": () => ["risky", "It earns interest, but left no cash at all for costs before the Tower."]
  },
  wizard: {
    "Give the wizard 20 gold": () => ["risky", "A guaranteed, fast fortune with no explanation is a classic scam warning sign."],
    "Ask questions and walk away": () => ["wise", "Asking questions and walking away from an unclear promise protected the gold."],
    "Invest 5 gold as a small experiment": () => ["fair", "Only a small amount was at risk, but the promise was still unreliable."]
  },
  bridge: {
    "Pay the carpenter": () => ["fair", "Paying to save time is fine when gold is plentiful."],
    "Repair it yourself": () => ["wise", "Traded a little time instead of gold: a smart use of a different resource."],
    "Take the long way around": () => ["fair", "Saved gold, but used supplies and two days."]
  },
  tower: {
    "Pay 50 gold to enter": (s) => s.items.has("map") || s.reputation > 0
      ? ["fair", "Paid 50 gold when a free way in was available."]
      : ["wise", "Kept enough gold available to reach the goal."],
    "Use the magical map": () => ["wise", "The map bought earlier saved the 50-gold gate fee."],
    "Call on the forest folk": () => ["wise", "Relationships built earlier opened the Tower."],
    "The gate stays closed for now": (s) => s.gold >= 50 || s.items.has("map") || s.reputation > 0
      ? ["risky", "Another way into the Tower was available."]
      : [null, "No resources were left for the gate; earlier choices shaped this ending."]
  }
};

function rateChoice(chapterId, label, game) {
  const rule = answerKey[chapterId]?.[label];
  if (!rule) return { rating: null, why: "" };
  const [rating, why] = rule(game);
  return { rating, why };
}

function scoreTitle(score) {
  if (score >= 85) return "Wise Ruler of the Grove";
  if (score >= 65) return "Savvy Traveler";
  if (score >= 45) return "Learning Adventurer";
  return "Brave Beginner";
}

// Builds the report saved with a finished journey from the log of choices game.js kept.
function buildJourneyReport(game) {
  const scored = game.choiceLog.filter((entry) => entry.rating);
  const points = scored.reduce((total, entry) => total + ratingPoints[entry.rating], 0);
  const score = scored.length ? Math.round((100 * points) / (2 * scored.length)) : 0;
  const counts = { wise: 0, fair: 0, risky: 0 };
  scored.forEach((entry) => { counts[entry.rating] += 1; });
  return { score, title: scoreTitle(score), counts, choices: game.choiceLog, summary: "", chat: [] };
}

// Story text says "Rowan" where the player's name goes. The report (and anything sent to the
// Grove Guide) uses "the princess" instead, so the player's name never leaves the browser.
function storyText(text) {
  return String(text ?? "").replace(/(^|[.!?]\s+)Rowan\b/g, "$1The princess").replace(/\bRowan\b/g, "the princess");
}

function isValidReport(report) {
  return report && typeof report === "object" && Number.isFinite(report.score) && Array.isArray(report.choices) &&
    report.choices.every((entry) => entry && typeof entry.choice === "string" && typeof entry.kicker === "string");
}

function updateJourney(id, changes) {
  try {
    const journeys = JSON.parse(window.localStorage.getItem(profileStorageKey) ?? "[]");
    const journey = journeys.find((entry) => entry.id === id);
    if (!journey) return;
    Object.assign(journey.report, changes);
    window.localStorage.setItem(profileStorageKey, JSON.stringify(journeys));
  } catch {
    // Storage unavailable: the report still works for this visit, it just won't be remembered.
  }
}

// What the Grove Guide sees: the journey's facts and ratings, with no name or email.
function guidePayload(journey) {
  const report = journey.report;
  return {
    score: report.score,
    title: report.title,
    counts: report.counts,
    trail: journey.trail || "",
    ending: journey.ending,
    startingGold: journey.startingGold,
    finalGold: journey.gold,
    finalHealth: journey.health,
    totalSpent: journey.totalSpent,
    choices: report.choices.map((entry) => ({
      chapter: entry.kicker,
      lesson: entry.lesson,
      choice: entry.choice,
      outcome: storyText(entry.outcome),
      rating: entry.rating ?? "not scored",
      why: entry.why,
      wiserOptions: entry.best ?? []
    }))
  };
}

class GuideUnavailableError extends Error {}

async function askGuide(mode, journey, messages = []) {
  let response;
  try {
    response = await fetch(groveGuideUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, report: guidePayload(journey), messages })
    });
  } catch {
    throw new GuideUnavailableError();
  }
  const data = await response.json().catch(() => null);
  // A non-JSON reply means nothing is answering at this address (for example, Live Server).
  if (!data) throw new GuideUnavailableError();
  if (!response.ok || !data.text) throw new Error(data.error || "The Grove Guide could not answer right now. Please try again.");
  return data.text;
}

const guideUnavailableMessage = isLocalSite
  ? "The Grove Guide's server isn't running. Open a terminal in the project folder, run  py start-grove-server.py  and paste your Gemini key when asked, then try again."
  : "The Grove Guide isn't available right now. Please try again later.";

// Shows the Guide's plain-text reply: "- " lines become a list, other lines paragraphs.
function renderGuideText(container, text) {
  container.replaceChildren();
  let list = null;
  text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/(^|[^*\w])\*(\S[^*\n]*?)\*/g, "$1$2").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach((line) => {
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      if (!list) { list = document.createElement("ul"); container.append(list); }
      const item = document.createElement("li");
      item.textContent = bullet[1];
      list.append(item);
      return;
    }
    list = null;
    const paragraph = document.createElement("p");
    paragraph.textContent = line.replace(/^#+\s*/, "");
    if (/:$/.test(line) && line.length < 48) paragraph.className = "guide-heading";
    container.append(paragraph);
  });
}

const endingNames = { rescuer: "The Rescuer", clever: "The Clever Princess", community: "The Community Hero", unfinished: "The Journey Continues" };
const trailNames = { merchant: "The Merchant's Trail", mystic: "The Mystic's Trail", warrior: "The Warrior's Trail" };

let activeReportId = "";

function renderReportPage(id) {
  activeReportId = id;
  const page = document.querySelector("#report-page");
  const missing = page.querySelector("#report-missing");
  const body = page.querySelector("#report-body");
  const { journeys } = readJourneyHistory();
  const journey = journeys.find((entry) => entry.id === id && isValidReport(entry.report));
  missing.hidden = Boolean(journey);
  body.hidden = !journey;
  if (!journey) {
    page.querySelector("#report-title").textContent = "Report not found.";
    return;
  }
  const { report } = journey;

  page.querySelector("#report-title").textContent = report.title;
  const date = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(new Date(journey.completedAt));
  page.querySelector("#report-deck").textContent =
    `${date} · ${trailNames[journey.trail] ?? "The Enchanted Forest"} · Ending: ${endingNames[journey.ending] ?? "The Journey Continues"}`;
  page.querySelector("#report-score").textContent = String(report.score);
  page.querySelector("#report-score-ring").style.setProperty("--score", report.score);
  page.querySelector("#report-counts").textContent =
    `${report.counts.wise} wise · ${report.counts.fair} fair · ${report.counts.risky} risky`;
  page.querySelector("#report-resources").textContent =
    `Started with ${journey.startingGold} gold · finished with ${journey.gold} gold and ${journey.health} health · spent ${journey.totalSpent} gold`;

  const timeline = page.querySelector("#report-timeline");
  timeline.replaceChildren();
  report.choices.forEach((entry) => {
    const item = document.createElement("li");
    item.className = `report-step${entry.rating ? ` is-${entry.rating}` : ""}`;
    const badge = document.createElement("span");
    badge.className = "report-badge";
    badge.textContent = entry.rating ? `${ratingIcons[entry.rating]} ${ratingLabels[entry.rating]}` : "Not scored";
    const kicker = document.createElement("p");
    kicker.className = "scene-kicker";
    kicker.textContent = entry.kicker;
    const choice = document.createElement("h3");
    choice.textContent = entry.choice;
    const outcome = document.createElement("p");
    outcome.className = "report-outcome";
    outcome.textContent = storyText(entry.outcome);
    item.append(badge, kicker, choice, outcome);
    if (entry.why) {
      const why = document.createElement("p");
      why.className = "report-why";
      why.textContent = entry.why;
      item.append(why);
    }
    if (entry.rating && entry.rating !== "wise" && entry.best?.length) {
      const better = document.createElement("p");
      better.className = "report-better";
      better.textContent = `A wiser path here: ${entry.best.join(" or ")}`;
      item.append(better);
    }
    timeline.append(item);
  });

  renderGuideSummary(journey);
  renderGuideChat(journey);
}

async function renderGuideSummary(journey) {
  const box = document.querySelector("#guide-summary");
  const retry = document.querySelector("#guide-summary-retry");
  retry.hidden = true;
  if (journey.report.summary) { renderGuideText(box, journey.report.summary); return; }
  box.innerHTML = '<p class="guide-loading">The Grove Guide is reading your journey…</p>';
  try {
    const text = await askGuide("summary", journey);
    if (activeReportId !== journey.id) return;
    journey.report.summary = text;
    updateJourney(journey.id, { summary: text });
    renderGuideText(box, text);
  } catch (error) {
    if (activeReportId !== journey.id) return;
    const message = document.createElement("p");
    message.className = "guide-error";
    message.textContent = error instanceof GuideUnavailableError ? guideUnavailableMessage : error.message;
    box.replaceChildren(message);
    retry.hidden = false;
    retry.onclick = () => renderGuideSummary(journey);
  }
}

function renderGuideChat(journey) {
  const log = document.querySelector("#guide-chat-log");
  const form = document.querySelector("#guide-chat-form");
  const input = document.querySelector("#guide-chat-input");
  const send = document.querySelector("#guide-chat-send");
  const remaining = document.querySelector("#guide-chat-remaining");
  const suggestions = document.querySelector("#guide-suggestions");
  const chat = journey.report.chat ?? (journey.report.chat = []);
  let waiting = false;

  const questionsLeft = () => guideQuestionLimit - chat.filter((message) => message.role === "user").length;
  const addMessage = (role, text) => {
    const bubble = document.createElement("div");
    bubble.className = `guide-message is-${role}`;
    if (role === "model") renderGuideText(bubble, text);
    else bubble.textContent = text;
    log.append(bubble);
    log.scrollTop = log.scrollHeight;
    return bubble;
  };
  const refresh = () => {
    const left = questionsLeft();
    const asked = guideQuestionLimit - left;
    remaining.textContent = left <= 0
      ? "You've asked all your questions for this report. Finish a new journey to chat again!"
      : asked === 0
        ? `You can ask the Grove Guide up to ${guideQuestionLimit} questions about this journey.`
        : `${left} of ${guideQuestionLimit} questions left for this journey.`;
    input.disabled = send.disabled = waiting || left <= 0;
    suggestions.hidden = left <= 0 || chat.length > 0;
  };

  log.replaceChildren();
  chat.forEach((message) => addMessage(message.role, message.text));

  const ask = async (question) => {
    const text = question.trim().slice(0, 400);
    if (!text || waiting || questionsLeft() <= 0) return;
    waiting = true;
    input.value = "";
    chat.push({ role: "user", text });
    addMessage("user", text);
    refresh();
    const pending = addMessage("model", "…");
    pending.classList.add("is-pending");
    try {
      const reply = await askGuide("chat", journey, chat);
      if (activeReportId !== journey.id) return;
      pending.remove();
      chat.push({ role: "model", text: reply });
      addMessage("model", reply);
      updateJourney(journey.id, { chat });
    } catch (error) {
      if (activeReportId !== journey.id) return;
      // Undo the unanswered question so it doesn't count against the limit.
      chat.pop();
      pending.remove();
      log.lastElementChild?.remove();
      input.value = text;
      const note = document.createElement("p");
      note.className = "guide-error";
      note.textContent = error instanceof GuideUnavailableError ? guideUnavailableMessage : error.message;
      log.append(note);
    } finally {
      waiting = false;
      refresh();
    }
  };

  form.onsubmit = (event) => { event.preventDefault(); ask(input.value); };
  suggestions.querySelectorAll("button").forEach((button) => { button.onclick = () => ask(button.textContent); });
  refresh();
}
