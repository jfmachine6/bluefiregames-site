import { utcDay, parseGuess, evaluateGuess, outcome, selectPuzzle, selectPracticePuzzle, puzzleIdentity, readProgress, shareText } from "../games/card-chronicle/game-core.js";

const results = [];
function test(name, run) {
    try {
        run();
        results.push(`PASS ${name}`);
    } catch (error) {
        console.error(name, error);
        results.push(`FAIL ${name}: ${error.message}`);
    }
}
function assert(condition) { if (!condition) throw new Error("Assertion failed"); }
function throws(run) {
    let rejected = false;
    try { run(); } catch { rejected = true; }
    assert(rejected);
}

try {
    const response = await fetch("../games/card-chronicle/cards.json");
    if (!response.ok) throw new Error(`Fixture request failed (${response.status})`);
    const data = await response.json();
    const puzzle = selectPuzzle(data, "2026-11-07");
    const card = puzzle.card;
    const guess = (year, priceCents) => ({ year, priceCents });
    const miss = guess(2005, 100);
    const win = guess(card.year, card.priceCents);
    test("UTC date across local time zones", () => assert(utcDay(new Date("2026-11-07T23:30:00-05:00")) === "2026-11-08"));
    test("Everyone gets the same daily card", () => assert(selectPuzzle(data, "2026-11-07").card.id === card.id));
    test("Next UTC day changes card", () => assert(selectPuzzle(data, "2026-11-08").card.id !== card.id));
    test("Every test card is selectable independently of the daily answer", () => {
        data.decks[0].cards.forEach((card, index) => {
            const practice = selectPracticePuzzle(data, "2026-11-07", index);
            assert(practice.practice && practice.card.id === card.id);
        });
        assert(selectPuzzle(data, "2026-11-07").card.id === card.id);
    });
    test("Invalid test-card indexes rejected", () => {
        for (const index of [-1, 4, 0.5, NaN]) throws(() => selectPracticePuzzle(data, "2026-11-07", index));
    });
    test("Practice results cannot be shared as daily results", () => {
        const practice = selectPracticePuzzle(data, "2026-11-07", 0);
        throws(() => shareText(practice, [win]));
    });
    test("Missing or out-of-bounds year masks rejected", () => {
        const broken = structuredClone(data);
        delete broken.decks[0].cards[0].yearMask;
        throws(() => selectPuzzle(broken, "2026-11-07"));
        broken.decks[0].cards[0].yearMask = { x: 0.8, y: 0.95, width: 0.5, height: 0.1 };
        throws(() => selectPuzzle(broken, "2026-11-07"));
    });
    test("Starter deck cycles deterministically", () => assert(selectPuzzle(data, "2026-11-11").card.id === card.id));
    test("Invalid calendar date rejected", () => throws(() => selectPuzzle(data, "2026-02-30")));
    test("Prelaunch date rejected", () => throws(() => selectPuzzle(data, "2026-11-06")));
    test("Empty deck rejected", () => throws(() => selectPuzzle({ decks: [{ startsOn: "2026-11-07", cards: [] }] }, "2026-11-07")));
    test("Invalid prices rejected", () => {
        const broken = structuredClone(data);
        broken.decks[0].cards[0].priceCents = -1;
        throws(() => selectPuzzle(broken, "2026-11-07"));
    });
    test("Later deck does not change old answers", () => {
        const extended = structuredClone(data);
        extended.decks.push({ startsOn: "2026-12-01", cards: [data.decks[0].cards[1]] });
        assert(puzzleIdentity(selectPuzzle(extended, "2026-11-07")) === puzzleIdentity(puzzle));
        assert(selectPuzzle(extended, "2026-12-01").card.id === data.decks[0].cards[1].id);
    });
    test("Exact USD decimal conversion", () => assert(parseGuess("1999", "10.56").priceCents === 1056));
    test("Whole dollar and zero accepted", () => assert(parseGuess("1999", "0").priceCents === 0 && parseGuess("1999", "5").priceCents === 500));
    test("Fractional cents, blank, exponent, negative and out-of-range rejected", () => {
        for (const price of ["", "1.234", "1e2", "-1", "1000000.01", "NaN"]) throws(() => parseGuess("1999", price));
        throws(() => parseGuess("1999.5", "1"));
        throws(() => parseGuess("1995", "1"));
    });
    test("Higher/lower clues point toward the answer", () => {
        const hints = evaluateGuess(miss, card);
        assert(hints.year === "lower" && hints.price === "higher" && !hints.won);
    });
    test("Exact year and price win", () => assert(evaluateGuess(win, card).won));
    test("Price alone does not win", () => assert(!evaluateGuess(guess(2005, card.priceCents), card).won));
    test("$0.25 tolerance inclusive on both sides", () => {
        const cheap = { year: 2007, priceCents: 52 };
        assert(evaluateGuess(guess(2007, 27), cheap).won);
        assert(evaluateGuess(guess(2007, 77), cheap).won);
        assert(!evaluateGuess(guess(2007, 26), cheap).won);
        assert(!evaluateGuess(guess(2007, 78), cheap).won);
    });
    test("10% tolerance inclusive on both sides", () => {
        const target = { year: 2000, priceCents: 1000 };
        for (const cents of [900, 1100]) assert(evaluateGuess(guess(2000, cents), target).won);
        for (const cents of [899, 1101]) assert(!evaluateGuess(guess(2000, cents), target).won);
    });
    test("Non-integer cent tolerance does not round up", () => {
        assert(evaluateGuess(guess(card.year, 951), card).won);
        assert(!evaluateGuess(guess(card.year, 950), card).won);
    });
    test("Six misses lose; sixth-attempt success wins", () => {
        assert(outcome(Array(5).fill(miss), card) === "playing");
        assert(outcome(Array(6).fill(miss), card) === "lost");
        assert(outcome([...Array(5).fill(miss), win], card) === "won");
    });
    test("Saved progress round-trip and empty progress", () => {
        assert(readProgress(null, puzzle).length === 0);
        assert(readProgress(JSON.stringify({ identity: puzzleIdentity(puzzle), guesses: [miss] }), puzzle).length === 1);
    });
    test("Corrupt, mismatched, excessive and post-win progress rejected", () => {
        throws(() => readProgress("{", puzzle));
        throws(() => readProgress(JSON.stringify({ identity: "other", guesses: [] }), puzzle));
        for (const guesses of [Array(7).fill(miss), [win, miss], [{ year: 2000, priceCents: -1 }]]) {
            throws(() => readProgress(JSON.stringify({ identity: puzzleIdentity(puzzle), guesses }), puzzle));
        }
    });
    test("Winning share is spoiler-free with expected grid", () => {
        const text = shareText(puzzle, [miss, win]);
        assert(text.includes("2/6") && text.includes(puzzle.day));
        assert(text.split("\n").length === 6 && !text.includes(card.name) && !text.includes("10.56"));
    });
    test("Loss share and unfinished share rejection", () => {
        assert(shareText(puzzle, Array(6).fill(miss)).includes("X/6"));
        throws(() => shareText(puzzle, [miss]));
    });
} catch (error) {
    console.error("Test setup failed", error);
    results.push(`FAIL setup: ${error.message}`);
}
const failed = results.filter(result => result.startsWith("FAIL")).length;
document.getElementById("results").textContent = `${results.length - failed} passed, ${failed} failed\n\n${results.join("\n")}`;
document.title = failed ? "FAIL Card Chronicle tests" : "PASS Card Chronicle tests";
