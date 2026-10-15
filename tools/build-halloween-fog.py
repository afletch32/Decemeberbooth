#!/usr/bin/env python3
"""Render fog-only motion over the approved, stationary Halloween backgrounds.
Requires numpy and ffmpeg. Run from the repository root.
"""
from pathlib import Path
import subprocess
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DURATION, FPS = 8, 30
W, H = 512, 192
x, y = np.meshgrid(np.arange(W) / W, np.arange(H) / H)
rng = np.random.default_rng(31)
# Periodic, layered cloud density; both advection and curling return to frame zero.
phases = rng.uniform(0, 2 * np.pi, (12, 2))
edge = np.sin(np.pi * x) ** 1.6 * np.sin(np.pi * y) ** 2

for orientation, width, height in [("portrait", 1200, 1800), ("landscape", 1800, 1200)]:
    base = ROOT / f"assets/themes/halloween/halloween-background-{orientation}.webp"
    output = ROOT / f"assets/themes/halloween/halloween-fog-background-{orientation}.mp4"
    fog_width, fog_height = round(width * .80), round(height * .35)
    filters = (f"[1:v]scale={fog_width}:{fog_height}:flags=bicubic[fog];"
               f"[0:v][fog]overlay=x=(W-w)/2:y=H*0.59:shortest=1,format=yuv420p[out]")
    command = ["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-framerate", str(FPS),
               "-i", str(base), "-f", "rawvideo", "-pixel_format", "rgba", "-video_size", f"{W}x{H}",
               "-framerate", str(FPS), "-i", "pipe:0", "-filter_complex", filters, "-map", "[out]",
               "-t", str(DURATION), "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "23",
               "-threads", "2", "-movflags", "+faststart", str(output)]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    for frame in range(DURATION * FPS):
        t = frame / (DURATION * FPS)
        drift = x - t
        curl = y + .06 * np.sin(2 * np.pi * (x + t))
        cloud = np.zeros_like(x)
        for k, (px, py) in enumerate(phases):
            frequency = k // 3 + 1
            cloud += (np.sin(2 * np.pi * (frequency * drift + (k % 3 + 1) * curl) + px)
                      * np.cos(2 * np.pi * curl * (k % 2 + 1) + py) / frequency)
        density = np.clip((cloud + 2.4) / 6, 0, 1) ** 1.7
        rgba = np.empty((H, W, 4), dtype=np.uint8)
        rgba[:, :, :3] = [160, 151, 163]
        rgba[:, :, 3] = np.clip(density * edge * 130, 0, 255).astype(np.uint8)
        process.stdin.write(rgba.tobytes())
    process.stdin.close()
    if process.wait():
        raise RuntimeError(f"ffmpeg failed: {orientation}")
    print(f"Rendered {output.name}: {width}x{height}, {DURATION}s, {output.stat().st_size} bytes", flush=True)
