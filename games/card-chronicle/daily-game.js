// Version: v0.2.4.1.1
import { MAX_GUESSES, utcDay, parseGuess, evaluateGuess, outcome, selectPuzzle, selectScheduledPuzzle, archiveDays, selectPracticePuzzle, puzzleIdentity, readProgress, shareText } from "./game-core.js";
import { fetchPuzzleJson, fetchSchedule, fetchScheduledPuzzle } from "./puzzle-source.js";
import { ROUND_PREFIX, createRoundRecord, readRoundHistory } from "./round-history.js";

const el = id => document.getElementById(id);
const dollars = cents => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
let collection;
let schedule;
let dayRequest = 0;
let loadingDay = false;
const loadedPuzzles = new Map();
let puzzle;
let guesses = [];
let artReady = false;
let artTimer;
let storageAvailable = true;
let loading = false;
const snapshots = new Map();
const pendingRounds = new Map();
let roundId;
let archivePage = 0;
let roundPage = 0;
let lastCalendarDay = utcDay();
let practiceCards = [];
let practiceIndex = 0;
const dayStorageKey = day => `bluefire-card-chronicle-v2:${day}`;
const storageKey = () => dayStorageKey(puzzle.day);
const requestedDay = () => new URL(location.href).searchParams.get("day") || utcDay();

function notice(id, text) {
    el(id).textContent = text;
    el(id).hidden = !text;
}

function restoreProgress() {
    const snapshot = snapshots.get(puzzleIdentity(puzzle));
    if (snapshot && !snapshot.saved) {
        guesses = [...snapshot.guesses];
        storageAvailable = false;
        notice("storage-notice", snapshot.notice);
        return;
    }
    try {
        guesses = readProgress(localStorage.getItem(storageKey()), puzzle);
        storageAvailable = true;
        notice("storage-notice", "");
    } catch (error) {
        console.error("Card Chronicle could not restore progress.", error);
        storageAvailable = false;
        notice("storage-notice", "Saved progress could not be read. Continuing with this tab's progress; saving will be retried after your next guess.");
    }
}

function saveProgress() {
    try {
        localStorage.setItem(storageKey(), JSON.stringify({
            identity: puzzleIdentity(puzzle), guesses, card: puzzle.card,
            updatedAt: new Date().toISOString()
        }));
        storageAvailable = true;
        notice("storage-notice", "");
    } catch (error) {
        console.error("Card Chronicle could not save progress.", error);
        storageAvailable = false;
        notice("storage-notice", "Progress could not be saved. You can keep playing in this tab, but a reload may lose your guesses.");
    }
    rememberProgress();
}

function rememberProgress() {
    if (puzzle && !puzzle.practice) {
        snapshots.set(puzzleIdentity(puzzle), {
            guesses: [...guesses], saved: storageAvailable, notice: el("storage-notice").textContent
        });
    }
}

function savePracticeRound() {
    const record = createRoundRecord(puzzle, guesses, roundId);
    pendingRounds.set(record.id, record);
    flushRounds();
}

function flushRounds() {
    for (const [id, record] of pendingRounds) {
        try {
            localStorage.setItem(ROUND_PREFIX + id, JSON.stringify(record));
            pendingRounds.delete(id);
        } catch (error) {
            console.error("Card Chronicle could not save a completed practice round.", error);
            notice("round-save-notice", `${pendingRounds.size} completed practice round(s) could not be saved. Kept in this tab only; retry before closing it.`);
            el("retry-round-save").hidden = false;
            renderHistory();
            return;
        }
    }
    notice("round-save-notice", "");
    el("retry-round-save").hidden = true;
    renderHistory();
}

function textElement(tag, text, className = "") {
    const element = document.createElement(tag);
    element.textContent = text;
    element.className = className;
    return element;
}

function resultLabel(attempts, card) {
    const result = outcome(attempts, card);
    return result === "won" ? `Won in ${attempts.length}/6`
        : result === "lost" ? "Lost (6/6)" : attempts.length ? `In progress (${attempts.length}/6)` : "Not played";
}

