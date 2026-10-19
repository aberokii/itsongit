"""Word-level transcript of a voiceover with faster-whisper (runs on macOS and Linux, no API).

usage: pipeline/.venv/bin/python pipeline/transcribe.py <audio.wav> <out.json> [--prompt "Names, Words"]
writes {"words": [{"text", "start", "end", "type": "word"}]}, the same shape as the editor's transcribe.py.
"""
import argparse
import json
import subprocess

import numpy as np

from faster_whisper import WhisperModel

ap = argparse.ArgumentParser()
ap.add_argument("audio")
ap.add_argument("out")
ap.add_argument("--prompt", default=None)
ap.add_argument("--model", default="small.en")
a = ap.parse_args()

model = WhisperModel(a.model, device="cpu", compute_type="int8")
# decode with ffmpeg (16 kHz mono float32) instead of PyAV, which breaks across versions
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", a.audio, "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                     capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, dtype=np.float32)
segments, _ = model.transcribe(audio, language="en", word_timestamps=True, initial_prompt=a.prompt, vad_filter=False)
words = [{"text": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3), "type": "word"}
         for seg in segments for w in seg.words if w.word.strip()]
with open(a.out, "w") as fh:
    json.dump({"words": words}, fh)
print(f"{len(words)} words → {a.out}")
