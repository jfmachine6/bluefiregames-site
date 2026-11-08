// Version: v0.2.4.1.1
import { utcDay, parseGuess, evaluateGuess, outcome, selectPuzzle, selectPublishedPuzzle, archiveDays, selectPracticePuzzle, puzzleIdentity, readProgress, shareText, validateSchedule, selectScheduledPuzzle } from "../games/card-chronicle/game-core.js";
import { fetchSchedule, fetchScheduledPuzzle } from "../games/card-chronicle/puzzle-source.js";
import { ROUND_PREFIX, createRoundRecord, readRoundRecord, readRoundHistory } from "../games/card-chronicle/round-history.js";

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
    const response = await fetch("./fixtures/card-chronicle-starter.json");
    if (!response.ok) throw new Error(`Fixture request failed (${response.status})`);
    const data = await response.json();
    const puzzle = selectPuzzle(data, "2026-11-07");
    const card = puzzle.card;
    const reviewedCard = { ...card, imageReview: {
        cardId: card.id, image: card.image, variant: card.variant, priceKey: "normal",
        sha256: "0".repeat(64), checkedOn: "2026-11-07"
    } };
    const guess = (year, priceCents) => ({ year, priceCents });
    const miss = guess(2005, 100);
    const win = guess(card.year, card.priceCents);
    const schedule = { game: "card-chronicle", puzzles: [
        { id: "first", day: "2026-11-07" }, { id: "third", day: "2026-11-09" }
    ] };
    test("Scheduled archive lists released dates only and supports gaps", () => {
        const list = archiveDays(schedule, "2026-11-10");
        assert(list.days.join(",") === "2026-11-09,2026-11-07" && list.count === 2);
        assert(archiveDays({ game: "card-chronicle", puzzles: [] }, "2026-11-10").count === 0);
    });
    test("Schedule rejects duplicate IDs/dates, impossible dates and future rows", () => {
        for (const puzzles of [
            [schedule.puzzles[0], schedule.puzzles[0]], [{ id: "bad", day: "2026-02-30" }],
            [{ id: "future", day: "2026-11-11" }], [{ id: "", day: "2026-11-07" }]
        ]) throws(() => validateSchedule({ game: "card-chronicle", puzzles }, "2026-11-10"));
    });
    test("Scheduled detail verifies game/date and enforces the $1 English pool", () => {
        const detail = { game: "card-chronicle", day: "2026-11-07", id: "first", card: reviewedCard };
        assert(selectScheduledPuzzle(detail, detail.day, "2026-11-10").archive);
        for (const broken of [
            { ...detail, game: "other" }, { ...detail, day: "2026-11-08" },
            { ...detail, card: { ...card, priceCents: 99 } }, { ...detail, card: { ...card, year: 1998 } },
            { ...detail, card: { ...card, year: 2027 } }
        ]) throws(() => selectScheduledPuzzle(broken, "2026-11-07", "2026-11-10"));
    });
    const practiceResponse = await fetch("../games/card-chronicle/cards.json");
    if (!practiceResponse.ok) throw new Error("Practice collection failed to load.");
    const practiceData = await practiceResponse.json();
    const practiceCards = practiceData.decks[0].cards;
    test("Twenty practice cards meet the minimum and retain broad price coverage", () => {
        assert(practiceCards.length === 20 && practiceData.minimumPriceCents === 100);
        const floors = [100, 500, 2000, 7500, 25000];
        floors.forEach((floor, band) => assert(practiceCards.filter(card =>
            card.priceCents >= floor && (band === 4 || card.priceCents < floors[band + 1])).length === [4, 4, 4, 3, 5][band]));
        practiceCards.forEach((card, index) => assert(selectPracticePuzzle(practiceData, "2026-11-07", index).card.id === card.id));
    });
    test("Practice has no repeated species and includes verified 2026 cards", () => {
        const species = practiceCards.flatMap(card => card.species);
        assert(new Set(species).size === species.length);
        assert(practiceCards.some(card => card.year === 2026) && new Set(practiceCards.map(card => card.year)).size >= 12);
    });
    test("New image/source URLs survive completed round history validation", () => {
        const practice = selectPracticePuzzle(practiceData, "2026-11-07", 0);
        const record = createRoundRecord(practice, [guess(practice.card.year, practice.card.priceCents)], "new-source", "2026-11-07T22:00:00.000Z");
        assert(readRoundRecord(JSON.stringify(record)).card.id === practice.card.id);
    });
    async function testAsync(name, run) {
        try { await run(); results.push(`PASS ${name}`); }
        catch (error) { console.error(name, error); results.push(`FAIL ${name}: ${error.message}`); }
    }
    await testAsync("Source fetch validates index and detail without caching", async () => {
        const request = async (url, options) => {
            assert(options.cache === "no-store" && options.signal instanceof AbortSignal);
            return new Response(JSON.stringify(url.endsWith("puzzles") ? schedule
                : { game: "card-chronicle", day: "2026-11-07", id: "first", card: reviewedCard }));
        };
        const loaded = await fetchSchedule(request, "2026-11-10");
        assert((await fetchScheduledPuzzle(loaded, "2026-11-07", request, "2026-11-10")).card.id === card.id);
    });
    await testAsync("Source errors, schedule gaps and mismatched detail IDs reject explicitly", async () => {
        for (const run of [
            () => fetchSchedule(async () => new Response("Unavailable", { status: 503 }), "2026-11-10"),
            () => fetchSchedule(async () => { throw new Error("Offline"); }, "2026-11-10"),
            () => fetchScheduledPuzzle(schedule, "2026-11-08", () => { throw new Error("Must not fetch"); }, "2026-11-10"),
            () => fetchScheduledPuzzle(schedule, "2026-11-07", async () => new Response(JSON.stringify({
                game: "card-chronicle", id: "changed", day: "2026-11-07", card: reviewedCard
            })), "2026-11-10")
        ]) {
            let rejected = false;
            try { await run(); } catch { rejected = true; }
            assert(rejected);
        }
    });
    test("Image review must match the pictured card, URL, edition and finish", () => {
        const detail = { game: "card-chronicle", day: "2026-11-07", id: "first", card: reviewedCard };
        for (const change of [
            { cardId: "other" }, { image: "https://images.pokemontcg.io/base1/4.png" },
            { variant: "Normal (non-foil) / Unlimited" }, { priceKey: "1st-edition" },
            { sha256: "" }, { checkedOn: "2026-11-08" }
        ]) throws(() => selectScheduledPuzzle({
            ...detail, card: { ...reviewedCard, imageReview: { ...reviewedCard.imageReview, ...change } }
        }, detail.day, "2026-11-07"));
        throws(() => selectScheduledPuzzle({ ...detail, card }, detail.day, "2026-11-07"));
    });
    test("Reviewed edition changes have independent saved identities even at the same price", () => {
        const first = { ...puzzle, card: reviewedCard };
        const second = { ...first, card: { ...reviewedCard, imageReview: {
            ...reviewedCard.imageReview, priceKey: "1st-edition", sha256: "1".repeat(64)
        } } };
        assert(puzzleIdentity(first) !== puzzleIdentity(second));
        throws(() => readProgress(JSON.stringify({ identity: puzzleIdentity(first), guesses: [] }), second));
    });
    test("UTC date across local time zones", () => assert(utcDay(new Date("2026-11-07T23:30:00-05:00")) === "2026-11-08"));
    test("Everyone gets the same daily card", () => assert(selectPuzzle(data, "2026-11-07").card.id === card.id));
    test("Next UTC day changes card", () => assert(selectPuzzle(data, "2026-11-08").card.id !== card.id));
    test("Only released dates are playable; today is not marked archive", () => {
        assert(selectPublishedPuzzle(data, "2026-11-07", "2026-11-08").archive);
        assert(!selectPublishedPuzzle(data, "2026-11-08", "2026-11-08").archive);
        for (const day of ["2026-11-09", "2026-02-30", "2026-11-06"]) {
            throws(() => selectPublishedPuzzle(data, day, "2026-11-08"));
        }
    });
    test("Launch day has no archive yet", () => assert(archiveDays(data, "2026-11-07").count === 0));
    test("Archive pages are newest-first, exclude today, and include launch", () => {
        const first = archiveDays(data, "2026-11-19");
        const second = archiveDays(data, "2026-11-19", 1);
        assert(first.count === 12 && first.pages === 2 && first.days.length === 10);
        assert(first.days[0] === "2026-11-18" && second.days.join(",") === "2026-11-08,2026-11-07");
        assert(archiveDays(data, "2026-11-19", 2).days.length === 0);
        throws(() => archiveDays(data, "2026-11-19", -1));
        throws(() => archiveDays(data, "2026-11-19", 0, 0));
    });
    test("Archive share labels and links preserve the puzzle date", () => {
        const archived = selectPublishedPuzzle(data, "2026-11-07", "2026-11-08");
        const text = shareText(archived, [win]);
        assert(text.startsWith("Card Chronicle Archive 2026-11-07"));
        assert(text.endsWith("?day=2026-11-07") && !text.includes(card.name));
    });
    test("Archived dates use original deck and price after a new deck starts", () => {
        const expanded = structuredClone(data);
        const changed = structuredClone(card);
        changed.priceCents = 2000;
        expanded.decks.push({ startsOn: "2026-11-20", cards: [changed] });
        assert(selectPublishedPuzzle(expanded, "2026-11-07", "2026-11-21").card.priceCents === 1056);
        assert(selectPublishedPuzzle(expanded, "2026-11-20", "2026-11-21").card.priceCents === 2000);
    });
    test("A repeated card on different dates has independent progress identity", () => {
        const repeated = selectPuzzle(data, "2026-11-11");
        assert(repeated.card.id === puzzle.card.id && puzzleIdentity(repeated) !== puzzleIdentity(puzzle));
        throws(() => readProgress(JSON.stringify({ identity: puzzleIdentity(puzzle), guesses: [miss] }), repeated));
    });
    const completedAt = "2026-11-07T20:00:00.000Z";
    test("Completed practice record captures immutable guesses and price snapshot", () => {
        const practice = structuredClone(selectPracticePuzzle(data, "2026-11-07", 0));
        const attempts = [miss, win].map(guess => ({ ...guess }));
        const record = createRoundRecord(practice, attempts, "test-round-1", completedAt);
        practice.card.priceCents = 9000;
        attempts[0].year = 2000;
        assert(record.card.priceCents === 1056 && record.guesses[0].year === 2005);
        assert(readRoundRecord(JSON.stringify(record)).completedAt === completedAt);
    });
    test("Unfinished practice cannot be stored as a completed round", () => {
        throws(() => createRoundRecord(puzzle, [miss], "unfinished", completedAt));
        throws(() => createRoundRecord(puzzle, [], "empty", completedAt));
    });
    test("Losing practice rounds retain all six guesses", () => {
        const record = createRoundRecord(puzzle, Array(6).fill(miss), "loss", completedAt);
        assert(outcome(record.guesses, record.card) === "lost");
    });
    test("Invalid round IDs, timestamps and corrupted records rejected", () => {
        throws(() => createRoundRecord(puzzle, [win], "../bad", completedAt));
        throws(() => createRoundRecord(puzzle, [win], "bad-time", "not a date"));
        throws(() => readRoundRecord("{"));
        const record = createRoundRecord(puzzle, [win], "bad-price", completedAt);
        record.card.priceCents = -1;
        throws(() => readRoundRecord(JSON.stringify(record)));
    });
    test("History ignores daily storage, retains repeated rounds and sorts newest first", () => {
        const entries = new Map([
            ["bluefire-card-chronicle:2026-11-07", "not a practice record"],
            [ROUND_PREFIX + "one", JSON.stringify(createRoundRecord(puzzle, [win], "one", completedAt))],
            [ROUND_PREFIX + "two", JSON.stringify(createRoundRecord(puzzle, [win], "two", "2026-11-07T21:00:00.000Z"))]
        ]);
        const storage = { length: entries.size, key: index => [...entries.keys()][index], getItem: key => entries.get(key) };
        const history = readRoundHistory(storage);
        assert(history.errors.length === 0 && history.records.length === 2 && history.records[0].id === "two");
    });
    test("Corrupt history entries are reported without hiding valid rounds", () => {
        const entries = new Map([
            [ROUND_PREFIX + "valid", JSON.stringify(createRoundRecord(puzzle, [win], "valid", completedAt))],
            [ROUND_PREFIX + "broken", "{"]
        ]);
        const storage = { length: entries.size, key: index => [...entries.keys()][index], getItem: key => entries.get(key) };
        const history = readRoundHistory(storage);
        assert(history.records.length === 1 && history.errors.length === 1);
    });
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
        throws(() => parseGuess("1998", "1"));
        throws(() => parseGuess(String(Number(utcDay().slice(0, 4)) + 1), "1"));
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