function renderArchive() {
    if (!schedule) return;
    const today = utcDay();
    const listing = archiveDays(schedule, today, archivePage);
    if (archivePage && !listing.days.length) {
        archivePage = Math.max(0, listing.pages - 1);
        renderArchive();
        return;
    }
    el("archive-date").min = schedule.puzzles.at(-1)?.day || today;
    el("archive-date").max = today;
    el("archive-date").value = puzzle?.archive ? puzzle.day : today;
    el("archive-list").replaceChildren();
    for (const day of listing.days) {
        const row = textElement("article", "", "history-entry");
        row.append(textElement("strong", day));
        try {
            const knownPuzzle = loadedPuzzles.get(day);
            const retained = knownPuzzle && snapshots.get(puzzleIdentity(knownPuzzle));
            const raw = retained && !retained.saved ? null : localStorage.getItem(dayStorageKey(day));
            const saved = raw === null ? null : JSON.parse(raw);
            const item = schedule.puzzles.find(item => item.day === day);
            const oldPuzzle = knownPuzzle || (saved && selectScheduledPuzzle({
                id: item.id, game: "card-chronicle", day, card: saved.card
            }, day, today));
            const snapshot = oldPuzzle && snapshots.get(puzzleIdentity(oldPuzzle));
            const attempts = snapshot && !snapshot.saved ? snapshot.guesses : oldPuzzle ? readProgress(raw, oldPuzzle) : [];
            if (!oldPuzzle) {
                row.append(textElement("p", "Not played"));
            } else {
                row.append(textElement("p", `${resultLabel(attempts, oldPuzzle.card)}${snapshot && !snapshot.saved ? " / Not saved" : ""}`));
                if (outcome(attempts, oldPuzzle.card) !== "playing") {
                    row.append(textElement("p", `${oldPuzzle.card.name} / ${oldPuzzle.card.set} #${oldPuzzle.card.number} / ${oldPuzzle.card.year} / ${dollars(oldPuzzle.card.priceCents)} (${oldPuzzle.card.variant}; source ${oldPuzzle.card.priceDate})`));
                }
            }
        } catch (error) {
            console.error("Card Chronicle could not read archive progress.", day, error);
            row.append(textElement("p", "Saved progress unavailable or invalid. Opening this date will report the problem.", "error"));
        }
        const button = textElement("button", `Play / review ${day}`, "game-button");
        button.type = "button";
        button.addEventListener("click", () => openDay(day));
        row.append(button);
        el("archive-list").append(row);
    }
    if (!listing.days.length) el("archive-list").append(textElement("p", "No past days yet. The archive begins after the first UTC daily reset.", "muted"));
    el("archive-page").textContent = `${listing.count} past days / Page ${listing.pages ? archivePage + 1 : 0} of ${listing.pages}`;
    el("archive-newer").disabled = archivePage === 0;
    el("archive-older").disabled = archivePage + 1 >= listing.pages;
}

