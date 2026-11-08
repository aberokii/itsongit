#!/usr/bin/env python3
"""Sound for the "living screencast" format (Lemo-Opuscar style, STYLE.md §7): two resolutions in the music.
The hi-fi layer (soft piano chords, upright-ish bass, brushed hats) is the world; a chiptune square voice is the
mascot. Everything is synthesised here (numpy only), so there are no sample licences to track.

  python pipeline/screencast_audio.py sfx                 → studio/public/sfx/chip_*.wav (jump, land, step, notes)
  python pipeline/screencast_audio.py bed OUT.wav SECONDS → a 104 BPM bed, ends on a held major-9 chord
"""
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
ROOT = Path(__file__).resolve().parents[1]


def write(path, x):
    x = np.clip(x, -1, 1)
    y = (x * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())


def env(n, a=0.004, d=0.0, s=1.0, r=0.05):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    if d:
        e = e * (s + (1 - s) * np.exp(-np.maximum(0, t - a) / d))
    tail = int(r * SR)
    if tail and n > tail:
        e[-tail:] *= np.linspace(1, 0, tail)
    return e


def square(freq, n, duty=0.5):
    ph = np.cumsum(np.broadcast_to(freq, (n,)) / SR) % 1.0
    return np.where(ph < duty, 1.0, -1.0)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def chip(kind):
    if kind == "jump":   # rising square sweep
        n = int(0.16 * SR); f = np.linspace(330, 990, n)
        return 0.32 * square(f, n, 0.25) * env(n, 0.002, 0.08, 0.2, 0.03)
    if kind == "land":   # short low thump + noise tick
        n = int(0.11 * SR); f = np.linspace(220, 90, n)
        noise = np.random.default_rng(3).uniform(-1, 1, n) * np.exp(-np.arange(n) / (0.01 * SR))
        return 0.36 * square(f, n, 0.5) * env(n, 0.001, 0.04, 0.0, 0.02) + 0.18 * noise
    if kind == "step":
        n = int(0.05 * SR)
        return 0.2 * square(np.full(n, 660.0), n, 0.125) * env(n, 0.001, 0.02, 0.0, 0.01)
    if kind == "pop":    # UI pop (hi-fi side): a soft sine blip
        n = int(0.09 * SR); t = np.arange(n) / SR
        return 0.35 * np.sin(2 * np.pi * (900 - 2500 * t) * t) * env(n, 0.002, 0.03, 0.0, 0.02)
    if kind == "key":    # keyboard: thock + click
        n = int(0.06 * SR); rng = np.random.default_rng(7)
        thock = np.sin(2 * np.pi * 140 * np.arange(n) / SR) * np.exp(-np.arange(n) / (0.012 * SR))
        click = rng.uniform(-1, 1, n) * np.exp(-np.arange(n) / (0.003 * SR))
        return 0.35 * thock + 0.25 * click
    if kind.startswith("note_"):  # chiptune melody notes for the mascot (C5 E5 G5 C6 like the demo's end card)
        m = {"c5": 72, "e5": 76, "g5": 79, "c6": 84}[kind[5:]]
        n = int(0.22 * SR)
        return 0.28 * square(np.full(n, hz(m)), n, 0.5) * env(n, 0.003, 0.09, 0.35, 0.06)
    raise SystemExit(f"unknown chip {kind}")


def piano(midi, dur, vel=0.5):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(midi)
    x = sum((0.6 ** k) * np.sin(2 * np.pi * f * (k + 1) * t) * np.exp(-t * (1.6 + k * 1.3)) for k in range(5))
    return vel * x * env(n, 0.006, 0, 1, 0.08)


def bed(seconds, bpm=104):
    beat = 60 / bpm
    n = int((seconds + 2.5) * SR)
    out = np.zeros(n)

    def add(x, at):
        i = int(at * SR)
        if i >= n: return
        out[i:i + len(x)] += x[: n - i]

    # Fmaj9 - Em7 - Dm9 - Cmaj9 (warm, unhurried), one chord per bar
    prog = [[53, 57, 60, 64, 67], [52, 55, 59, 62], [50, 53, 57, 60, 64], [48, 52, 55, 59, 62]]
    bass = [41, 40, 38, 36]
    bars = int(seconds / (4 * beat)) + 1
    rng = np.random.default_rng(11)
    for b in range(bars):
        t0 = b * 4 * beat
        ch = prog[b % 4]
        for i, m in enumerate(ch):
            add(piano(m, 4 * beat, 0.16), t0 + i * 0.012)
        for k, off in enumerate([0, 2.5]):  # bass: root on 1, pickup on the and-of-3
            add(piano(bass[b % 4] - 12 * (k == 0) + 12, 1.2 * beat, 0.32), t0 + off * beat)
        for q in range(8):  # brushed hats on eighths
            m = int(0.08 * SR)
            add(rng.uniform(-1, 1, m) * np.exp(-np.arange(m) / (0.02 * SR)) * (0.05 if q % 2 else 0.08), t0 + q * beat / 2)
    end = seconds - 0.2  # a held Cmaj9 under the last line
    for i, m in enumerate([48, 55, 59, 62, 64, 71]):
        add(piano(m, 3.0, 0.14), end + i * 0.02)
    k = int(0.03 * SR)
    lp = np.convolve(out, np.ones(k // 10) / (k // 10), mode="same")  # gentle low-pass: keep it behind the voice
    return 0.9 * lp / max(1e-6, np.abs(lp).max())


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "sfx"
    if cmd == "sfx":
        d = ROOT / "studio/public/sfx"
        for k in ["jump", "land", "step", "pop", "key", "note_c5", "note_e5", "note_g5", "note_c6"]:
            write(d / f"chip_{k}.wav", chip(k))
        print("wrote chip_*.wav to", d)
    elif cmd == "bed":
        write(Path(sys.argv[2]), bed(float(sys.argv[3])))
        print("wrote", sys.argv[2])
