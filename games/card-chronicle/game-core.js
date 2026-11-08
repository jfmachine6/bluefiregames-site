// Version: v0.2.4.1.1
export const MAX_GUESSES = 6;
const DAY_MS = 86400000;

export function utcDay(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

function validDay(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
        && Number.isFinite(Date.parse(value)) && utcDay(new Date(value)) === value;
}

export function validateCard(card, snapshotDay, minimumPriceCents = 1) {
    const mask = card?.yearMask;
    if (!card || !["id", "name", "set", "number", "variant", "artist"].every(key => typeof card[key] === "string" && card[key].length)
        || !validGuess({ year: card.year, priceCents: card.priceCents }) || card.priceCents < minimumPriceCents
        || !validDay(snapshotDay) || !validDay(card.priceDate) || card.priceDate > snapshotDay
        || typeof card.image !== "string" || !(
            /^https:\/\/images\.pokemontcg\.io\/[\w/-]+\.png$/.test(card.image)
            || /^https:\/\/assets\.tcgdex\.net\/en\/[\w-]+\/[\w.-]+\/[\w-]+\/high\.png$/.test(card.image))
        || typeof card.source !== "string" || !(
            /^https:\/\/prices\.pokemontcg\.io\/tcgplayer\/[\w-]+$/.test(card.source)
            || /^https:\/\/www\.tcgplayer\.com\/product\/\d+$/.test(card.source))
        || !mask || ![mask.x, mask.y, mask.width, mask.height].every(Number.isFinite)
        || mask.x < 0 || mask.y < 0 || mask.width <= 0 || mask.height <= 0
        || mask.x + mask.width > 1 || mask.y + mask.height > 1) {
        throw new Error("A card has invalid artwork, price, or printing metadata.");
    }
    if (minimumPriceCents >= 100 || card.imageReview) {
        const review = card.imageReview;
        const labels = {
            normal: "Normal (non-foil)", holofoil: "Holofoil",
            "reverse-holofoil": "Reverse holofoil",
            "1st-edition": "Normal (non-foil) / 1st Edition",
            "1st-edition-holofoil": "Holofoil / 1st Edition",
            unlimited: "Normal (non-foil) / Unlimited",
            "unlimited-holofoil": "Holofoil / Unlimited"
        };
        if (!review || review.cardId !== card.id || review.image !== card.image || review.variant !== card.variant
            || labels[review.priceKey] !== card.variant || !/^[a-f0-9]{64}$/.test(review.sha256)
            || !validDay(review.checkedOn) || review.checkedOn > snapshotDay) {
            throw new Error("The card image has not been reviewed against its exact priced edition and finish.");
        }
    }
    return card;
}

export function validateSchedule(data, today = utcDay()) {
    if (!validDay(today) || !data || data.game !== "card-chronicle" || !Array.isArray(data.puzzles)) {
        throw new Error("Invalid released puzzle schedule.");
    }
    const ids = new Set();
    const days = new Set();
    for (const item of data.puzzles) {
        if (!item || typeof item.id !== "string" || !item.id || ids.has(item.id)
            || !validDay(item.day) || item.day > today || days.has(item.day)) {
            throw new Error("The released schedule contains duplicate or invalid dates/IDs.");
        }
        ids.add(item.id);
        days.add(item.day);
    }
    return { game: data.game, puzzles: [...data.puzzles].sort((a, b) => b.day.localeCompare(a.day)) };
}

export function selectScheduledPuzzle(detail, day, today = utcDay()) {
    if (!validDay(day) || !validDay(today) || day > today || detail?.game !== "card-chronicle"
        || detail.day !== day || typeof detail.id !== "string" || !detail.id) {
        throw new Error("The selected puzzle is missing, unreleased, or invalid.");
    }
    validateCard(detail.card, day, 100);
    if (detail.card.year < 1999 || detail.card.year > Number(today.slice(0, 4))) {
        throw new Error("The printing year is outside the released English card range.");
    }
    return { id: detail.id, day, deck: day, card: detail.card, archive: day < today };
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
    const latestYear = Number(utcDay().slice(0, 4));
    if (!validGuess(guess) || guess.year < 1999 || guess.year > latestYear) {
        throw new Error(`Use an English printing year from 1999 to ${latestYear} and a price from $0 to $1,000,000.`);
    }
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
    for (const card of deck.cards) validateCard(card, deck.startsOn, data.minimumPriceCents ?? 1);
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

export function selectPublishedPuzzle(data, day, today = utcDay()) {
    if (!validDay(today) || !validDay(day) || day > today) {
        throw new Error("Choose a released puzzle date, not a future day.");
    }
    return { ...selectPuzzle(data, day), archive: day < today };
}

export function archiveDays(data, today = utcDay(), page = 0, pageSize = 10) {
    if (!Number.isInteger(page) || page < 0 || !Number.isInteger(pageSize) || pageSize < 1) {
        throw new Error("Invalid archive page.");
    }
    if (data?.puzzles) {
        const released = validateSchedule(data, today).puzzles.filter(item => item.day < today);
        return {
            days: released.slice(page * pageSize, (page + 1) * pageSize).map(item => item.day),
            count: released.length, pages: Math.ceil(released.length / pageSize)
        };
    }
    selectPublishedPuzzle(data, today, today);
    const count = Math.floor((Date.parse(today) - Date.parse(data.decks[0].startsOn)) / DAY_MS);
    const days = [];
    for (let offset = page * pageSize + 1; offset <= Math.min(count, (page + 1) * pageSize); offset++) {
        days.push(utcDay(new Date(Date.parse(today) - offset * DAY_MS)));
    }
    return { days, count, pages: Math.ceil(count / pageSize) };
}

export function puzzleIdentity(puzzle) {
    const original = `${puzzle.day}/${puzzle.deck}/${puzzle.card.id}/${puzzle.card.year}/${puzzle.card.priceCents}`;
    return puzzle.card.imageReview ? `${original}/${puzzle.card.imageReview.priceKey}/${puzzle.card.imageReview.sha256}` : original;
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
    const label = puzzle.archive ? "Card Chronicle Archive" : "Card Chronicle";
    const url = `https://bluefiregames.net/games/card-chronicle/${puzzle.archive ? `?day=${puzzle.day}` : ""}`;
    return `${label} ${puzzle.day}\n${result === "won" ? guesses.length : "X"}/${MAX_GUESSES}\nYear / Price\n${grid}\n${url}`;
}
