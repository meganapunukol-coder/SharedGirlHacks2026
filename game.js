const startingGoldOptions = [50, 75, 100, 150, 200];
const elevenLabsNarrationPath = null;
const introNarrationScript = "Once upon a time, beneath the moonlit branches of the Enchanted Grove, a prince was trapped in a tower at the forest's far end. His lantern flickered like a distant star. Back at the grove's entrance, Princess Rowan took a breath and stepped onto the path. She could not choose the purse she carried, but she could choose how to use it. Her adventure begins now.";
const chapters = [
  {
    id: "gate", kicker: "CHAPTER 1 · THE FOREST GATE", title: "Five days to the Tower of Shadows.",
    text: "A warning is carved into the gate: travelers who enter unprepared rarely make it out. Three merchants wait beside the path. Rowan has a different purse each time she begins a journey.",
    lesson: "Needs, wants, and budgeting",
    choices: () => [
      option("Buy a large backpack", "30 gold · +2 supply capacity", (game) => {
        spend(game, 30); game.capacity += 2; game.items.add("backpack"); game.purchases += 1;
        return "The pack can carry more later. It costs a lot up front, so Rowan has less gold for the road.";
      }, (game) => game.gold >= 30, "Needs 30 gold."),
      option("Buy basic supplies", "15 gold · +3 supplies", (game) => {
        spend(game, 15); addSupplies(game, 3); game.purchases += 1; game.essentialPurchases += 1;
        return "Food, water, and a blanket make the first night easier. Rowan spends less than she would on the backpack.";
      }, (game) => game.gold >= 15, "Needs 15 gold."),
      option("Buy nothing for now", "Keep all your gold · begin with no supplies", (game) => {
        game.savingChoices += 1;
        return "Rowan keeps every coin. That leaves room for later needs, though the journey begins with no supplies.";
      })
    ]
  },
  {
    id: "paths", kicker: "CHAPTER 2 · THE TWO PATHS", title: "One path costs gold. The other costs certainty.",
    text: "The Golden Path is maintained by forest fairies. The Shadow Path costs nothing, but the forest dice decide what happens. Which cost can Rowan afford to carry?",
    lesson: "Risk versus reward",
    choices: () => [
      option("Take the Golden Path", "25 gold · no health lost", (game) => {
        spend(game, 25); game.safeChoices += 1;
        return "The fairies keep the path safe. Rowan spends 25 gold and arrives at the next clearing unharmed.";
      }, (game) => game.gold >= 25, "Needs 25 gold."),
      option("Take the Shadow Path", "Free · roll the forest dice", (game) => {
        game.riskChoices += 1;
        const roll = rollDie();
        if (roll <= 2) { game.health = Math.max(0, game.health - 10); return `The dice show ${roll}. A briar beast clips Rowan's shoulder: she loses 10 health, but escapes.`; }
        if (roll <= 4) return `The dice show ${roll}. Branches rustle, but nothing happens. The free path saved Rowan's gold this time.`;
        if (roll === 5) { game.gold += 10; return "The dice show 5. Rowan spots 10 gold beneath a fallen log."; }
        game.shortcut = true;
        return "The dice show 6. Rowan discovers a hidden shortcut that can bypass the dragon's toll.";
      }),
      option("Pause and reconsider", "No cost · keep your current resources", () => "Rowan pauses to check what she has. The grove offers no free certainty, but taking time to consider is a choice too.")
    ]
  },
  {
    id: "market", kicker: "CHAPTER 3 · THE FAIRY MARKET", title: "Every sparkling thing has an opportunity cost.",
    text: "At the Fairy Market, Rowan finds useful gear, tempting treasures, and a vendor who could use a hand. She can make one choice before continuing.",
    lesson: "Opportunity cost: choosing one thing means giving up another",
    choices: () => [
      option("Buy an enchanted cupcake", "5 gold · restore 5 health", (game) => {
        spend(game, 5); game.health = Math.min(100, game.health + 5); game.purchases += 1;
        return "The cupcake restores 5 health. A small treat can be useful, but Rowan still weighs its price against other needs.";
      }, (game) => game.gold >= 5, "Needs 5 gold."),
      option("Buy a silver sword", "40 gold · helps in a future fight", (game) => {
        spend(game, 40); game.items.add("sword"); game.purchases += 1;
        return "The sword is expensive, but it may keep Rowan safe at the dragon's bridge.";
      }, (game) => game.gold >= 40, "Needs 40 gold."),
      option("Buy a magical map", "20 gold · reveals a secret Tower entrance", (game) => {
        spend(game, 20); game.items.add("map"); game.purchases += 1;
        return "The map shows a secret entrance near the Tower. It costs gold now, but could open a different route later.";
      }, (game) => game.gold >= 20, "Needs 20 gold."),
      option("Buy a cloak of protection", "30 gold · softens one dragon attack", (game) => {
        spend(game, 30); game.items.add("cloak"); game.purchases += 1;
        return "The cloak can reduce harm from one attack. Rowan pays now for protection she may or may not need.";
      }, (game) => game.gold >= 30, "Needs 30 gold."),
      option("Buy the mystery gem", "15 gold · its value is uncertain", (game) => {
        spend(game, 15); game.purchases += 1; game.riskChoices += 1;
        const value = [0, 5, 15, 30, 100][Math.floor(Math.random() * 5)];
        game.gold += value;
        if (value === 0) return "The gem is only glass. Rowan loses the 15 gold she paid.";
        if (value === 15) return "The gem is worth exactly 15 gold. Rowan gets back what she spent, but earns no profit.";
        return `The gem is worth ${value} gold. Rowan ${value > 15 ? `gains ${value - 15} more gold than she spent` : `loses ${15 - value} gold`}. This uncertain result could have gone another way.`;
      }, (game) => game.gold >= 15, "Needs 15 gold."),
      option("Restock trail supplies", "10 gold · add 3 supplies, up to capacity", (game) => {
        spend(game, 10); const gained = addSupplies(game, 3); game.purchases += 1;
        return gained ? `Rowan adds ${gained} supplies to her pack.` : "Her pack is already full, so Rowan cannot carry more supplies.";
      }, (game) => game.gold >= 10 && game.supplies < game.capacity, "Needs 10 gold and room in the pack."),
      option("Help the fairy vendor", "No cost · +1 reputation", (game) => {
        game.reputation += 1; game.helpedVillagers = true;
        return "Rowan helps carry the vendor's crates. The fairies remember her kindness and promise to help if she needs them.";
      }),
      option("Save your money", "No immediate benefit · keep it for later", (game) => {
        game.savingChoices += 1;
        return "Rowan walks away from the market. Keeping money available is also a choice; she may use it for a need that has not appeared yet.";
      })
    ]
  },
  {
    id: "storm", kicker: "CHAPTER 4 · THE STORM", title: "The storm takes what the pack was carrying.",
    text: "A magical storm tears through the forest. Rowan's carried supplies are destroyed. A mysterious innkeeper offers a warm room, a basic room, or a dry patch beneath the trees.",
    lesson: "Emergency savings help with costs you could not plan for",
    choices: () => [
      option("Take the royal suite", "30 gold · +10 health · 5 supplies if your pack allows", (game) => {
        spend(game, 30); game.health = Math.min(100, game.health + 10); const gained = addSupplies(game, 5); game.purchases += 1;
        return `The warm bed restores 10 health${gained ? `, and Rowan leaves with ${gained} fresh supplies` : ""}. Savings gave her a comfortable option.`;
      }, (game) => game.gold >= 30, "Needs 30 gold."),
      option("Take the basic room", "10 gold · +5 health · 3 supplies if your pack allows", (game) => {
        spend(game, 10); game.health = Math.min(100, game.health + 5); const gained = addSupplies(game, 3); game.purchases += 1; game.essentialPurchases += 1;
        return `A simple meal restores 5 health${gained ? `, and Rowan packs ${gained} supplies for later` : ""}. It costs less than the suite and still meets an important need.`;
      }, (game) => game.gold >= 10, "Needs 10 gold."),
      option("Sleep under the trees", "No gold · lose 10 health", (game) => {
        game.health = Math.max(0, game.health - 10);
        return "Rowan keeps her gold but loses 10 health in the cold. Saving money can have a cost too; the best choice depends on what matters most right now.";
      })
    ]
  },
  {
    id: "dragon", kicker: "CHAPTER 5 · THE DRAGON'S TOLL", title: "The dragon blocks the bridge.",
    text: "'None shall pass without paying the toll,' growls the dragon. It demands 50 gold. Rowan can pay, negotiate, fight, or find another way around.",
    lesson: "Negotiation, alternatives, and sunk costs",
    choices: (game) => {
      const choices = [
        option("Pay the toll", "50 gold · cross safely", (game) => { spend(game, 50); return "The dragon counts the coins and steps aside. Rowan crosses safely, though she has 50 fewer gold for the Tower."; }, (game) => game.gold >= 50, "Needs 50 gold."),
        option("Negotiate a lower toll", "Roll the dice · success costs 20 gold", (game) => {
          game.riskChoices += 1; const roll = rollDie();
          if (roll >= 4) { spend(game, 20); return `The dice show ${roll}. The dragon accepts 20 gold instead of 50. Asking for different terms saved Rowan 30 gold.`; }
          dragonDamage(game, 10); return `The dice show ${roll}. The dragon refuses and lashes out. Rowan loses ${game.lastDamage} health, then slips past while it roars.`;
        }),
        option("Fight the dragon", "Sword: no cost · without it, lose 20 health", (game) => {
          if (game.items.has("sword")) return "Rowan's silver sword flashes in the moonlight. The dragon retreats, and no toll is paid.";
          dragonDamage(game, 20); return `Without a sword, Rowan cannot defeat the dragon. She escapes across the bridge, losing ${game.lastDamage} health.`;
        }),
        option("Pay a traveler for another route", "10 gold · avoid the toll", (game) => { spend(game, 10); return "A traveler points Rowan to a hidden bridge. Ten gold buys information and a way around the dragon."; }, (game) => game.gold >= 10, "Needs 10 gold.")
      ];
      if (game.shortcut) choices.unshift(option("Use the forest shortcut", "Free · skip the dragon's toll", (game) => {
        game.shortcut = false; return "The shortcut leads around the dragon. Rowan passes without paying, thanks to a chance discovery on the Shadow Path.";
      }));
      if (game.reputation > 0) choices.push(option("Ask the fairies for help", "Use 1 reputation · cross without paying", (game) => {
        game.reputation -= 1; game.helpedVillagers = true;
        return "The fairies remember Rowan's kindness and distract the dragon. Her reputation opened a door that gold could not.";
      }));
      return choices;
    }
  },
  {
    id: "bank", kicker: "CHAPTER 6 · THE BANK OF FAIRYLAND", title: "The bank offers growth, with a catch.",
    text: "The fairy banker pays 10% interest on a deposit, but Rowan cannot withdraw that gold until she reaches the Tower. How much should she leave locked away?",
    lesson: "Interest can grow savings, while access to cash still matters",
    choices: () => [
      option("Keep all your gold with you", "No interest · full access to your money", (game) => { game.savingChoices += 1; return "Rowan keeps her gold close. She gives up the chance to earn interest, but can use every coin on the road."; }),
      option("Deposit 40 gold", "40 becomes 44 at the Tower · locked until then", (game) => {
        game.gold -= 40; game.bankDeposit += 40;
        return "The banker records 40 gold. It will grow to 44 at the Tower, but Rowan cannot reach it before then.";
      }, (game) => game.gold >= 40, "Needs 40 gold to deposit."),
      option("Deposit all available gold", "Earn 10% interest · locked until the Tower", (game) => {
        const amount = game.gold; game.gold = 0; game.bankDeposit += amount;
        return `The banker locks away ${amount} gold. At the Tower it will be worth ${Math.floor(amount * 1.1)} gold, but Rowan has no pocket money until then.`;
      }, (game) => game.gold > 0, "You have no gold to deposit.")
    ]
  },
  {
    id: "wizard", kicker: "CHAPTER 7 · THE MYSTERIOUS WIZARD", title: "'Twenty gold now, one hundred tomorrow!'",
    text: "The wizard promises a guaranteed fortune but cannot explain how it works. The offer expires at moonrise. Rowan can hand over the money, ask questions, or risk only a small amount.",
    lesson: "Check claims and understand where your money goes",
    choices: () => [
      option("Give the wizard 20 gold", "20 gold · the offer has no clear explanation", (game) => {
        spend(game, 20); game.riskChoices += 1;
        return "The wizard vanishes with the coins. A guaranteed, fast reward with no clear explanation was a warning sign. Rowan learns to pause before handing over money.";
      }, (game) => game.gold >= 20, "Needs 20 gold."),
      option("Ask questions and walk away", "No cost · keep your money", (game) => {
        game.reputation += 1;
        return "The wizard cannot explain the promise, so Rowan walks away. Asking for details is part of making an informed choice.";
      }),
      option("Invest 5 gold as a small experiment", "5 gold · roll for a return of 0, 10, or 20", (game) => {
        spend(game, 5); game.riskChoices += 1; const result = [0, 10, 20][Math.floor(Math.random() * 3)]; game.gold += result;
        if (result === 0) return "The experiment earns nothing, and the 5 gold is lost. A small risk is still a risk.";
        return `The experiment returns ${result} gold. After the 5-gold cost, Rowan's net gain is ${result - 5} gold. A lucky result does not make the promise reliable.`;
      }, (game) => game.gold >= 5, "Needs 5 gold.")
    ]
  },
  {
    id: "bridge", kicker: "CHAPTER 8 · THE BROKEN BRIDGE", title: "The carpenter needs 25 gold. Time is another option.",
    text: "A broken bridge blocks the last stretch. A carpenter can fix it for 25 gold. Rowan could also repair it herself with a hammer she finds nearby, or use supplies to take a longer route.",
    lesson: "Money is one resource; time, supplies, and risk count too",
    choices: () => [
      option("Pay the carpenter", "25 gold · cross safely today", (game) => { spend(game, 25); return "The carpenter repairs the bridge in an hour. Rowan spends 25 gold to save time and cross safely."; }, (game) => game.gold >= 25, "Needs 25 gold."),
      option("Repair it yourself", "No gold · lose one day", (game) => { game.daysLost += 1; return "With a hammer borrowed from a nearby woodcutter, Rowan repairs the bridge herself. It costs no gold, but she loses a day."; }),
      option("Take the long way around", "Free · requires 5 supplies", (game) => {
        game.supplies -= 5; game.daysLost += 2;
        return "Rowan uses 5 supplies on the longer trail. She keeps her gold but spends two days and the provisions she saved.";
      }, (game) => game.supplies >= 5, "Needs 5 supplies. The storm or earlier choices may have changed what you can carry.")
    ]
  },
  {
    id: "tower", kicker: "FINAL CHAPTER · THE TOWER", title: "The gatekeeper asks for 50 gold.",
    text: "The Tower of Shadows rises above Rowan. The prince is inside. She checks her purse and remembers every choice that brought her here.",
    lesson: "There is more than one kind of resource",
    choices: () => [
      option("Pay 50 gold to enter", "50 gold · rescue the prince", (game) => {
        spend(game, 50); game.ending = "rescuer";
        return "Rowan pays the gatekeeper. The doors swing open, and she finds Prince Ellis safe in the highest room.";
      }, (game) => game.gold >= 50, "The gate requires 50 available gold."),
      option("Use the magical map", "No cost · secret entrance", (game) => {
        game.ending = "clever"; return "The map reveals a narrow door beneath the ivy. Rowan and the prince escape without paying the gatekeeper.";
      }, (game) => game.items.has("map"), "The map can reveal a secret entrance, but Rowan did not buy one."),
      option("Call on the forest folk", "No cost · requires 1 reputation", (game) => {
        game.ending = "community"; game.reputation -= 1;
        return "The forest folk Rowan helped arrive together. They distract the guards and make a path into the Tower.";
      }, (game) => game.reputation > 0, "The forest folk help travelers who have earned their trust."),
      option("The gate stays closed for now", "No more resources to trade · end this journey", (game) => {
        game.ending = "unfinished";
        return "Rowan has reached the Tower, but not every journey ends at the same door. She takes stock of what she learned and plans another route.";
      })
    ]
  }
];