function renderHistory() {
    el("round-list").replaceChildren();
    let records;
    try {
        const history = readRoundHistory(localStorage);
        notice("history-error", history.errors.length ? `${history.errors.length} saved round(s) could not be read. Other records are shown below.` : "");
        const merged = new Map(history.records.map(record => [record.id, record]));
        pendingRounds.forEach((record, id) => merged.set(id, record));
        records = [...merged.values()].sort((a, b) => b.completedAt.localeCompare(a.completedAt) || b.id.localeCompare(a.id));
    } catch (error) {
        console.error("Card Chronicle round history storage is unavailable.", error);
        notice("history-error", "Saved round history could not be read. Only rounds retained in this tab can be shown.");
        records = [...pendingRounds.values()].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    }
    const pages = Math.ceil(records.length / 10);
    roundPage = Math.min(roundPage, Math.max(0, pages - 1));
    for (const record of records.slice(roundPage * 10, (roundPage + 1) * 10)) {
        const row = textElement("article", "", "history-entry");
        row.append(textElement("strong", `Practice / ${resultLabel(record.guesses, record.card)}`));
        row.append(textElement("p", `${record.completedAt.replace("T", " ").replace("Z", " UTC")} / ${record.card.name} / ${record.card.set} #${record.card.number}`));
        row.append(textElement("p", `Answer: ${record.card.year} / ${dollars(record.card.priceCents)} / ${record.card.variant} / Source updated ${record.card.priceDate}`));
        if (pendingRounds.has(record.id)) row.append(textElement("p", "Not saved: retained in this tab only.", "notice"));
        const details = document.createElement("details");
        details.append(textElement("summary", "Review guesses"));
        const list = document.createElement("ol");
        for (const guess of record.guesses) {
            const hints = evaluateGuess(guess, record.card);
            list.append(textElement("li", `${guess.year} (${hints.year}) / ${dollars(guess.priceCents)} (${hints.price})`));
        }
        details.append(list);
        row.append(details);
        el("round-list").append(row);
    }
    if (!records.length) el("round-list").append(textElement("p", "No completed practice rounds saved yet.", "muted"));
    el("round-page").textContent = `${records.length} rounds / Page ${pages ? roundPage + 1 : 0} of ${pages}`;
    el("round-newer").disabled = roundPage === 0;
    el("round-older").disabled = roundPage + 1 >= pages;
}

async function openDay(day) {
    const requestId = ++dayRequest;
    rememberProgress();
    loadingDay = true;
    el("guess-controls").disabled = true;
    notice("load-error", "");
    el("retry-puzzle").hidden = true;
    try {
        const selected = await fetchScheduledPuzzle(schedule, day);
        if (requestId !== dayRequest) return;
        loadedPuzzles.set(day, selected);
        startDay(selected);
        el("archive-panel").hidden = true;
        el("archive-mode").setAttribute("aria-expanded", "false");
        notice("archive-error", "");
    } catch (error) {
        if (requestId !== dayRequest) return;
        console.error("Card Chronicle could not open the selected date.", error);
        notice("archive-error", error.message);
        notice("load-error", `${error.message} Practice cards are available below. If the Worker was just updated, check its deployment and retry.`);
        el("retry-puzzle").hidden = false;
        if (!puzzle) notice("art-status", "Daily artwork unavailable. Choose Practice to play now.");
    } finally {
        if (requestId === dayRequest) {
            loadingDay = false;
            if (puzzle) render();
        }
    }
}

function render() {
    const result = outcome(guesses, puzzle.card);
    el("guess-controls").disabled = loadingDay || !artReady || result !== "playing";
    el("priced-variant").textContent = `Price this variant: ${puzzle.card.variant}`;
    el("guess-history").replaceChildren();
    guesses.forEach((guess, index) => {
        const hints = evaluateGuess(guess, puzzle.card);
        const row = document.createElement("tr");
        const attempt = document.createElement("th");
        attempt.scope = "row";
        attempt.textContent = index + 1;
        row.append(attempt);
        for (const [value, hint] of [[guess.year, hints.year], [dollars(guess.priceCents), hints.price]]) {
            const cell = document.createElement("td");
            cell.textContent = value;
            const label = document.createElement("span");
            label.className = `hint ${hint}`;
            label.textContent = hint === "correct" ? "Correct" : `Answer is ${hint}`;
            cell.append(label);
            row.append(cell);
        }
        el("guess-history").append(row);
    });
    el("game-status").textContent = result === "won"
        ? `You got it in ${guesses.length} of ${MAX_GUESSES} guesses!`
        : result === "lost" ? "No guesses left. Here's the card."
        : `${MAX_GUESSES - guesses.length} guesses remaining.`;
    el("answer").hidden = result === "playing";
    el("share-panel").hidden = puzzle.practice || result === "playing";
    el("year-blur").hidden = result !== "playing";
    el("card-art").alt = result === "playing"
        ? `${puzzle.card.name} Pokemon card with the bottom copyright year blurred`
        : `${puzzle.card.name} Pokemon card by ${puzzle.card.artist}`;
    if (result !== "playing") {
        const card = puzzle.card;
        el("answer-name").textContent = card.name;
        el("answer-details").textContent = `${card.set} #${card.number} / ${card.year} / ${card.variant}`;
        el("answer-price").textContent = `${dollars(card.priceCents)} USD market snapshot. Source updated ${card.priceDate}.`;
        el("answer-artist").textContent = `Artwork by ${card.artist}.`;
        el("price-source").href = card.source;
        el("next-puzzle").textContent = puzzle.archive ? "Archived result. Catch up on another day or return to today's challenge." : "Next card at midnight UTC.";
    }
}

