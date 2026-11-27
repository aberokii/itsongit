# @itsongit experiments (2026-11-27)

Reels ≥48 h old: 133 (65 baseline before 2026-11-01, 68 in the test).

## Format test: Does the animated story format (Kit the cat, beats, whip pans) beat the classic ad template?

| format | n | median views | median skip % | median watch s | shares+saves /100 views |
|---|---|---|---|---|---|
| classic | 29 | 136 | 69.9 | 5.4 | 2.1 |
| story | 30 | 153.0 | 58.9 | 6.6 | 2.0 |

**Verdict: classic wins** (median views classic 136 vs story 153.0, skip 69.9 vs 58.9). story wins if its median views beat classic by 30%+ with no worse skip rate: then it becomes 2 of 3 daily reels (and 3 of 3 if it wins again over the next 12). Classic wins if story isn't ahead after 12 each.

## Hook test: Does showing the app in action on frame 0 cut the 3-second skip rate?

| hook | n | median views | median skip % | median watch s | shares+saves /100 views |
|---|---|---|---|---|---|
| price | 16 | 142.0 | 71.6 | 5.5 | 2.0 |
| demo | 15 | 129 | 65.9 | 5.6 | 2.0 |

Within-day (B − A), 8 days: skip -3.0 pts, views -109. B had the lower skip rate on 4 of 8 days.
Median skip difference B − A: 95% interval -14.3 to +2.7 pts (negative = B better).
**Verdict: A (price) wins** (skip A 71.6 vs B 65.9, views A 142.0 vs B 129). Make it the default in make.py and plan.py.

## Topic test: Which kind of 'everyone pays for this' pick travels furthest?

| topic | n | median views | median skip % | median watch s | shares+saves /100 views |
|---|---|---|---|---|---|
| subscription | 22 | 130.5 | 68.1 | 5.3 | 1.4 |
| utility | 23 | 177 | 59.6 | 6.7 | 2.2 |
| hobby | 23 | 148 | 63.5 | 6.0 | 2.1 |

**Verdict: utility leads.** After 10 per arm, give the best arm 2 of the 3 daily reels; keep 1 rotating so the others keep being measured.

## Posting window (test period)

| window | n | median views | median skip % | median watch s | shares+saves /100 views |
|---|---|---|---|---|---|
| midday | 14 | 154.5 | 59.4 | 5.6 | 2.7 |
| evening | 23 | 136 | 66.4 | 5.9 | 2.0 |
| night | 23 | 148 | 63.6 | 6.3 | 1.7 |

## Top 5 overall

- 089-lmms: 1379 views, skip 49%, 9.2s watch, hook story, hobby
- 110-scrcpy: 1318 views, skip 51.4%, 9.8s watch, hook story, utility
- 062-mixxx: 1130 views, skip 63.9%, 10.2s watch, hook price, hobby
- 076-powertoys: 1010 views, skip 52.5%, 10.1s watch, hook story, utility
- 113-luanti: 896 views, skip 42.7%, 11.1s watch, hook price, hobby