const intro = document.querySelector("#intro");
const adventure = document.querySelector("#adventure");
const cinematic = document.querySelector("#cinematic");
const cinematicArt = document.querySelector("#cinematic-art");
const cinematicKicker = document.querySelector("#cinematic-kicker");
const cinematicLine = document.querySelector("#cinematic-line");
const book = document.querySelector(".book");
const bookStage = document.querySelector("#book-stage");
const bookCaption = document.querySelector("#book-caption");
const beginButton = document.querySelector("#begin-button");
const skipButton = document.querySelector("#skip-intro");
const cinematicSkip = document.querySelector("#cinematic-skip");
const sceneKicker = document.querySelector("#scene-kicker");
const sceneTitle = document.querySelector("#scene-title");
const sceneText = document.querySelector("#scene-text");
const lessonText = document.querySelector("#lesson-text");
const choiceList = document.querySelector("#choice-list");
const feedback = document.querySelector("#feedback");
const feedbackText = document.querySelector("#feedback-text");
const continueButton = document.querySelector("#continue-button");
const progressFill = document.querySelector("#progress-fill");
const progressCount = document.querySelector("#progress-count");
const progressLabel = document.querySelector("#progress-label");
const chapterNote = document.querySelector("#chapter-note");
const soundToggle = document.querySelector("#sound-toggle");
const soundLabel = document.querySelector("#sound-label");
const narration = document.querySelector("#intro-narration");
const pageViews = [...document.querySelectorAll("[data-page]")];
const pageLinks = [...document.querySelectorAll(".nav-link")];
const profileNodes = {
  journeys: document.querySelector("#profile-journeys"),
  rescues: document.querySelector("#profile-rescues"),
  health: document.querySelector("#profile-health"),
  goldSpent: document.querySelector("#profile-gold-spent"),
  style: document.querySelector("#profile-style"),
  styleDescription: document.querySelector("#profile-style-description"),
  historyCount: document.querySelector("#profile-history-count"),
  empty: document.querySelector("#profile-empty"),
  history: document.querySelector("#journey-list"),
  storageStatus: document.querySelector("#profile-storage-status"),
  current: document.querySelector("#profile-current"),
  currentTitle: document.querySelector("#profile-current-title"),
  currentSummary: document.querySelector("#profile-current-summary")
};
const resourceFields = {
  gold: document.querySelector("#gold-value"),
  health: document.querySelector("#health-value"),
  supplies: document.querySelector("#supplies-value"),
  reputation: document.querySelector("#reputation-value")
};