function loadArtwork() {
    artReady = false;
    clearTimeout(artTimer);
    el("card-display").hidden = true;
    el("retry-art").hidden = true;
    notice("art-status", "Loading card artwork...");
    render();
    const image = el("card-art");
    const currentPuzzle = puzzle;
    const fail = () => {
        clearTimeout(artTimer);
        if (puzzle !== currentPuzzle) return;
        console.error("Card Chronicle artwork could not load.", currentPuzzle.card.image);
        artReady = false;
        el("card-display").hidden = true;
        notice("art-status", "Card artwork could not load. Check your connection and retry; no guesses were used.");
        el("retry-art").hidden = false;
        render();
    };
    image.onload = () => {
        if (puzzle !== currentPuzzle) return;
        clearTimeout(artTimer);
        const mask = puzzle.card.yearMask;
        el("year-blur").style.left = `${mask.x * 100}%`;
        el("year-blur").style.top = `${mask.y * 100}%`;
        el("year-blur").style.width = `${mask.width * 100}%`;
        el("year-blur").style.height = `${mask.height * 100}%`;
        artReady = true;
        el("card-display").hidden = false;
        el("retry-art").hidden = true;
        notice("art-status", "");
        render();
    };
    image.onerror = fail;
    artTimer = setTimeout(fail, 20000);
    image.removeAttribute("src");
    image.src = puzzle.card.image;
}

function startDay(selected) {
    puzzle = selected;
    guesses = [];
    restoreProgress();
    el("daily-mode").setAttribute("aria-pressed", String(!puzzle.archive));
    el("practice-mode").setAttribute("aria-pressed", "false");
    el("practice-panel").hidden = true;
    const url = new URL(location.href);
    if (puzzle.archive) url.searchParams.set("day", puzzle.day);
    else url.searchParams.delete("day");
    history.replaceState(null, "", url);
    el("daily-label").textContent = `${puzzle.archive ? "Archive / " : ""}${puzzle.day} / ${MAX_GUESSES} guesses${puzzle.archive ? "" : " / Resets at midnight UTC"}`;
    resetAttempt();
    renderArchive();
    renderHistory();
}

function resetAttempt() {
    el("guess-form").reset();
    notice("guess-error", "");
    notice("share-status", "");
    el("share-output").hidden = true;
    loadArtwork();
}

function startPractice(index) {
    dayRequest++;
    loadingDay = false;
    rememberProgress();
    practiceIndex = index;
    puzzle = selectPracticePuzzle(collection, utcDay(), index);
    roundId = crypto.randomUUID();
    guesses = [];
    el("practice-card").value = index;
    el("practice-panel").hidden = false;
    el("archive-panel").hidden = true;
    el("archive-mode").setAttribute("aria-expanded", "false");
    el("daily-mode").setAttribute("aria-pressed", "false");
    el("practice-mode").setAttribute("aria-pressed", "true");
    el("daily-label").textContent = `Practice / Test card ${index + 1} of ${practiceCards.length} / ${MAX_GUESSES} fresh guesses`;
    notice("storage-notice", "");
    notice("load-error", "");
    el("retry-puzzle").hidden = true;
    resetAttempt();
}

