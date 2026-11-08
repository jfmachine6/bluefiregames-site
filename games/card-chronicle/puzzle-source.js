// Version: v0.2.4.0.0
import { utcDay, validateSchedule, selectScheduledPuzzle } from "./game-core.js";

const API = "https://bluefire-notion.jfedders6.workers.dev/daily-games/card-chronicle/puzzles";

export async function fetchPuzzleJson(url, request = fetch) {
    const response = await request(url, { cache: "no-store", signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Puzzle request failed (${response.status}).`);
    return response.json();
}

export async function fetchSchedule(request = fetch, today = utcDay()) {
    return validateSchedule(await fetchPuzzleJson(API, request), today);
}

export async function fetchScheduledPuzzle(schedule, day, request = fetch, today = utcDay()) {
    const item = validateSchedule(schedule, today).puzzles.find(item => item.day === day);
    if (!item) throw new Error("No released puzzle is scheduled for that date. Try practice or another archive day.");
    const puzzle = selectScheduledPuzzle(await fetchPuzzleJson(`${API}/${day}`, request), day, today);
    if (puzzle.id !== item.id) throw new Error("The puzzle no longer matches its schedule. Reload the schedule and retry.");
    return puzzle;
}