const state = {};
let currentChapter = 0;
let hasChosen = false;
let introTimers = [];
let gameStarted = false;
let soundOn = true;
let journeySaved = false;
let profileStorageMessage = "";

const profileStorageKey = "enchanted-grove-journeys";
const profileDescriptions = {
  "THE RISK TAKER": "You explored uncertain paths. Consider how much risk you can afford and what information you want before your next decision.",
  "THE OPPORTUNIST": "You found value in information, relationships, and alternate routes, not only in gold.",
  "THE SPENDER": "You chose useful or exciting purchases along the way. Every purchase had a tradeoff with another possible use for that gold.",
  "THE SAVER": "You kept a large share of your starting gold available. Saving can create flexibility, while spending on needs can also be worthwhile.",
  "THE PRUDENT PRINCESS": "You balanced needs, surprises, and the resources available to you. Another starting purse could lead to a different plan."
};

function navigateToPage() {
  const pageName = window.location.hash.slice(1) || "home";
  const activePage = pageViews.find((page) => page.dataset.page === pageName) ?? pageViews[0];
  pageViews.forEach((page) => {
    page.hidden = page !== activePage;
    page.classList.toggle("is-active", page === activePage);
  });
  pageLinks.forEach((link) => {
    const isActive = link.hash === `#${activePage.dataset.page}`;
    link.classList.toggle("is-active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (activePage.dataset.page === "profile") renderProfilePage();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function readJourneyHistory() {
  try {
    const saved = window.localStorage.getItem(profileStorageKey);
    if (saved === null) return { journeys: [], error: "" };
    const journeys = JSON.parse(saved);
    if (!Array.isArray(journeys) || journeys.some((journey) =>
      !journey || typeof journey !== "object" ||
      !Number.isFinite(journey.startingGold) ||
      !Number.isFinite(journey.gold) ||
      !Number.isFinite(journey.totalSpent) ||
      !Number.isFinite(journey.health) ||
      journey.totalSpent < 0 ||
      journey.health < 0 ||
      journey.health > 100 ||
      !["rescuer", "clever", "community", "unfinished"].includes(journey.ending) ||
      !Object.prototype.hasOwnProperty.call(profileDescriptions, journey.profile) ||
      typeof journey.completedAt !== "string" ||
      !Number.isFinite(Date.parse(journey.completedAt))
    )) {
      return { journeys: [], error: "Saved journey history is invalid and could not be displayed." };
    }
    return { journeys, error: "" };
  } catch {
    return { journeys: [], error: "Journey history could not be read from this browser." };
  }
}

function renderProfilePage() {
  const { journeys, error } = readJourneyHistory();
  const rescues = journeys.filter((journey) => journey.ending !== "unfinished").length;
  const averageHealth = journeys.length
    ? Math.round(journeys.reduce((total, journey) => total + journey.health, 0) / journeys.length)
    : null;
  const totalSpent = journeys.reduce((total, journey) => total + journey.totalSpent, 0);
  const styleCounts = journeys.reduce((counts, journey) => {
    counts[journey.profile] = (counts[journey.profile] ?? 0) + 1;
    return counts;
  }, {});
  const mostCommonStyle = Object.entries(styleCounts).sort((first, second) => second[1] - first[1])[0]?.[0];

  profileNodes.journeys.textContent = String(journeys.length);
  profileNodes.rescues.textContent = String(rescues);
  profileNodes.health.textContent = averageHealth === null ? "—" : `${averageHealth}%`;
  profileNodes.goldSpent.textContent = String(totalSpent);
  profileNodes.style.textContent = mostCommonStyle ?? "Your story is just beginning.";
  profileNodes.styleDescription.textContent = mostCommonStyle
    ? profileDescriptions[mostCommonStyle] ?? "Your choices have left their mark on the grove."
    : "Finish a journey to discover the patterns in your choices.";
  profileNodes.historyCount.textContent = `${journeys.length} ${journeys.length === 1 ? "entry" : "entries"}`;
  profileNodes.empty.hidden = journeys.length > 0;
  profileNodes.history.replaceChildren();
  const storageMessage = error || profileStorageMessage;
  profileNodes.storageStatus.textContent = storageMessage;
  profileNodes.storageStatus.hidden = !storageMessage;

  journeys.slice(-5).reverse().forEach((journey) => {
    const item = document.createElement("li");
    item.className = "journey-entry";
    const details = document.createElement("div");
    const profileName = document.createElement("strong");
    profileName.textContent = journey.profile;
    const outcome = document.createElement("span");
    outcome.textContent = journey.ending === "unfinished" ? "The journey continues" : "Prince Ellis rescued";
    details.append(profileName, outcome);
    const summary = document.createElement("span");
    summary.className = "journey-summary";
    summary.textContent = `${journey.gold} gold left · ${journey.health}% health`;
    const date = document.createElement("time");
    date.dateTime = journey.completedAt;
    date.textContent = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(journey.completedAt));
    item.append(details, summary, date);
    profileNodes.history.append(item);
  });

  const hasCurrentJourney = gameStarted && !state.ending;
  profileNodes.current.hidden = !hasCurrentJourney;
  if (hasCurrentJourney) {
    const chapterInProgress = chapters[currentChapter];
    profileNodes.currentTitle.textContent = chapterInProgress.title;
    profileNodes.currentSummary.textContent = `${chapterInProgress.kicker} · ${state.gold} gold · ${state.health} health · ${state.supplies} supplies`;
  }
}

function saveCompletedJourney(profile) {
  if (journeySaved) return;
  const { journeys, error } = readJourneyHistory();
  if (error) {
    profileStorageMessage = error;
    profileNodes.storageStatus.textContent = profileStorageMessage;
    profileNodes.storageStatus.hidden = false;
    return;
  }
  const record = {
    startingGold: state.startingGold,
    gold: state.gold,
    totalSpent: state.totalSpent,
    health: state.health,
    ending: state.ending,
    profile: profile.name,
    completedAt: new Date().toISOString()
  };
  try {
    window.localStorage.setItem(profileStorageKey, JSON.stringify([...journeys, record]));
    journeySaved = true;
    profileStorageMessage = "";
  } catch {
    profileStorageMessage = "This journey could not be saved. Check that browser storage is available.";
    profileNodes.storageStatus.textContent = profileStorageMessage;
    profileNodes.storageStatus.hidden = false;
  }
}

function resetGame() {
  Object.assign(state, {
    startingGold: startingGoldOptions[Math.floor(Math.random() * startingGoldOptions.length)], gold: 0,
    health: 100, supplies: 0, capacity: 3, reputation: 0, items: new Set(), bankDeposit: 0,
    riskChoices: 0, purchases: 0, totalSpent: 0, essentialPurchases: 0, savingChoices: 0,
    safeChoices: 0, helpedVillagers: false, shortcut: false, daysLost: 0, lastDamage: 0,
    ending: "", towerFundsReleased: false, interestEarned: 0
  });
  currentChapter = 0;
  gameStarted = true;
  journeySaved = false;
  state.gold = state.startingGold;
}

function startCinematic() {
  if (gameStarted) return;
  resetGame();
  book.classList.add("is-open");
  bookStage.classList.add("is-open");
  bookCaption.textContent = "Once upon a time...";
  beginButton.disabled = true;
  beginButton.querySelector("span:first-child").textContent = "The story is opening";
  cinematicArt.replaceChildren(document.querySelector("#grove-art").cloneNode(true));
  cinematic.hidden = false;
  cinematic.focus();
  playIntroNarration();
  setCaption("ONCE UPON A TIME", "Beneath the moonlit branches of the Enchanted Grove...");
  introTimers.push(window.setTimeout(() => {
    cinematicArt.className = "cinematic-art is-tower";
    setCaption("THE TOWER OF SHADOWS", "At the forest's far end, a prince is trapped. His lantern flickers like a distant star.");
  }, 4200));
  introTimers.push(window.setTimeout(() => {
    cinematicArt.className = "cinematic-art";
    setCaption("BACK AT THE GROVE", "At the forest's entrance, a new story is ready to begin.");
  }, 9000));
  introTimers.push(window.setTimeout(() => {
    cinematicArt.className = "cinematic-art is-princess";
    setCaption("MEET PRINCESS ROWAN", "She takes a breath, steps onto the path, and chooses to begin.");
  }, 12300));
  introTimers.push(window.setTimeout(() => {
    cinematicArt.className = "cinematic-art";
    setCaption("THE GOLDEN COIN", `The coin tumbles... Rowan begins with ${state.startingGold} gold. Her adventure is her own.`);
  }, 17000));
  introTimers.push(window.setTimeout(startAdventure, 24000));
}

function setCaption(kicker, line) {
  cinematicKicker.textContent = kicker;
  cinematicLine.textContent = line;
}

function skipCinematic() {
  introTimers.forEach(window.clearTimeout);
  introTimers = [];
  narration.pause();
  narration.currentTime = 0;
  window.speechSynthesis?.cancel();
  startAdventure();
}

function startAdventure() {
  introTimers.forEach(window.clearTimeout);
  introTimers = [];
  narration.pause();
  window.speechSynthesis?.cancel();
  cinematic.hidden = true;
  intro.hidden = true;
  adventure.hidden = false;
  renderChapter();
  sceneTitle.focus({ preventScroll: true });
  adventure.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderResources() {
  resourceFields.gold.textContent = `${state.gold} gold${state.bankDeposit ? ` + ${state.bankDeposit} locked` : ""}`;
  resourceFields.health.textContent = `${state.health} / 100`;
  resourceFields.supplies.textContent = `${state.supplies} / ${state.capacity}`;
  resourceFields.reputation.textContent = String(state.reputation);
}

function renderChapter() {
  const chapter = chapters[currentChapter];
  hasChosen = false;
  sceneKicker.textContent = chapter.kicker;
  sceneTitle.textContent = chapter.title;
  sceneText.textContent = chapter.id === "tower" && state.towerFundsReleased
    ? `${chapter.text} The bank releases your deposit with 10% interest; your gold total now includes it.` : chapter.text;
  lessonText.textContent = chapter.lesson;
  choiceList.replaceChildren();
  feedback.hidden = true;
  continueButton.hidden = true;
  progressLabel.textContent = chapter.id === "tower" ? "THE FINAL CHAPTER" : `CHAPTER ${currentChapter + 1} OF 9`;
  progressFill.style.width = `${(currentChapter / chapters.length) * 100}%`;
  progressCount.textContent = `${String(currentChapter + 1).padStart(2, "0")} / 09`;
  chapterNote.textContent = currentChapter === 0 ? `Golden Coin roll: ${state.startingGold} gold` : `Starting gold: ${state.startingGold} · ${state.daysLost} day${state.daysLost === 1 ? "" : "s"} lost`;
  renderResources();

  chapter.choices(state).forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.disabled = !choice.available;
    button.title = choice.available ? "" : choice.lockedMessage;
    const marker = document.createElement("span");
    marker.className = "choice-marker";
    marker.setAttribute("aria-hidden", "true");
    marker.textContent = String.fromCharCode(65 + index);
    const content = document.createElement("span");
    content.className = "choice-content";
    const label = document.createElement("span");
    label.className = "choice-label";
    label.textContent = choice.label;
    const detail = document.createElement("span");
    detail.className = "choice-detail";
    detail.textContent = choice.available ? choice.detail : choice.lockedMessage;
    content.append(label, detail);
    const arrow = document.createElement("span");
    arrow.className = "choice-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    button.append(marker, content, arrow);
    button.addEventListener("click", () => selectChoice(choice, button));
    choiceList.append(button);
  });
}

function option(label, detail, resolve, canChoose = () => true, lockedMessage = "") {
  return { label, detail, resolve, available: canChoose(state), lockedMessage };
}

function selectChoice(choice, selectedButton) {
  if (hasChosen || !choice.available) return;
  hasChosen = true;
  const response = choice.resolve(state);
  choiceList.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
    button.classList.toggle("is-selected", button === selectedButton);
    button.querySelector(".choice-arrow").textContent = button === selectedButton ? "✓" : "";
  });
  renderResources();
  feedbackText.textContent = response;
  feedback.hidden = false;
  continueButton.textContent = state.ending ? "See your ending →" : "Continue the story →";
  continueButton.hidden = false;
  continueButton.focus({ preventScroll: true });
}

