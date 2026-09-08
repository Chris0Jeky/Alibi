"""Generate Alibi's local, deterministic audio library.

The recipe file is the editable source of truth. This module deliberately refuses to
replace any existing output unless --force is supplied, including a byte-identical
deterministic regeneration.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


SR = 48_000
TAU = math.tau
ROOT = Path(__file__).resolve().parents[3]
RECIPE_PATH = ROOT / "assets-source/library/audio/source/recipes.json"
AUDIO_ROOT = ROOT / "assets-source/library/audio"
MASTER_DIR = AUDIO_ROOT / "masters"
PROD_DIR = AUDIO_ROOT / "production"
EVIDENCE_DIR = AUDIO_ROOT / "evidence"
GENERATOR_VERSION = "alibi-local-audio/v1"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def safe_write(path: Path, data: bytes, force: bool) -> None:
    """Write only when absent or explicitly forced; never silently overwrite."""

    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and not force:
        same = sha256_file(path) == sha256_bytes(data)
        detail = "byte-identical deterministic output" if same else "existing output"
        raise RuntimeError(f"Refusing to overwrite {detail}: {path.as_posix()} (pass --force)")
    path.write_bytes(data)


def dbfs(value: float) -> float:
    return 20.0 * math.log10(max(float(value), 1e-12))


def stats(samples: np.ndarray) -> dict[str, float]:
    mono = samples.mean(axis=1) if samples.ndim == 2 else samples
    peak = float(np.max(np.abs(mono)))
    rms = float(np.sqrt(np.mean(np.square(mono, dtype=np.float64))))
    return {"peak_dbfs": round(dbfs(peak), 3), "rms_dbfs": round(dbfs(rms), 3)}


def target_level(samples: np.ndarray, requested_dbfs: float) -> np.ndarray:
    mono = samples.mean(axis=1) if samples.ndim == 2 else samples
    current = float(np.sqrt(np.mean(np.square(mono, dtype=np.float64))))
    scale = 10.0 ** (requested_dbfs / 20.0) / max(current, 1e-12)
    peak = float(np.max(np.abs(samples))) * scale
    if peak > 0.92:
        scale *= 0.92 / peak
    return np.asarray(samples * scale, dtype=np.float64)


def wav_bytes(samples: np.ndarray) -> bytes:
    if samples.ndim == 1:
        samples = samples[:, None]
    pcm = np.clip(np.round(samples * 32767.0), -32768, 32767).astype("<i2")
    with __import__("io").BytesIO() as buf:
        with wave.open(buf, "wb") as out:
            out.setnchannels(samples.shape[1])
            out.setsampwidth(2)
            out.setframerate(SR)
            out.writeframes(pcm.tobytes())
        return buf.getvalue()


def envelope(n: int, attack: float = 0.015, release: float = 0.18) -> np.ndarray:
    a = min(n, max(1, int(SR * attack)))
    r = min(n, max(1, int(SR * release)))
    env = np.ones(n, dtype=np.float64)
    env[:a] = np.sin(np.linspace(0.0, math.pi / 2, a)) ** 2
    env[-r:] = np.cos(np.linspace(0.0, math.pi / 2, r)) ** 2
    return env


def voice(freq: float, t: np.ndarray, start: float, length: float, shape: str, seed: int) -> np.ndarray:
    """A small family of wooden, bell and air voices, all band-limited by envelopes."""

    local = t - start
    active = np.clip(local / max(length, 1e-6), 0.0, 1.0)
    decay = np.exp(-local * (3.7 if shape in {"bell", "discover"} else 5.2))
    decay[local < 0] = 0.0
    phase = TAU * freq * np.maximum(local, 0.0)
    if shape in {"pluck", "marimba", "place", "undo", "redo", "treat", "play"}:
        # Slightly inharmonic upper partials make a felted mallet rather than a plain beep.
        sound = (
            np.sin(phase)
            + 0.30 * np.sin(phase * 2.01 + 0.16)
            + 0.11 * np.sin(phase * 3.98 + 0.47)
        )
        sound *= np.exp(-local * (8.0 if shape == "pluck" else 5.8))
    elif shape in {"bell", "discover", "complete", "rising", "falling", "descending", "air-pluck"}:
        sound = (
            np.sin(phase)
            + 0.42 * np.sin(phase * 2.0 + 0.2)
            + 0.18 * np.sin(phase * 3.01 + 0.6)
            + 0.07 * np.sin(phase * 5.02 + 0.3)
        ) * decay
    elif shape in {"purr", "rest"}:
        slow = 0.5 + 0.5 * np.sin(TAU * 5.5 * np.maximum(local, 0.0))
        sound = (0.78 * np.sin(phase) + 0.22 * np.sin(phase * 2.0)) * decay * (0.68 + 0.32 * slow)
    elif shape in {"rubber", "hush", "remove", "soft-click"}:
        sound = np.sin(phase) * np.exp(-local * 12.5)
    else:
        sound = np.sin(phase) * decay
    sound[local < 0] = 0.0
    sound *= (0.7 + 0.3 * active)
    return sound


def soft_noise(rng: np.random.Generator, n: int, window: int = 1200) -> np.ndarray:
    raw = rng.normal(0.0, 1.0, n)
    if window <= 1:
        return raw
    kernel = np.ones(window, dtype=np.float64) / window
    return np.convolve(raw, kernel, mode="same")


def cue_samples(recipe: dict) -> np.ndarray:
    n = round(SR * recipe["duration_ms"] / 1000)
    t = np.arange(n, dtype=np.float64) / SR
    shape = recipe["shape"]
    notes = recipe.get("notes", [])
    seed = int(recipe["seed"])
    out = np.zeros(n, dtype=np.float64)

    patterns: dict[str, list[tuple[float, float]]] = {
        "pluck": [(0.00, 1.0)],
        "marimba": [(0.00, 1.0), (0.085, 0.76)],
        "bell": [(0.00, 1.0), (0.12, 0.72)],
        "descending": [(0.00, 1.0), (0.14, 0.84)],
        "air-pluck": [(0.00, 0.72), (0.19, 0.52)],
        "soft-click": [(0.00, 1.0)],
        "rising": [(0.00, 0.82), (0.10, 0.82), (0.20, 0.78)],
        "falling": [(0.00, 0.82), (0.10, 0.82), (0.20, 0.78)],
        "undo": [(0.00, 1.0), (0.13, 0.62)],
        "redo": [(0.00, 0.62), (0.13, 1.0)],
        "hush": [(0.00, 1.0)],
        "rubber": [(0.00, 0.85), (0.14, 0.55)],
        "place": [(0.00, 1.0), (0.13, 0.34)],
        "remove": [(0.00, 1.0), (0.15, 0.24)],
        "discover": [(0.00, 0.70), (0.13, 0.76), (0.29, 0.82)],
        "complete": [(0.00, 0.62), (0.16, 0.70), (0.32, 0.78), (0.49, 0.90)],
        "purr": [(0.00, 1.0), (0.12, 0.50)],
        "treat": [(0.00, 0.75), (0.13, 0.70), (0.28, 0.84)],
        "play": [(0.00, 0.74), (0.12, 0.64), (0.25, 0.84)],
        "rest": [(0.00, 0.75), (0.22, 0.55)],
    }
    pattern = patterns[shape]
    for i, (start, weight) in enumerate(pattern):
        freq = notes[min(i, len(notes) - 1)]
        out += weight * voice(freq, t, start, recipe["duration_ms"] / 1000, shape, seed + i)

    # Air cues get a barely perceptible filtered texture, giving them a room instead of a sterile beep.
    if shape in {"air-pluck", "discover", "complete", "rest", "purr", "play"}:
        rng = np.random.default_rng(seed)
        texture = soft_noise(rng, n, 720)
        tex_env = envelope(n, 0.06, 0.22) * 0.035
        out += texture * tex_env

    out *= envelope(n, 0.008, min(0.25, recipe["duration_ms"] / 1000 * 0.33))
    return target_level(out, recipe["level_dbfs"])


def make_loop(recipe: dict) -> np.ndarray:
    n = round(SR * recipe["duration_ms"] / 1000)
    t = np.arange(n, dtype=np.float64) / SR
    shape = recipe["shape"]
    rng = np.random.default_rng(int(recipe["seed"]))

    if shape == "library":
        out = 0.22 * np.sin(TAU * 0.17 * t) + 0.07 * np.sin(TAU * 0.41 * t)
        out += 0.10 * soft_noise(rng, n, 1800)
        # Page and clock textures are periodic, sparse and deliberately quiet.
        for start, freq in [(1.7, 740), (6.4, 620), (12.6, 810), (16.4, 540)]:
            out += voice(freq, t, start, 0.22, "hush", int(recipe["seed"])) * 0.028
    elif shape == "coast":
        swell = 0.24 * np.sin(TAU * t / 8.7) + 0.08 * np.sin(TAU * t / 3.4 + 0.7)
        water = soft_noise(rng, n, 560)
        wind = soft_noise(rng, n, 7800)
        out = swell + 0.22 * water + 0.032 * wind
        for start in [2.4, 7.2, 12.1, 17.6]:
            out += voice(520, t, start, 0.52, "bell", int(recipe["seed"])) * 0.035
    elif shape == "garden":
        air = soft_noise(rng, n, 4200)
        leaves = soft_noise(rng, n, 950)
        out = 0.18 * air + 0.12 * leaves + 0.04 * np.sin(TAU * t / 11.0)
        for start, freq in [(1.6, 880), (4.5, 710), (9.0, 960), (13.2, 760)]:
            out += voice(freq, t, start, 0.18, "hush", int(recipe["seed"])) * 0.027
    elif shape == "club":
        room = soft_noise(rng, n, 2100)
        out = 0.16 * room + 0.05 * np.sin(TAU * t / 13.0) + 0.03 * np.sin(TAU * t / 5.3)
        for start, freq in [(3.4, 196), (11.2, 247), (19.0, 220)]:
            out += voice(freq, t, start, 0.9, "rest", int(recipe["seed"])) * 0.035
    else:
        raise ValueError(f"unknown loop shape: {shape}")

    # A cosine crossfade over the loop boundary avoids a click. The final sample is
    # explicitly equal to the first sample so the measured endpoint seam is exact.
    fade = min(n // 8, SR // 4)
    phase = np.linspace(0.0, math.pi / 2, fade)
    blend = (np.sin(phase) ** 2)[:, None] if out.ndim == 2 else np.sin(phase) ** 2
    out[-fade:] = out[-fade:] * (1.0 - blend) + out[:fade] * blend
    out[-1] = out[0]
    out = target_level(out, recipe["level_dbfs"])
    if out.ndim == 1:
        # Production loops are stereo, with a tiny phase offset that remains mono-safe.
        left = out
        right = np.roll(out, 19) * 0.985
        out = np.column_stack((left, right))
        out[-1] = out[0]
    return out


def run_ffmpeg(input_path: Path, output_path: Path, codec: str, force: bool) -> None:
    if output_path.exists() and not force:
        same = sha256_file(output_path)
        raise RuntimeError(
            f"Refusing to overwrite existing encoded output {output_path.as_posix()} "
            f"(sha256 {same[:12]}; pass --force)"
        )
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error"]
    cmd += ["-y" if force else "-n", "-i", input_path.as_posix()]
    if codec == "opus":
        cmd += ["-c:a", "libopus", "-b:a", "64k", "-vbr", "on", "-application", "audio", output_path.as_posix()]
    elif codec == "ogg":
        cmd += ["-c:a", "libvorbis", "-q:a", "4", output_path.as_posix()]
    else:
        raise ValueError(codec)
    subprocess.run(cmd, cwd=ROOT, check=True)


def probe(path: Path) -> dict:
    cmd = [
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration:stream=codec_name,sample_rate,channels",
        "-of", "json", path.as_posix(),
    ]
    return json.loads(subprocess.check_output(cmd, cwd=ROOT, text=True))


def render_waveform_contact(items: list[tuple[str, np.ndarray]], path: Path, force: bool) -> None:
    width, row_height = 1500, 150
    image = Image.new("RGB", (width, row_height * len(items)), (247, 242, 229))
    draw = ImageDraw.Draw(image)
    for row, (name, samples) in enumerate(items):
        mono = samples.mean(axis=1) if samples.ndim == 2 else samples
        step = max(1, len(mono) // 1200)
        reduced = mono[: step * 1200].reshape(-1, step).mean(axis=1)
        peak = max(float(np.max(np.abs(reduced))), 1e-9)
        y_mid = row * row_height + 75
        draw.text((16, row * row_height + 14), name, fill=(66, 91, 80))
        points = []
        for x, value in enumerate(reduced):
            px = 220 + int(x * (width - 245) / len(reduced))
            py = int(y_mid - value / peak * 52)
            points.append((px, py))
        draw.line(points, fill=(76, 105, 92), width=2)
        draw.line([(220, y_mid), (width - 25, y_mid)], fill=(206, 196, 169), width=1)
    with __import__("io").BytesIO() as buf:
        image.save(buf, format="PNG", optimize=True)
        safe_write(path, buf.getvalue(), force)


def preview_html(catalogue: dict) -> str:
    entries = []
    for item in catalogue["assets"]:
        if item["category"] == "ambient":
            file_path = item["derivatives"]["opus"]
            label = f'{item["id"]} · ambient loop'
        else:
            file_path = item["derivatives"]["opus"]
            label = f'{item["id"]} · {item["event"]}'
        entries.append(
            f'<article><h3>{label}</h3><p>{item["description"]}</p>'
            f'<audio controls preload="none" src="production/{Path(file_path).name}">Your browser does not support audio.</audio>'
            f'<small>{item["metadata"]["duration_ms"]} ms · RMS {item["metadata"]["rms_dbfs"]} dBFS · {item["status"]}</small></article>'
        )
    return """<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Alibi audio library preview</title>
