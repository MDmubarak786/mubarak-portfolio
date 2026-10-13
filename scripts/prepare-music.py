#!/usr/bin/env python3
"""Cut the intro's music bed from a full track (Pixabay Content License tracks, see TRACKS).

Finds the stretch of LENGTH seconds that builds the most (quiet at the start, loudest near the end, so the music swells
into the ink finale), estimates the tempo, fades the edges and encodes 96 kbps stereo AAC to public/music/<name>.m4a.
Usage: python3 scripts/prepare-music.py <folder with the downloaded MP3s>   (needs macOS afconvert)
"""
import array, math, os, subprocess, sys, tempfile, wave

TRACKS = {  # name (= <name>.mp3 in, public/music/<name>.m4a out): (title, artist, Pixabay page)
    # Chosen 2026-10-13 from four auditioned candidates; the others were "Superhero Action Cinematic" (oldways_music),
    # "Intense Action Trailer Music" (DKFILMS) and "Superhero Movie Intro" (ArctSound).
    "intro": ("Trailer suspense and action", "NiKneT_Art", "https://pixabay.com/music/main-title-trailer-suspense-and-action-242881/"),
}
LENGTH, FADE_IN, FADE_OUT, STEP = 33.0, 0.4, 2.5, 0.25

def run(*a): subprocess.run(a, check=True, capture_output=True)

def main(src):
    out_dir = os.path.join("public", "music"); os.makedirs(out_dir, exist_ok=True); tmp = tempfile.mkdtemp()
    for name, (title, artist, page) in TRACKS.items():
        wav = os.path.join(tmp, f"{name}.wav"); cut = os.path.join(tmp, f"{name}-cut.wav")
        run("afconvert", "-f", "WAVE", "-d", "LEI16@44100", "-c", "2", os.path.join(src, f"{name}.mp3"), wav)
        with wave.open(wav) as w: rate, n = w.getframerate(), w.getnframes(); data = array.array("h", w.readframes(n))
        mono = [(data[i] + data[i + 1]) / 2 for i in range(0, len(data) - 1, 2)]
        hop = int(STEP * rate)
        env = [math.sqrt(sum(v * v for v in mono[i:i + hop]) / hop) for i in range(0, len(mono) - hop, hop)]
        dur = len(mono) / rate; win = int(LENGTH / STEP)
        best, best_s = None, 0
        for s in range(0, max(1, len(env) - win)):
            w_ = env[s:s + win]
            if len(w_) < win: break
            head = sum(w_[: int(6 / STEP)]) / int(6 / STEP)
            tail = sum(w_[int(22 / STEP): int(31 / STEP)]) / int(9 / STEP)
            score = tail - 0.6 * head + 0.3 * max(w_[int(22 / STEP):])
            if best is None or score > best: best, best_s = score, s
        start = best_s * STEP if dur > LENGTH else 0.0
        # Tempo: autocorrelation of the onset envelope (positive energy change) over 60–180 BPM.
        fine = int(0.02 * rate); e2 = [math.sqrt(sum(v * v for v in mono[i:i + fine]) / fine) for i in range(int(start * rate), int(min(dur, start + LENGTH) * rate) - fine, fine)]
        on = [max(0.0, e2[i] - e2[i - 1]) for i in range(1, len(e2))]
        bpm, bestc = 0, -1
        for b in range(60, 181):
            lag = 60 / b / 0.02; l = int(round(lag))
            c = sum(on[i] * on[i - l] for i in range(l, len(on)))
            if c > bestc: bestc, bpm = c, b
        a, b_ = int(start * rate), int(min(dur, start + LENGTH) * rate)
        seg = data[a * 2: b_ * 2]; frames = len(seg) // 2; fi, fo = int(FADE_IN * rate), int(FADE_OUT * rate)
        out = array.array("h", seg)
        for i in range(frames):
            g = min(1.0, i / fi if fi else 1.0, (frames - i) / fo if fo else 1.0)
            if g < 1: out[2 * i] = int(out[2 * i] * g); out[2 * i + 1] = int(out[2 * i + 1] * g)
        with wave.open(cut, "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(rate); w.writeframes(out.tobytes())
        dst = os.path.join(out_dir, f"{name}.m4a")
        run("afconvert", "-f", "m4af", "-d", "aac", "-b", "96000", cut, dst)
        prof = " ".join(f"{sum(env[best_s + k: best_s + k + int(3 / STEP)]) / int(3 / STEP) / 1000:.1f}" for k in range(0, win, int(3 / STEP)))
        print(f"{name}  {title} — {artist}\n    track {dur:5.1f}s, excerpt {start:5.1f}–{start + min(LENGTH, dur - start):5.1f}s, ~{bpm} BPM (rough), {os.path.getsize(dst) // 1024} KB\n    loudness every 3s: {prof}")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