function advanceStory() {
  if (chapters[currentChapter].id === "tower") { renderEnding(); return; }
  currentChapter += 1;
  const next = chapters[currentChapter];
  if (next.id === "storm") state.supplies = 0;
  if (next.id === "tower" && !state.towerFundsReleased) {
    const deposit = state.bankDeposit;
    state.interestEarned = Math.floor(deposit * 0.1);
    state.gold += deposit + state.interestEarned;
    state.bankDeposit = 0;
    state.towerFundsReleased = true;
  }
  renderChapter();
  sceneTitle.focus({ preventScroll: true });
}

function renderEnding() {
  const endings = {
    rescuer: ["THE RESCUER", "Rowan pays her way into the Tower and finds Prince Ellis waiting. She made it with the gold she kept available."],
    clever: ["THE CLEVER PRINCESS", "The map reveals a hidden entrance. Rowan rescues Prince Ellis without paying the gatekeeper, proving that resources are not always just money."],
    community: ["THE COMMUNITY HERO", "The forest folk Rowan helped arrive together. Their trust opens the Tower and brings the prince home. Reputation and relationships had value on this road."],
    unfinished: ["THE JOURNEY CONTINUES", "The gate stays closed for now. Rowan reaches out to the forest folk and plans another route. A difficult outcome is a chance to reflect, not a judgment of the player."]
  };
  const [endingTitle, endingText] = endings[state.ending] ?? endings.unfinished;
  const profile = getFinancialProfile();
  saveCompletedJourney(profile);
  sceneKicker.textContent = "THE GROVE REMEMBERS";
  sceneTitle.textContent = state.ending === "unfinished" ? "The Tower is not the end of Rowan's story." : "The prince is free. The story belongs to Rowan.";
  sceneText.textContent = endingText;
  lessonText.textContent = "There is no one perfect route. Notice what you valued, what surprised you, and what you might change next time.";
  choiceList.replaceChildren();
  feedbackText.textContent = `Final resources: ${state.gold} gold, ${state.health} health, ${state.supplies} supplies, and ${state.reputation} reputation. You started with ${state.startingGold} gold.`;
  feedback.hidden = false;
  continueButton.hidden = true;
  progressLabel.textContent = "THE END (FOR NOW)";
  progressFill.style.width = "100%";
  progressCount.textContent = "09 / 09";
  chapterNote.textContent = `You spent ${state.totalSpent} gold and earned ${state.interestEarned} interest`;

  const badge = document.createElement("p");
  badge.className = "ending-badge";
  badge.textContent = `✳ ${endingTitle}`;
  const profileCard = document.createElement("div");
  profileCard.className = "profile-result";
  const profileName = document.createElement("strong");
  profileName.textContent = profile.name;
  const profileDescription = document.createElement("span");
  profileDescription.textContent = profile.description;
  profileCard.append(profileName, profileDescription);
  const restart = document.createElement("button");
  restart.type = "button";
  restart.className = "restart-button";
  restart.textContent = "Roll a new Golden Coin";
  restart.addEventListener("click", restartStory);
  choiceList.append(badge, profileCard, restart);
  restart.focus({ preventScroll: true });
}