<style>body{margin:0;background:#f7f2e5;color:#263b34;font:16px system-ui,sans-serif}main{max-width:900px;margin:auto;padding:28px}h1{font:34px Georgia,serif}p{color:#5c6e62}article{border:1px solid #d8cfb6;background:#fbf8ee;border-radius:12px;padding:16px;margin:12px 0}h3{margin:0 0 4px;font:20px Georgia,serif}audio{width:100%;margin:10px 0}small{display:block;color:#768173}</style>
<main><h1>Alibi · paper lamplight audio</h1><p>Local preview only. Each track has an explicit play control; nothing starts automatically. Integration mapping and reduced-motion, mute and haptic guidance are in <code>docs/ASSET-AUDIO.md</code>.</p>
""" + "\n".join(entries) + "</main></html>\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="explicitly replace existing generated outputs")
    args = parser.parse_args()
    recipes = json.loads(RECIPE_PATH.read_text(encoding="utf-8"))
    source_hash = sha256_file(RECIPE_PATH)
    all_items = recipes["cues"] + recipes["loops"]
    catalogue_items = []
    contact_items: list[tuple[str, np.ndarray]] = []

    for recipe in all_items:
        is_loop = recipe in recipes["loops"]
        samples = make_loop(recipe) if is_loop else cue_samples(recipe)
        stem = recipe["id"]
        master_rel = f"assets-source/library/audio/masters/{stem}.wav"
        master_path = ROOT / master_rel
        master_data = wav_bytes(samples)
        safe_write(master_path, master_data, args.force)
        opus_rel = f"assets-source/library/audio/production/{stem}.opus"
        ogg_rel = f"assets-source/library/audio/production/{stem}.ogg"
        run_ffmpeg(master_path, ROOT / opus_rel, "opus", args.force)
        run_ffmpeg(master_path, ROOT / ogg_rel, "ogg", args.force)
        meta = {
            "duration_ms": round(len(samples) / SR * 1000, 3),
            "sample_rate_hz": SR,
            "channels": int(samples.shape[1] if samples.ndim == 2 else 1),
            **stats(samples),
            "master_sha256": sha256_file(master_path),
            "opus_sha256": sha256_file(ROOT / opus_rel),
            "ogg_sha256": sha256_file(ROOT / ogg_rel),
            "probe": {
                "opus": probe(ROOT / opus_rel),
                "ogg": probe(ROOT / ogg_rel),
            },
        }
        if is_loop:
            first = samples[0]
            last = samples[-1]
            meta["loop"] = {
                "seam_continuity": "endpoint sample exact",
                "seam_sample_delta": round(float(np.max(np.abs(first - last))), 12),
                "seam_fade_ms": round(min(recipe["duration_ms"] / 8, 250), 3),
                "deterministic": True,
            }
        catalogue_items.append(
            {
                "id": recipe["id"],
                "category": recipe["category"],
                "event": recipe["event"],
                "status": "proposed",
                "existing_event_status": recipe["status"],
                "description": recipe["description"],
                "source": {
                    "recipe": "assets-source/library/audio/source/recipes.json",
                    "generator": "tools/assets/audio/generate_audio.py",
                    "recipe_sha256": source_hash,
                    "seed": recipe["seed"],
                    "shape": recipe["shape"],
                },
                "derivatives": {"wav_master": master_rel, "opus": opus_rel, "ogg": ogg_rel},
                "metadata": meta,
                "provenance": "Original deterministic local synthesis; no external samples or remote generation.",
                "integration_ref": recipe["integration_ref"],
            }
        )
        contact_items.append((recipe["id"], samples))

    catalogue = {
        "schema": 1,
        "title": "Alibi paper lamplight audio library",
        "generator": GENERATOR_VERSION,
        "source_recipe": "assets-source/library/audio/source/recipes.json",
        "source_recipe_sha256": source_hash,
        "defaults": {
            "autoplay": False,
            "preload": "none",
            "mute_contract": "Respect the existing Quiet Wing sound setting before starting any cue or loop.",
            "reduced_motion_contract": "Reduced motion pauses ambient motion and should also suppress optional ambient loops; deliberate feedback cues remain opt-in.",
            "haptic_contract": "Keep haptics independent: the existing place/erase/win patterns may run without audio.",
        },
        "assets": catalogue_items,
    }
    catalogue_json = json.dumps(catalogue, indent=2, ensure_ascii=False) + "\n"
    safe_write(AUDIO_ROOT / "catalogue.json", catalogue_json.encode("utf-8"), args.force)
    safe_write(AUDIO_ROOT / "preview.html", preview_html(catalogue).encode("utf-8"), args.force)
    render_waveform_contact(contact_items, EVIDENCE_DIR / "waveform-contact.png", args.force)
    # Keep a concise machine-readable evidence receipt beside the catalogue.
    receipt = {
        "generator": GENERATOR_VERSION,
        "source_recipe_sha256": source_hash,
        "asset_count": len(catalogue_items),
        "cue_count": len(recipes["cues"]),
        "loop_count": len(recipes["loops"]),
        "waveform_contact": "assets-source/library/audio/evidence/waveform-contact.png",
        "all_encoded_with": "ffmpeg libopus/libvorbis; all files probed with ffprobe",
        "all_hashes_in": "assets-source/library/audio/catalogue.json",
    }
    safe_write(AUDIO_ROOT / "evidence" / "receipt.json", (json.dumps(receipt, indent=2) + "\n").encode("utf-8"), args.force)
    print(f"Generated {len(recipes['cues'])} cues and {len(recipes['loops'])} loops")
    print(f"Recipe SHA-256: {source_hash}")
    print(f"Catalogue: {AUDIO_ROOT / 'catalogue.json'}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, subprocess.CalledProcessError, ValueError) as exc:
        print(f"audio generation failed: {exc}", file=sys.stderr)
        raise SystemExit(2)
