export const MAX_GUESSES = 6;
const DAY_MS = 86400000;

export function utcDay(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

function validDay(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
        && Number.isFinite(Date.parse(value)) && utcDay(new Date(value)) === value;
}

export function validGuess(guess) {
    return guess !== null && typeof guess === "object"
        && Number.isInteger(guess.year) && guess.year >= 1996 && guess.year <= 2100
        && Number.isSafeInteger(guess.priceCents) && guess.priceCents >= 0 && guess.priceCents <= 100000000;
}

export function parseGuess(year, price) {
    if (!/^\d{4}$/.test(year) || !/^\d+(?:\.\d{1,2})?$/.test(price)) {
        throw new Error("Enter a four-digit year and a USD price with at most two decimal places.");
    }
    const [dollars, cents = ""] = price.split(".");
    const guess = { year: Number(year), priceCents: Number(dollars) * 100 + Number(cents.padEnd(2, "0")) };
    if (!validGuess(guess)) throw new Error("Use a year from 1996 to 2100 and a price from $0 to $1,000,000.");
    return guess;
}

export function evaluateGuess(guess, card) {
    if (!validGuess(guess)) throw new Error("Invalid guess.");
    const year = guess.year === card.year ? "correct" : guess.year < card.year ? "higher" : "lower";
    // Compare integer tenths of cents so the inclusive 10% boundary never drifts.
    const price = Math.abs(guess.priceCents - card.priceCents) * 10 <= Math.max(250, card.priceCents)
        ? "correct" : guess.priceCents < card.priceCents ? "higher" : "lower";
    return { year, price, won: year === "correct" && price === "correct" };
}

export function outcome(guesses, card) {
    if (guesses.some(guess => evaluateGuess(guess, card).won)) return "won";
    return guesses.length >= MAX_GUESSES ? "lost" : "playing";
}

export function selectPuzzle(data, day) {
    if (!validDay(day) || !data || !Array.isArray(data.decks) || !data.decks.length) {
        throw new Error("Invalid daily card collection.");
    }
    let deck;
    let previousDay = "";
    for (const candidate of data.decks) {
        if (!validDay(candidate.startsOn) || candidate.startsOn <= previousDay
            || !Array.isArray(candidate.cards) || !candidate.cards.length) {
            throw new Error("Daily decks must have unique, ascending start dates and contain cards.");
        }
        previousDay = candidate.startsOn;
        if (candidate.startsOn <= day) deck = candidate;
    }
    if (!deck) throw new Error("The first daily puzzle launches November 7, 2026 (UTC).");
    for (const card of deck.cards) {
        const mask = card.yearMask;
        if (!["id", "name", "set", "number", "variant", "artist"].every(key => typeof card[key] === "string" && card[key].length)
            || !validGuess({ year: card.year, priceCents: card.priceCents }) || card.priceCents === 0
            || !validDay(card.priceDate) || card.priceDate > deck.startsOn
            || typeof card.image !== "string" || !/^https:\/\/images\.pokemontcg\.io\/[\w/-]+\.png$/.test(card.image)
            || typeof card.source !== "string" || !/^https:\/\/prices\.pokemontcg\.io\/tcgplayer\/[\w-]+$/.test(card.source)
            || !mask || ![mask.x, mask.y, mask.width, mask.height].every(Number.isFinite)
            || mask.x < 0 || mask.y < 0 || mask.width <= 0 || mask.height <= 0
            || mask.x + mask.width > 1 || mask.y + mask.height > 1) {
            throw new Error("A daily card has invalid artwork, price, or printing metadata.");
        }
    }
    const index = Math.floor((Date.parse(day) - Date.parse(deck.startsOn)) / DAY_MS) % deck.cards.length;
    return { day, card: deck.cards[index], deck: deck.startsOn };
}

export function selectPracticePuzzle(data, day, index) {
    const daily = selectPuzzle(data, day);
    const deck = data.decks.find(deck => deck.startsOn === daily.deck);
    if (!Number.isInteger(index) || index < 0 || index >= deck.cards.length) {
        throw new Error("Choose a test card from the active collection.");
    }
    return { ...daily, card: deck.cards[index], practice: true };
}

export function puzzleIdentity(puzzle) {
    return `${puzzle.day}/${puzzle.deck}/${puzzle.card.id}/${puzzle.card.year}/${puzzle.card.priceCents}`;
}

export function readProgress(raw, puzzle) {
    if (raw === null) return [];
    const saved = JSON.parse(raw);
    if (!saved || saved.identity !== puzzleIdentity(puzzle) || !Array.isArray(saved.guesses)
        || saved.guesses.length > MAX_GUESSES || !saved.guesses.every(validGuess)
        || saved.guesses.slice(0, -1).some(guess => evaluateGuess(guess, puzzle.card).won)) {
        throw new Error("Saved progress is invalid or no longer matches this puzzle.");
    }
    return saved.guesses;
}

export function shareText(puzzle, guesses) {
    if (puzzle.practice) throw new Error("Practice results cannot be shared as a daily challenge.");
    const result = outcome(guesses, puzzle.card);
    if (result === "playing") throw new Error("Finish the puzzle before sharing.");
    const symbols = { correct: "\u{1F7E9}", higher: "\u{2B06}\uFE0F", lower: "\u{2B07}\uFE0F" };
    const grid = guesses.map(guess => {
        const hints = evaluateGuess(guess, puzzle.card);
        return `${symbols[hints.year]} ${symbols[hints.price]}`;
    }).join("\n");
    return `Card Chronicle ${puzzle.day}\n${result === "won" ? guesses.length : "X"}/${MAX_GUESSES}\nYear / Price\n${grid}\nhttps://bluefiregames.net/games/card-chronicle/`;
}
