# PULSE — room signal

A 20-minute attention flag for a long masterclass. Students mark how the room feels
from their phone; you watch it on the board.

## Run it in the classroom

Put both files in the same folder. On your laptop:

```
node server.js
```

It prints two links. Open the instructor one, hit **Join screen**, project it.
Students scan the QR or type the URL. Everything runs on your laptop over the local
wifi — no internet, no accounts, no data leaves the room.

Custom port: `node server.js 3000`

## Rehearsal — testing it with nobody around

Open `index.html` and pick **REHEARSAL**. 39 simulated students start marking in real
time, on the real clock, at 10× speed. Switch speed from the strip along the top:

| speed | one window closes in | whole day runs in |
|---|---|---|
| 1× | 20:00 | 6 hours |
| 10× | 2:00 | 36 min |
| 20× | 1:00 | 18 min |
| 60× | 0:20 | 6 min |

Marks trickle in across each window the way a real room does — a couple early, most in
the middle, a few at the last second, and roughly one in ten sitting the window out.
Attention decays as the day runs, dips just before each break and lifts after it.

**Seat 01 is left free.** Hit **Join screen**, scan with your phone, enter the seat 01
code, and you're the 40th student in your own simulation — you'll watch your own mark
land on the board.

**Pause marks** freezes the bots so you can look around. **Restart** clears the day and
runs it again. **···** → `1` exports the CSV so you can see the data you'd walk away with.

Direct link: `index.html?r=h&rehearse=1&speed=10`

## Just previewing

Open `index.html` directly and pick INSTRUCTOR. It runs in demo mode (one device only,
no phone sync). `···` → `4` fills the whole board instantly with a finished day.

## Settings

Add to the URL:

| | |
|---|---|
| `?win=15` | minutes per window (default 20) |
| `?hours=6` | length of the day (default 6) |
| `?n=40` | number of seats (default 40) |
| `?speed=60` | fast-forward for rehearsal — a 20-min window closes in 20s |
| `?title=Your+Course` | the name in the header |

Put the same settings on the student link if you change `win`, `hours`, or `n`.

## During the session

- **Start day** opens window 01. **Pause** freezes the clock over lunch.
- Students can change their mark until their window closes, then it locks.
- `···` → `1` exports a CSV, `2` starts day 2 with the same codes, `3` issues new ones.
- Marks are saved to `pulse-state.json` after every change, so a laptop sleep or a
  crash doesn't lose the day.
