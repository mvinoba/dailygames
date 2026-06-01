const games = [
  { name: "Metazooa", url: "https://metazooa.com", patterns: [/metazooa/i, /animal\s+#?\d+/i] },
  { name: "Globle", url: "https://globle-game.com", patterns: [/globle-game\.com/i, /#globle(?!\s*#capitals)/i] },
  { name: "Globle Capitals", url: "https://globle-capitals.com", patterns: [/globle-capitals\.com/i, /#globle\s+#capitals/i] },
  { name: "Travle BRA", url: "https://travle.earth/bra", patterns: [/travle.*bra/i, /\bbra\b/i] },
  { name: "Travle", url: "https://travle.earth", patterns: [/travle/i] },
  { name: "Linxicon", url: "https://linxicon.com", patterns: [/linxicon/i] },
  { name: "Connections", url: "https://www.nytimes.com/games/connections", patterns: [/connections/i] },
  { name: "Wordle", url: "https://www.nytimes.com/games/wordle", patterns: [/^wordle\b/im] },
  { name: "Betweenle", url: "https://betweenle.com", patterns: [/betweenle/i] },
  { name: "Duotrigordle", url: "https://duotrigordle.com", patterns: [/duotrigordle/i] },
  { name: "Don't Wordle", url: "https://dontwordle.com", patterns: [/don't wordle/i, /dont wordle/i] },
  { name: "Shikaku 5x5", url: "https://www.puzzle-shikaku.com/?size=5", patterns: [/shikaku/i] },
  { name: "Daily Rinds", url: "https://dailyrinds.com", patterns: [/daily rinds/i, /\brands\b/i] },
  { name: "Termo", url: "https://term.ooo", patterns: [/termo/i] },
  { name: "Dueto", url: "https://term.ooo/dueto", patterns: [/dueto/i] },
  { name: "Quarteto", url: "https://term.ooo/quarteto", patterns: [/quarteto/i] },
];

const storageKey = "daily-games-results-v1";

const gameLinks = document.querySelector("#gameLinks");
const gameSelect = document.querySelector("#gameSelect");
const shareInput = document.querySelector("#shareInput");
const readClipboard = document.querySelector("#readClipboard");
const saveResult = document.querySelector("#saveResult");
const clearInput = document.querySelector("#clearInput");
const copySummary = document.querySelector("#copySummary");
const resetResults = document.querySelector("#resetResults");
const savedResults = document.querySelector("#savedResults");
const summaryOutput = document.querySelector("#summaryOutput");
const summaryCount = document.querySelector("#summaryCount");
const statusLine = document.querySelector("#statusLine");

let results = loadResults();

function loadResults() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    return {};
  }
}

function persistResults() {
  localStorage.setItem(storageKey, JSON.stringify(results));
}

function renderGames() {
  gameLinks.innerHTML = games
    .map((game) => {
      return `<a class="game-link" href="${game.url}" target="_blank" rel="noreferrer">
        <span>${game.name}</span><span>Open</span>
      </a>`;
    })
    .join("");

  gameSelect.innerHTML = games
    .map((game) => `<option value="${game.name}">${game.name}</option>`)
    .join("");
}

function detectGame(text) {
  return games.find((game) => game.patterns.some((pattern) => pattern.test(text))) || games[0];
}

function simplifyShare(text, fallbackName) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return "";
  }

  const urlIndex = lines.findIndex((line) => /^https?:\/\//i.test(line));
  const cleaned = lines.filter((line) => !/^https?:\/\//i.test(line) && !/^#/.test(line));
  const first = cleaned[0] || lines[0];
  const scoreLine =
    cleaned.find((line) => /\d+\/\d+|guesses?:|guessed|figured|wordled|avg\.|= \d+/i.test(line)) || "";
  const boardLines = cleaned.filter((line) => /^[\u2b1b\u2b1c\ud83d\udfe9\ud83d\udfe8\ud83d\udd3d\ud83d\udd3c0-9\ufe0f\u20e3\s]+$/.test(line));

  const pieces = [first];
  if (scoreLine && scoreLine !== first) {
    pieces.push(scoreLine);
  }
  if (boardLines.length) {
    pieces.push(boardLines.slice(0, 8).join("\n"));
  }
  if (urlIndex >= 0 && !pieces.some((piece) => piece.includes(lines[urlIndex]))) {
    pieces.push(lines[urlIndex]);
  }

  return `${fallbackName}: ${pieces.join("\n")}`;
}

function setStatus(message) {
  statusLine.textContent = message;
}

function saveCurrentResult() {
  const text = shareInput.value.trim();
  if (!text) {
    setStatus("Nothing to save yet.");
    return;
  }

  const gameName = gameSelect.value;
  results[gameName] = {
    raw: text,
    summary: simplifyShare(text, gameName),
    savedAt: new Date().toISOString(),
  };
  persistResults();
  renderResults();
  setStatus(`Saved ${gameName}.`);
}

function renderResults() {
  const entries = games
    .filter((game) => results[game.name])
    .map((game) => [game, results[game.name]]);

  if (!entries.length) {
    savedResults.innerHTML = `<p class="empty-state">No game results saved yet.</p>`;
  } else {
    savedResults.innerHTML = entries
      .map(([game, result]) => {
        return `<div class="result-row">
          <div class="result-title">${game.name}</div>
          <div class="result-text">${escapeHtml(result.summary)}</div>
          <button class="remove-result" type="button" data-remove="${game.name}">Remove</button>
        </div>`;
      })
      .join("");
  }

  const summary = buildSummary(entries);
  summaryOutput.value = summary;
  summaryCount.textContent = `${entries.length} / ${games.length}`;
}

function buildSummary(entries) {
  const lines = [`Played ${entries.length} out of ${games.length} games.`, "Results:"];
  if (!entries.length) {
    lines.push("> No results pasted yet.");
    return lines.join("\n");
  }

  entries.forEach(([game, result]) => {
    const summary = result.summary || `${game.name}: saved`;
    summary.split("\n").forEach((line) => lines.push(`> ${line}`));
    lines.push(">");
  });

  return lines.join("\n").replace(/\n>$/u, "");
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[char];
  });
}

readClipboard.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    shareInput.value = text;
    const detected = detectGame(text);
    gameSelect.value = detected.name;
    setStatus(`Clipboard read. Detected ${detected.name}.`);
  } catch {
    setStatus("Clipboard access was blocked. Paste manually into the text box.");
  }
});

shareInput.addEventListener("input", () => {
  const text = shareInput.value.trim();
  if (text) {
    gameSelect.value = detectGame(text).name;
  }
});

saveResult.addEventListener("click", saveCurrentResult);

clearInput.addEventListener("click", () => {
  shareInput.value = "";
  setStatus("Paste box cleared.");
});

copySummary.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(summaryOutput.value);
    setStatus("Summary copied.");
  } catch {
    summaryOutput.select();
    setStatus("Copy was blocked. The summary text is selected.");
  }
});

resetResults.addEventListener("click", () => {
  results = {};
  persistResults();
  renderResults();
  setStatus("Results reset.");
});

savedResults.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove]");
  if (!button) {
    return;
  }

  delete results[button.dataset.remove];
  persistResults();
  renderResults();
  setStatus(`Removed ${button.dataset.remove}.`);
});

renderGames();
renderResults();
