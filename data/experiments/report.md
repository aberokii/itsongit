# @itsongit experiments (2026-11-28)

Reels ≥48 h old: 136 (65 baseline before 2026-11-01, 71 in the test).

## Format test: Does the animated story format (Kit the cat, beats, whip pans) beat the classic ad template?

| format | n | median views | median skip % | median watch s | shares+saves /100 views |
|---|---|---|---|---|---|
| classic | 30 | 139.0 | 70.6 | 5.5 | 2.0 |
| story | 32 | 153.0 | 58.7 | 6.6 | 2.0 |

**Verdict: classic wins** (median views classic 139.0 vs story 153.0, skip 70.6 vs 58.7). story wins if its median views beat classic by 30%+ with no worse skip rate: then it becomes 2 of 3 daily reels (and 3 of 3 if it wins again over the next 12). Classic wins if story isn't ahead after 12 each.

## Hook test: Does showing the app in action on frame 0 cut the 3-second skip rate?

| hook | n | median views | median skip % | median watch s | shares+saves /100 views |
|---|---|---|---|---|---|
| price | 16 | 142.0 | 71.6 | 5.5 | 2.0 |
| demo | 16 | 135.5 | 66.6 | 5.7 | 1.7 |

Within-day (B − A), 8 days: skip -2.9 pts, views -109. B had the lower skip rate on 4 of 8 days.
Median skip difference B − A: 95% interval -12.8 to +3.0 pts (negative = B better).
**Verdict: A (price) wins** (skip A 71.6 vs B 66.6, views A 142.0 vs B 135.5). Make it the default in make.py and plan.py.

## Topic test: Which kind of 'everyone pays for this' pick travels furthest?

| topic | n | median views | median skip % | median watch s | shares+saves /100 views |
|---|---|---|---|---|---|
| subscription | 23 | 131 | 67.1 | 5.4 | 1.5 |
| utility | 24 | 173.0 | 59.8 | 6.6 | 2.2 |
| hobby | 24 | 151.0 | 61.1 | 6.1 | 2.0 |

**Verdict: utility leads.** After 10 per arm, give the best arm 2 of the 3 daily reels; keep 1 rotating so the others keep being measured.

## Posting window (test period)

| window | n | median views | median skip % | median watch s | shares+saves /100 views |
|---|---|---|---|---|---|
| midday | 15 | 149 | 59.1 | 5.6 | 2.7 |
| evening | 24 | 139.0 | 66.6 | 6.0 | 1.8 |
| night | 24 | 151.0 | 62.8 | 6.6 | 1.8 |

## Top 5 overall

- 089-lmms: 1382 views, skip 48.9%, 9.2s watch, hook story, hobby
- 110-scrcpy: 1319 views, skip 51.3%, 9.8s watch, hook story, utility
- 062-mixxx: 1134 views, skip 63.9%, 10.2s watch, hook price, hobby
- 076-powertoys: 1010 views, skip 52.5%, 10.1s watch, hook story, utility
- 113-luanti: 898 views, skip 42.7%, 11.1s watch, hook price, hobby