async function loadPuzzle() {
    if (loading) return;
    loading = true;
    el("daily-mode").disabled = true;
    el("practice-mode").disabled = true;
    el("archive-mode").disabled = true;
    el("retry-puzzle").hidden = true;
    notice("load-error", "");
    try {
        const results = await Promise.allSettled([fetchPuzzleJson("./cards.json"), fetchSchedule()]);
        const [practiceResult, scheduleResult] = results;
        if (practiceResult.status === "fulfilled") {
            try {
                if (practiceResult.value.version !== 2 || practiceResult.value.minimumPriceCents !== 100) {
                    throw new Error("Expected the curated $1+ practice collection.");
                }
                const activeDeck = selectPuzzle(practiceResult.value, utcDay()).deck;
                collection = practiceResult.value;
                practiceCards = collection.decks.find(deck => deck.startsOn === activeDeck).cards;
                el("practice-card").replaceChildren(...practiceCards.map((card, index) => {
                    const option = document.createElement("option");
                    option.value = index;
                    option.textContent = `Test card ${index + 1}`;
                    return option;
                }));
                el("practice-mode").disabled = false;
                notice("practice-error", "");
            } catch (error) {
                console.error("Card Chronicle practice data is invalid.", error);
                notice("practice-error", `Practice cards could not load: ${error.message}`);
            }
        } else {
            console.error("Card Chronicle practice cards could not load.", practiceResult.reason);
            notice("practice-error", `Practice cards could not load: ${practiceResult.reason.message}`);
        }
        if (scheduleResult.status === "fulfilled") {
            schedule = scheduleResult.value;
            el("daily-mode").disabled = false;
            el("archive-mode").disabled = false;
            renderArchive();
            await openDay(requestedDay());
        } else {
            console.error("Card Chronicle daily schedule could not load.", scheduleResult.reason);
            notice("load-error", `Daily schedule unavailable: ${scheduleResult.reason.message} You can still play Practice. Retry to reload the schedule.`);
            notice("art-status", "Choose Practice while the daily service is unavailable.");
            el("retry-puzzle").hidden = false;
        }
    } finally {
        loading = false;
        el("retry-puzzle").hidden = !el("load-error").textContent && !el("practice-error").textContent;
    }
}

function checkDay() {
    const today = utcDay();
    if (today !== lastCalendarDay) {
        lastCalendarDay = today;
        el("guess-year").max = Number(today.slice(0, 4));
        if (puzzle?.practice || puzzle?.archive) {
            fetchSchedule().then(updated => {
                schedule = updated;
                renderArchive();
            }).catch(error => {
                console.error("Card Chronicle could not refresh released dates after midnight.", error);
                notice("load-error", "New archive dates could not load. Your current round is unchanged; retry to reload the schedule.");
                el("retry-puzzle").hidden = false;
            });
        }
    }
    if (puzzle && !puzzle.practice && !puzzle.archive && puzzle.day !== today) {
        rememberProgress();
        el("guess-controls").disabled = true;
        clearTimeout(artTimer);
        el("card-art").onload = null;
        el("card-art").onerror = null;
        el("card-display").hidden = true;
        el("answer").hidden = true;
        el("share-panel").hidden = true;
        el("guess-history").replaceChildren();
        puzzle = undefined;
        loadPuzzle();
        return false;
    }
    return Boolean(puzzle) && !loadingDay;
}

