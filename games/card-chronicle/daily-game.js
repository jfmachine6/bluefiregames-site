import { MAX_GUESSES, utcDay, parseGuess, evaluateGuess, outcome, selectPuzzle, selectPracticePuzzle, puzzleIdentity, readProgress, shareText } from "./game-core.js";

const el = id => document.getElementById(id);
const dollars = cents => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
let collection;
let puzzle;
let guesses = [];
let artReady = false;
let artTimer;
let storageAvailable = true;
let loading = false;
let dailySnapshot;
let practiceCards = [];
let practiceIndex = 0;
const storageKey = () => `bluefire-card-chronicle:${puzzle.day}`;

function notice(id, text) {
    el(id).textContent = text;
    el(id).hidden = !text;
}

function restoreProgress() {
    try {
        guesses = readProgress(localStorage.getItem(storageKey()), puzzle);
        storageAvailable = true;
    } catch (error) {
        console.error("Card Chronicle could not restore progress.", error);
        storageAvailable = false;
        notice("storage-notice", "Saved progress could not be read. Continuing with this tab's progress; saving will be retried after your next guess.");
    }
}

function saveProgress() {
    try {
        localStorage.setItem(storageKey(), JSON.stringify({ identity: puzzleIdentity(puzzle), guesses }));
        storageAvailable = true;
        notice("storage-notice", "");
    } catch (error) {
        console.error("Card Chronicle could not save progress.", error);
        storageAvailable = false;
        notice("storage-notice", "Progress could not be saved. You can keep playing in this tab, but a reload may lose your guesses.");
    }
}

function render() {
    const result = outcome(guesses, puzzle.card);
    el("guess-controls").disabled = !artReady || result !== "playing";
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
        el("next-puzzle").textContent = "Next card at midnight UTC.";
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

function startDay() {
    puzzle = selectPuzzle(collection, utcDay());
    const hasSnapshot = dailySnapshot?.identity === puzzleIdentity(puzzle);
    guesses = hasSnapshot ? [...dailySnapshot.guesses] : [];
    if (hasSnapshot && !storageAvailable) {
        notice("storage-notice", dailySnapshot.notice);
    } else {
        restoreProgress();
    }
    practiceCards = collection.decks.find(deck => deck.startsOn === puzzle.deck).cards;
    el("practice-card").replaceChildren(...practiceCards.map((card, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = `Test card ${index + 1}`;
        return option;
    }));
    el("daily-mode").setAttribute("aria-pressed", "true");
    el("practice-mode").setAttribute("aria-pressed", "false");
    el("practice-panel").hidden = true;
    el("daily-label").textContent = `${puzzle.day} / Resets at midnight UTC / ${MAX_GUESSES} guesses`;
    resetAttempt();
}

function resetAttempt() {
    el("guess-form").reset();
    notice("guess-error", "");
    notice("share-status", "");
    el("share-output").hidden = true;
    loadArtwork();
}

function startPractice(index) {
    if (!puzzle.practice) {
        dailySnapshot = { identity: puzzleIdentity(puzzle), guesses: [...guesses], notice: el("storage-notice").textContent };
    }
    practiceIndex = index;
    puzzle = selectPracticePuzzle(collection, puzzle.day, index);
    guesses = [];
    el("practice-card").value = index;
    el("practice-panel").hidden = false;
    el("daily-mode").setAttribute("aria-pressed", "false");
    el("practice-mode").setAttribute("aria-pressed", "true");
    el("daily-label").textContent = `Practice / Test card ${index + 1} of ${practiceCards.length} / ${MAX_GUESSES} fresh guesses`;
    notice("storage-notice", "");
    resetAttempt();
}

async function loadPuzzle() {
    if (loading) return;
    loading = true;
    el("daily-mode").disabled = true;
    el("practice-mode").disabled = true;
    el("retry-puzzle").hidden = true;
    notice("load-error", "");
    try {
        const response = await fetch("./cards.json", { cache: "no-cache", signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error(`Card collection request failed (${response.status}).`);
        collection = await response.json();
        startDay();
        el("daily-mode").disabled = false;
        el("practice-mode").disabled = false;
    } catch (error) {
        console.error("Card Chronicle could not load today's puzzle.", error);
        el("guess-controls").disabled = true;
        notice("load-error", "Today's puzzle could not load. Check your connection and retry.");
        notice("art-status", "Artwork unavailable until the puzzle loads.");
        el("retry-puzzle").hidden = false;
    } finally {
        loading = false;
    }
}

function checkDay() {
    if (puzzle && !puzzle.practice && puzzle.day !== utcDay()) {
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
    return Boolean(puzzle);
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
    if (!puzzle.practice) saveProgress();
    render();
    if (outcome(guesses, puzzle.card) === "playing") el("guess-year").focus();
});

el("retry-art").addEventListener("click", () => { if (checkDay()) loadArtwork(); });
el("retry-puzzle").addEventListener("click", loadPuzzle);
el("practice-mode").addEventListener("click", () => {
    if (checkDay() && !puzzle.practice) startPractice(0);
});
el("daily-mode").addEventListener("click", () => {
    if (puzzle?.practice) startDay();
});
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
});
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkDay(); });
setInterval(checkDay, 1000);
loadPuzzle();
