# bluefiregames-site
Website linked to bluefiregames.net.

## Games

[Games hub](./games/index.html) links to browser games and reserves a studio
showcase for BlueFire Syndicate's BlueFire Games titles. Studio listings are not
invented or automatically inferred from the broader project portfolio.

[Card Chronicle](./games/card-chronicle/index.html) is a static, client-side daily
Pokemon card guessing game. Six attempts, exact English printing year, and a
non-foil USD market price within 10% or $0.25, whichever is larger. Both answers
must match in one attempt. Days reset at midnight UTC; progress is stored per
day in localStorage. Storage failures are reported and allow in-tab play.
The full card is displayed with a per-printing blur over the bottom copyright-year
line; the blur lifts after a win or loss. Browsers without backdrop-filter support
use an opaque cover for that region instead.

Choose **Practice / test cards** to select any of the active starter cards.
**Next test card** cycles through them; **Restart card** gives six fresh guesses
on the same card. Practice attempts are in-tab only, do not write to daily
localStorage, and cannot be shared as daily results. **Daily challenge** restores
the day's saved progress (or the in-tab snapshot when storage is unavailable).

The starter beta rotates four verified cards. Prices in
[cards.json](./games/card-chronicle/cards.json) were retrieved from the public
Pokemon TCG API on November 7, 2026; the API's TCGplayer update date is
October 15, 2026. Only `normal.market` (or explicitly labeled non-foil
`unlimited.market`) prices are used. Missing prices must not be invented or
replaced with foil prices. These are frozen reference snapshots, not live quotes.
The unreliable API is not called during gameplay. Artwork stays externally hosted;
image errors disable guessing and provide a retry without consuming attempts.

To expand the collection, append a new deck with a future `startsOn` UTC date,
in ascending date order. Verify each card's release year, edition, market price,
source update date, and normalized `yearMask` rectangle. Never change an existing deck's
order, length, or price: doing so changes historical daily answers. New decks
take effect at midnight on their start date. Validate the year blur visually for
each printing; the name and other card text intentionally remain visible as clues. This static casual
game is not cheat-proof: answers and original image URLs are inspectable in
browser developer tools.

Serve this directory with the existing local preview script, then visit
`/tests/card-chronicle.html` for dependency-free browser core tests. Also check the
game at mobile and desktop sizes, guess persistence after reload, both win/loss
paths, clipboard fallback, blocked image/data requests, and UTC midnight rollover.
Also check practice selection, cycling, restart, year-blur reveal, and isolation
from daily progress, including switching modes with storage blocked.