function getFinancialProfile() {
  if (state.riskChoices >= 2) return { name: "THE RISK TAKER", description: profileDescriptions["THE RISK TAKER"] };
  if (state.helpedVillagers || state.items.has("map") || state.shortcut) return { name: "THE OPPORTUNIST", description: profileDescriptions["THE OPPORTUNIST"] };
  if (state.purchases >= 3 || state.totalSpent >= 70) return { name: "THE SPENDER", description: profileDescriptions["THE SPENDER"] };
  if (state.gold >= state.startingGold * 0.65) return { name: "THE SAVER", description: profileDescriptions["THE SAVER"] };
  return { name: "THE PRUDENT PRINCESS", description: profileDescriptions["THE PRUDENT PRINCESS"] };
}

function restartStory() {
  introTimers.forEach(window.clearTimeout);
  introTimers = [];
  narration.pause();
  narration.currentTime = 0;
  window.speechSynthesis?.cancel();
  gameStarted = false;
  adventure.hidden = true;
  cinematic.hidden = true;
  intro.hidden = false;
  book.classList.remove("is-open");
  bookStage.classList.remove("is-open");
  bookCaption.textContent = "A new tale is waiting";
  beginButton.disabled = false;
  beginButton.querySelector("span:first-child").textContent = "Open the story";
  beginButton.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function spend(game, amount) {
  game.gold -= amount;
  game.totalSpent += amount;
}

function addSupplies(game, amount) {
  const gained = Math.min(amount, game.capacity - game.supplies);
  game.supplies += gained;
  return gained;
}

function dragonDamage(game, amount) {
  game.lastDamage = amount;
  if (game.items.has("cloak")) { game.items.delete("cloak"); game.lastDamage = Math.ceil(amount / 2); }
  game.health = Math.max(0, game.health - game.lastDamage);
}

function rollDie() { return Math.floor(Math.random() * 6) + 1; }

function playIntroNarration() {
  if (!soundOn) return;
  window.speechSynthesis?.cancel();
  if (elevenLabsNarrationPath) {
    narration.src = elevenLabsNarrationPath;
    narration.currentTime = 0;
    narration.play().catch(() => speakWithSystemVoice());
    return;
  }
  speakWithSystemVoice();
}

function speakWithSystemVoice() {
  if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") return;
  const utterance = new SpeechSynthesisUtterance(introNarrationScript);
  utterance.rate = 0.88;
  utterance.pitch = 1.08;
  const preferredVoice = window.speechSynthesis.getVoices().find((voice) => /female|samantha|victoria|zira|aria|jenny|ava/i.test(voice.name));
  if (preferredVoice) utterance.voice = preferredVoice;
  window.speechSynthesis.speak(utterance);
}

beginButton.addEventListener("click", startCinematic);
skipButton.addEventListener("click", startCinematic);
cinematicSkip.addEventListener("click", skipCinematic);
continueButton.addEventListener("click", advanceStory);
window.addEventListener("hashchange", navigateToPage);
navigateToPage();
soundToggle.addEventListener("click", () => {
  soundOn = !soundOn;
  soundToggle.setAttribute("aria-pressed", String(soundOn));
  soundToggle.setAttribute("aria-label", soundOn ? "Turn narration off" : "Turn narration on");
  soundLabel.textContent = soundOn ? "Narration on" : "Narration off";
  if (!soundOn) { narration.pause(); narration.currentTime = 0; window.speechSynthesis?.cancel(); }
  else if (!cinematic.hidden) playIntroNarration();
});