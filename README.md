# bluefiregames-site
<!-- Version: v0.2.4.1.0 -->
Website linked to bluefiregames.net.

## Games

[Games hub](./games/index.html) links to browser games and reserves a studio
showcase for BlueFire Syndicate's BlueFire Games titles. Studio listings are not
invented or automatically inferred from the broader project portfolio.

[Card Chronicle](./games/card-chronicle/index.html) is a client-side daily
Pokemon card guessing game. Six attempts, exact English printing year, and a
variant-specific ungraded USD market price within 10% or $0.25, whichever is larger. Both answers
must match in one attempt. Days reset at midnight UTC; progress is stored per
day in localStorage. Storage failures are reported and allow in-tab play.
The full card is displayed with a per-printing blur over the bottom copyright-year
line; the blur lifts after a win or loss. Browsers without backdrop-filter support
use an opaque cover for that region instead.

Choose **Practice (20)** to select any of the twenty public practice cards.
**Next test card** cycles through them; **Restart card** gives six fresh guesses
on the same card. Unfinished practice attempts are in-tab only. Completed practice
rounds now save separately with the original card/price, guesses and completion
timestamp. They do not write to daily localStorage and cannot be shared as daily results. **Daily** restores
the day's saved progress (or the in-tab snapshot when storage is unavailable).

The curated beta replaces the four-card starter rotation with today's puzzle
plus fifty upcoming dates (November 7-December 27, 2026) in Notion. Every English
release year from 1999 through 2026 is represented. The twenty practice cards in
[cards.json](./games/card-chronicle/cards.json) are separate from upcoming answers.
There are no repeated Pokemon species across either pool, including multi-Pokemon
cards. Market snapshots are at least $1; the minimum is stated on the game page.

Both pools balance five price bands: $1-5, $5-20, $20-75, $75-250, and $250+.
Upper limits are exclusive. After correcting prices to the exact pictured
edition/finish, the daily pool has 8/12/9/10/12 cards respectively;
practice has 4/4/4/3/5. This intentionally overrepresents valuable cards
compared with packs or bulk. Verified values range from $1.01 to $4,619.79.

Metadata, English set release dates, images and variant-specific TCGplayer
`marketPrice` snapshots come from [TCGdex](https://tcgdex.dev/), retrieved November
7, 2026. Normal and holofoil variants are included; reverse-holofoil variants
are eligible. The priced variant is shown before guessing. First-edition scans
use first-edition prices; holo/non-foil/parallel finishes are not interchangeable.
No shadowless, graded, missing, or fractional-cent price substitution is allowed.
Every active image was visually reviewed for identity, set/number, edition stamp
and finish. Its review pins the exact image URL, SHA-256, card ID, pricing key,
edition label and review date. Imports reject unreviewed or changed image bytes;
Worker/frontend reject inconsistent review metadata. Generic scans are never
priced as a different edition under a warning.
Snapshots include source update dates, numeric TCGplayer product links, and
metadata provenance. These are frozen game references, not live quotes.
Artwork stays externally hosted;
image errors disable guessing and provide a retry without consuming attempts.

Add new dated rows in Notion to expand the daily schedule; preserve released rows.
Validate each copyright-line mask visually: e-reader, older, full-art and modern
layouts place their copyright lines differently. The card and guess inputs sit
side by side on mobile, with attempt history below. During input focus the nav
stops sticking, and the play area aligns with the visible viewport so the card
isn't hidden behind the keyboard. Native zoom remains available.
This casual game is not cheat-proof: released answers, practice answers and
original image URLs remain inspectable.

Serve this directory with the existing local preview script, then visit
`/tests/card-chronicle.html` for dependency-free browser core tests. Also check the
game at mobile and desktop sizes, guess persistence after reload, both win/loss
paths, clipboard fallback, blocked image/data requests, and UTC midnight rollover.
Also check practice selection, cycling, restart, year-blur reveal, and isolation
from daily progress, including switching modes with storage blocked.

### Archive and player history

**Archive** lists scheduled, released past daily puzzles, newest first in pages of ten,
with Not played / In progress / Won / Lost status. Choose a date or a listed day
to play or review it. Today is available via **Daily**; future dates
are rejected. Links with `?day=YYYY-MM-DD` open a released date directly. Archive
results are labeled as archive results when shared.

Daily and archived progress now use
`bluefire-card-chronicle-v2:YYYY-MM-DD`. The user explicitly authorized replacing
the beta schedule, so old daily saves are left untouched under the original
namespace and do not count toward new puzzles. Each date has its own six attempts.
Completed dates show the historical card, year, edition, price and source update
date; unanswered dates hide answers. Reopening a completed daily/archive puzzle
reviews its result rather than granting new attempts. Use practice to replay.

Completed practice rounds use separate keys
`bluefire-card-chronicle-round:<UUID>`. Records store an independent card/price
snapshot, guesses and UTC completion timestamp. History keeps every recorded
round (no automatic trimming), displays ten per page, and reports corrupt records
or storage failures explicitly. Failed writes remain in the current tab with a
retry button; closing the tab can lose those unsaved records. Switching dates
preserves unsaved daily attempts in-tab as well. Practice rounds played before
this feature were never persisted and cannot be recovered.

There is no backend player database, login, or cross-device sync. Clearing site
data, private browsing, quota limits, or changing browser/origin can remove or
separate history. Future Google sign-in would need authenticated server-side
storage and an explicit local-history migration; it is not implemented here.

### Card catalogue and upcoming schedule

Daily/archive data comes from the Notion-backed Worker at
`https://bluefire-notion.jfedders6.workers.dev/daily-games/card-chronicle/puzzles`.
Its index returns only released dates/IDs; date detail returns one card snapshot.
The browser never receives the Notion credential or queries Notion directly.
Future/draft rows stay server-side, date gaps are supported, and no endless
static rotation or silent fallback fills unscheduled dates.

Practice uses only the public [cards.json](./games/card-chronicle/cards.json).
Practice remains playable if the daily service is unavailable, with explicit
load errors and retry controls. Neither source uses live market pricing at play time.
Deploy Worker **v0.2.4.5.1** or newer to accept TCGdex image URLs, TCGplayer product
URLs and validate the exact image/price review before publishing this frontend.

The outer development repository holds the generated daily manifest and
source-verified setup/import/validation tools. It is not served by this website.
Notion is the production schedule; released rows must not be edited or deleted.
There is no immutable snapshot store, public admin API, automated recurring
import, or player-account backend.
