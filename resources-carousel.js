// Mounts the CoverFlowCarousel from carousel.js (a React + TypeScript component) on the Resources page.
// The site has no build step, so React, ReactDOM and Babel load from a CDN the first time the page is
// opened, and Babel compiles carousel.js in the browser. The site must be served over HTTP (see README).
const carouselScripts = [
  "https://unpkg.com/react@18.3.1/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js",
  "https://unpkg.com/@babel/standalone@7.26.4/babel.min.js"
];

// Each card opens its link in a new tab. A `featured` card is drawn as golden treasure, and its
// `branches` appear as separate links on the card.
const resourceLinks = [
  {
    tag: "#GoldenTreasure",
    titleLine1: "INVESTOPEDIA",
    titleLine2: "– THE TREASURE VAULT",
    desc: "Practice with pretend money, then explore investing, trading, and every money word you meet",
    img: "assets/resources/treasure.svg",
    ctaUrl: "https://www.investopedia.com/simulator/",
    featured: true,
    branches: [
      { label: "Simulator", url: "https://www.investopedia.com/simulator/" },
      { label: "Investing", url: "https://www.investopedia.com/investing-4427685" },
      { label: "Trading", url: "https://www.investopedia.com/trading-4427765" },
      { label: "Dictionary", url: "https://www.investopedia.com/financial-term-dictionary-4769738" }
    ]
  },
  {
    tag: "#NeedsAndWants",
    titleLine1: "MONEY AS YOU GROW",
    titleLine2: "– CFPB",
    desc: "Age-by-age money activities from the Consumer Financial Protection Bureau",
    img: "assets/resources/sprout.svg",
    ctaText: "Open resource",
    ctaUrl: "https://www.consumerfinance.gov/consumer-tools/money-as-you-grow/"
  },
  {
    tag: "#LearnTheBasics",
    titleLine1: "PERSONAL FINANCE",
    titleLine2: "– KHAN ACADEMY",
    desc: "Free lessons on budgeting, saving, credit, and investing",
    img: "assets/resources/book.svg",
    ctaText: "Open resource",
    ctaUrl: "https://www.khanacademy.org/college-careers-more/personal-finance"
  },
  {
    tag: "#SavingAndInterest",
    titleLine1: "COMPOUND INTEREST",
    titleLine2: "– INVESTOR.GOV",
    desc: "See how savings can grow over time, like the Bank of Fairyland's 10%",
    img: "assets/resources/coins.svg",
    ctaText: "Try the calculator",
    ctaUrl: "https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator"
  },
  {
    tag: "#RiskAndReward",
    titleLine1: "PRACTICAL MONEY SKILLS",
    titleLine2: "– GAMES & GUIDES",
    desc: "Interactive games and guides for weighing choices and planning ahead",
    img: "assets/resources/scales.svg",
    ctaText: "Open resource",
    ctaUrl: "https://www.practicalmoneyskills.com/"
  },
  {
    tag: "#ProtectYourMoney",
    titleLine1: "MONEY SMART",
    titleLine2: "– FDIC",
    desc: "Learn to spot scams, like the mysterious wizard's 'guaranteed' fortune",
    img: "assets/resources/shield.svg",
    ctaText: "Open resource",
    ctaUrl: "https://www.fdic.gov/consumer-resource-center/money-smart"
  }
];

let carouselRequested = false;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.append(script);
  });
}

async function loadCarouselComponent() {
  for (const src of carouselScripts) await loadScript(src);
  const response = await fetch("carousel.js");
  if (!response.ok) throw new Error("Could not load carousel.js");
  const { code } = window.Babel.transform(await response.text(), {
    filename: "carousel.tsx",
    presets: [["typescript", { isTSX: true, allExtensions: true }], "react"],
    plugins: ["transform-modules-commonjs"]
  });
  const module = { exports: {} };
  const dependencies = { react: window.React };
  new Function("require", "module", "exports", code)((name) => dependencies[name], module, module.exports);
  return module.exports.CoverFlowCarousel;
}

function renderFallbackLinks(container) {
  const list = document.createElement("ul");
  list.className = "resources-carousel-fallback";
  const makeLink = (url, text) => {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = text;
    return link;
  };
  resourceLinks.forEach((item) => {
    const entry = document.createElement("li");
    entry.append(makeLink(item.ctaUrl, `${item.titleLine1} ${item.titleLine2 ?? ""}`.trim()));
    item.branches?.forEach((branch) => entry.append(" · ", makeLink(branch.url, branch.label)));
    list.append(entry);
  });
  container.replaceChildren(list);
}

async function mountResourcesCarousel() {
  if (carouselRequested) return;
  carouselRequested = true;
  const container = document.querySelector("#resources-carousel");
  try {
    const CoverFlowCarousel = await loadCarouselComponent();
    container.replaceChildren();
    window.ReactDOM.createRoot(container).render(window.React.createElement(CoverFlowCarousel, {
      items: resourceLinks,
      sectionLabel: "THE TRAVELER'S LIBRARY",
      autoplayDelay: 6000,
      onCtaClick: (item) => window.open(item.ctaUrl, "_blank", "noopener,noreferrer")
    }));
  } catch {
    renderFallbackLinks(container);
  } finally {
    container.removeAttribute("aria-busy");
  }
}

function mountCarouselOnResourcesPage() {
  if (window.location.hash === "#resources") mountResourcesCarousel();
}

window.addEventListener("hashchange", mountCarouselOnResourcesPage);
mountCarouselOnResourcesPage();