el("guess-form").addEventListener("submit", event => {
    event.preventDefault();
    if (!checkDay()) {
        notice("guess-error", "A new UTC day has started. Today's puzzle is loading; submit your guess again when ready.");
        return;
    }
    if (!artReady || outcome(guesses, puzzle.card) !== "playing") return;
    // Refresh progress from other tabs before recording this attempt.
    if (!puzzle.practice && storageAvailable) restoreProgress();
    if (outcome(guesses, puzzle.card) !== "playing") {
        render();
        return;
    }
    try {
        const guess = parseGuess(el("guess-year").value, el("guess-price").value);
        guesses.push(guess);
    } catch (error) {
        notice("guess-error", error.message);
        return;
    }
    notice("guess-error", "");
    if (!puzzle.practice) {
        saveProgress();
        renderArchive();
    } else if (outcome(guesses, puzzle.card) !== "playing") {
        savePracticeRound();
    }
    render();
    if (outcome(guesses, puzzle.card) === "playing") el("guess-year").focus();
});

el("retry-art").addEventListener("click", () => { if (checkDay()) loadArtwork(); });
el("retry-puzzle").addEventListener("click", loadPuzzle);
el("practice-mode").addEventListener("click", () => {
    if (collection && !puzzle?.practice) startPractice(0);
});
function alignGuessViewport() {
    const focused = el("guess-form").contains(document.activeElement);
    const compact = matchMedia("(max-width: 760px)").matches && focused;
    document.body.classList.toggle("chronicle-input-active", compact);
    document.documentElement.style.setProperty("--game-viewport-height", `${window.visualViewport?.height ?? window.innerHeight}px`);
    if (compact) requestAnimationFrame(() => el("puzzle-stage").scrollIntoView({ block: "start" }));
}
el("guess-form").addEventListener("focusin", alignGuessViewport);
el("guess-form").addEventListener("focusout", () => requestAnimationFrame(alignGuessViewport));
window.visualViewport?.addEventListener("resize", alignGuessViewport);
window.addEventListener("resize", alignGuessViewport);
el("guess-year").max = Number(utcDay().slice(0, 4));
el("daily-mode").addEventListener("click", () => {
    if (!puzzle || puzzle.practice || puzzle.archive) openDay(utcDay());
});
el("archive-mode").addEventListener("click", () => {
    el("archive-panel").hidden = !el("archive-panel").hidden;
    el("archive-mode").setAttribute("aria-expanded", String(!el("archive-panel").hidden));
    renderArchive();
});
el("archive-form").addEventListener("submit", event => {
    event.preventDefault();
    openDay(el("archive-date").value);
});
el("archive-newer").addEventListener("click", () => { archivePage--; renderArchive(); });
el("archive-older").addEventListener("click", () => { archivePage++; renderArchive(); });
el("round-newer").addEventListener("click", () => { roundPage--; renderHistory(); });
el("round-older").addEventListener("click", () => { roundPage++; renderHistory(); });
el("refresh-history").addEventListener("click", () => { renderArchive(); renderHistory(); });
el("retry-round-save").addEventListener("click", flushRounds);
el("practice-card").addEventListener("change", () => startPractice(Number(el("practice-card").value)));
el("next-card").addEventListener("click", () => startPractice((practiceIndex + 1) % practiceCards.length));
el("restart-card").addEventListener("click", () => startPractice(practiceIndex));
el("share-results").addEventListener("click", async () => {
    if (!checkDay() || puzzle.practice || outcome(guesses, puzzle.card) === "playing") return;
    const text = shareText(puzzle, guesses);
    el("share-output").value = text;
    el("share-output").hidden = false;
    try {
        await navigator.clipboard.writeText(text);
        notice("share-status", "Spoiler-free results copied!");
    } catch (error) {
        console.warn("Clipboard unavailable for Card Chronicle.", error);
        notice("share-status", "Clipboard unavailable. Copy the results below instead.");
        el("share-output").focus();
        el("share-output").select();
    }
});
window.addEventListener("storage", event => {
    if (puzzle && !puzzle.practice && (event.key === storageKey() || event.key === null)) {
        restoreProgress();
        render();
    }
    renderArchive();
    renderHistory();
});
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkDay(); });
setInterval(checkDay, 1000);
renderHistory();
loadPuzzle();
