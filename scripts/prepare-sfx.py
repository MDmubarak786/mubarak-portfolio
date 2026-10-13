#!/usr/bin/env python3
"""Prepare the intro's Mixkit sound effects (Mixkit Sound Effects Free License) for the web.

For each source MP3: decode with macOS afconvert, mix to mono, keep only the part the intro uses (with a short fade),
normalise the peak, and encode 64 kbps AAC into public/sfx/<name>.m4a. Timing (start of sound, loudest point) is
measured in the browser at load time, so encoder delay never shifts a cue.

Usage: python3 scripts/prepare-sfx.py <folder with the downloaded previews>
Sources: https://mixkit.co/free-sound-effects/ (ids below; preview URL assets.mixkit.co/active_storage/sfx/<id>/<id>-preview.mp3)
"""
import array, os, subprocess, sys, tempfile, wave

# name: (Mixkit id, title, seconds to keep)
SFX = {
    "open": (2902, "Movie impact intro presentation", 4.5),
    "hit": (563, "Drum deep impact", 2.6),
    "turn": (1105, "Big paper page turn", 1.6),
    "cam": (1489, "Air woosh", 1.6),
    "slam": (2299, "Short bass hit", 1.4),
    "pop": (3005, "Explainer video pops whoosh light pop", 1.0),
    "boot": (3160, "Sci fi power up", 2.0),
    "whoosh": (1490, "Fast whoosh transition", 1.4),
    "tick": (1059, "Tick tock clock close up", 3.4),
    "kaching": (1999, "Gold coin prize", 1.6),
    "zap": (2600, "Electricity static power up", 2.0),
    "faces": (2628, "Relaxing harp sweep", 3.0),
    "continued": (677, "Cinematic glass hit suspense", 3.0),
    "dive": (790, "Cinematic trailer riser", 2.4),
    "boom": (788, "Big cinematic impact", 4.0),
    "stamp": (2900, "Movie logo intro impact", 5.0),
    "drain": (2638, "Magic transition sweep presentation", 2.6),
}
FADE = 0.35   # seconds of fade-out at the cut
PEAK = 0.89   # about -1 dBFS

def run(*a):
    subprocess.run(a, check=True, capture_output=True)

def main(src):
    out_dir = os.path.join("public", "sfx"); os.makedirs(out_dir, exist_ok=True)
    tmp = tempfile.mkdtemp()
    for name, (mid, title, keep) in SFX.items():
        mp3 = os.path.join(src, f"{name}.mp3")
        wav = os.path.join(tmp, f"{name}.wav"); mono = os.path.join(tmp, f"{name}-mono.wav")
        run("afconvert", "-f", "WAVE", "-d", "LEI16@44100", mp3, wav)
        with wave.open(wav) as w:
            ch, rate, n = w.getnchannels(), w.getframerate(), w.getnframes()
            data = array.array("h", w.readframes(n))
        samples = [sum(data[i:i + ch]) / ch for i in range(0, len(data), ch)]
        samples = samples[: int(keep * rate)]
        f = int(FADE * rate)
        for i in range(max(0, len(samples) - f), len(samples)):
            samples[i] *= (len(samples) - i) / f
        peak = max(1.0, max(abs(s) for s in samples))
        g = PEAK * 32767 / peak
        with wave.open(mono, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
            w.writeframes(array.array("h", (int(max(-32767, min(32767, s * g))) for s in samples)).tobytes())
        out = os.path.join(out_dir, f"{name}.m4a")
        run("afconvert", "-f", "m4af", "-d", "aac", "-b", "64000", mono, out)
        print(f"{name:10s} #{mid:<5d} {len(samples) / rate:4.1f}s  {os.path.getsize(out) // 1024:4d} KB  {title}")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
