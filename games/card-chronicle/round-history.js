// Version: v0.2.4.0.0
import { selectPuzzle, puzzleIdentity, readProgress, outcome } from "./game-core.js";

export const ROUND_PREFIX = "bluefire-card-chronicle-round:";

export function createRoundRecord(puzzle, guesses, id, completedAt = new Date().toISOString()) {
    const record = {
        version: 1, id, completedAt, day: puzzle.day, deck: puzzle.deck,
        card: structuredClone(puzzle.card), identity: puzzleIdentity(puzzle),
        guesses: guesses.map(guess => ({ ...guess }))
    };
    return readRoundRecord(JSON.stringify(record));
}

export function readRoundRecord(raw) {
    const record = JSON.parse(raw);
    if (!record || record.version !== 1 || typeof record.id !== "string"
        || !/^[a-zA-Z0-9-]{1,80}$/.test(record.id) || typeof record.completedAt !== "string"
        || !Number.isFinite(Date.parse(record.completedAt))
        || new Date(record.completedAt).toISOString() !== record.completedAt) {
        throw new Error("Invalid saved practice round.");
    }
    const puzzle = selectPuzzle({ decks: [{ startsOn: record.deck, cards: [record.card] }] }, record.day);
    const guesses = readProgress(JSON.stringify(record), puzzle);
    if (outcome(guesses, puzzle.card) === "playing") throw new Error("Only completed practice rounds can enter history.");
    return record;
}

export function readRoundHistory(storage) {
    const records = [];
    const errors = [];
    for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index);
        if (!key?.startsWith(ROUND_PREFIX)) continue;
        try {
            const record = readRoundRecord(storage.getItem(key));
            if (key !== ROUND_PREFIX + record.id) throw new Error("Practice round key does not match its record.");
            records.push(record);
        } catch (error) {
            console.error("Card Chronicle history could not read a practice round.", key, error);
            errors.push(key);
        }
    }
    records.sort((a, b) => b.completedAt.localeCompare(a.completedAt) || b.id.localeCompare(a.id));
    return { records, errors };
}
