# @itsongit experiments (2026-10-31)

Reels ≥48 h old: 55 (55 baseline before 2026-11-01, 0 in the test).

## Hook test: Does showing the app in action on frame 0 cut the 3-second skip rate?

| hook | n | median views | median skip % | median watch s | shares+saves /100 views |
|---|---|---|---|---|---|

**Verdict: keep testing** (0 A / 0 B; decide at 15 each). Rule: B wins if its median skip rate is at least 5 points lower than A's AND its median views are not lower. A wins if B is not better after 15 per arm. Then make the winner the default and test the next hook idea against it.

## Topic test: Which kind of 'everyone pays for this' pick travels furthest?

| topic | n | median views | median skip % | median watch s | shares+saves /100 views |
|---|---|---|---|---|---|

**Verdict: keep testing** ({'subscription': 0, 'utility': 0, 'hobby': 0}; decide at 10 each). Rule: After 10 per arm, give the best arm 2 of the 3 daily reels; keep 1 rotating so the others keep being measured.

## Posting window (test period)

| window | n | median views | median skip % | median watch s | shares+saves /100 views |
|---|---|---|---|---|---|

## Baseline (before the test, all hook A)

| topic | n | median views | median skip % | median watch s | shares+saves /100 views |
|---|---|---|---|---|---|
| subscription | 22 | 33.5 | 77.2 | 4.35 | 0.0 |
| utility | 18 | 84.5 | 71.45 | 4.9 | 0.15 |
| hobby | 7 | 41 | 85 | 3.2 | 0.0 |
| niche | 8 | 60.5 | 78.05 | 3.9 | 0.4 |

| window | n | median views | median skip % | median watch s | shares+saves /100 views |
|---|---|---|---|---|---|
| midday | 10 | 102.5 | 75.1 | 4.550000000000001 | 0.8 |
| afternoon | 16 | 36.5 | 78.5 | 3.45 | 0.0 |
| evening | 9 | 54 | 73.3 | 4.6 | 0.3 |
| night | 20 | 32.0 | 78.05 | 4.45 | 0.0 |

## Top 5 overall

- 032-plainapp: 299 views, skip 70.9%, 5.3s watch, hook price, utility
- 056-loop: 298 views, skip 56.1%, 8.1s watch, hook price, utility
- 005-crisp: 248 views, skip 61.6%, 8.9s watch, hook price, utility
- 029-flectar: 167 views, skip 61.8%, 4.4s watch, hook price, subscription
- 038-maccy: 157 views, skip 69.9%, 6.1s watch, hook price, utility
