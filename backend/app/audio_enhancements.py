from __future__ import annotations

from dataclasses import dataclass

from app.core.errors import ApiError


@dataclass(frozen=True)
class Enhancement:
    id: str
    label: str
    description: str
    group: str
    modifier: bool = False


# Order matters: the UI renders this order and the worker applies filters in this order.
ENHANCEMENTS: tuple[Enhancement, ...] = (
    Enhancement("remove_noise", "Remove Noise", "Spectral denoise for hiss, hum and steady background noise.", "noise"),
    Enhancement("remove_background_audio", "Remove Background Audio", "Aggressive denoise that pushes back room and street sound.", "noise"),
    Enhancement("remove_wind_noise", "Remove Wind Noise", "High-pass filter that clears low-frequency wind rumble.", "noise"),
    Enhancement("remove_echo", "Remove Echo", "Reduces slap-back echo from hard rooms.", "space"),
    Enhancement("remove_reverb", "Remove Reverb", "Tightens long reverb tails on speech.", "space"),
    Enhancement("remove_mouth_sounds", "Remove Mouth Sounds", "De-esser that tames sibilance, clicks and smacks.", "voice"),
    Enhancement("remove_breath", "Remove Breath", "Gates quiet breaths between phrases.", "voice"),
    Enhancement("fix_clipping", "Fix Clipping", "Repairs distorted peaks in over-recorded audio.", "repair"),
    Enhancement("remove_long_silences", "Remove Long Silences", "Trims dead air longer than about a second.", "repair"),
    Enhancement("normalize", "Normalize", "Broadcast loudness levelling to -16 LUFS.", "level"),
    Enhancement("auto_eq", "AutoEQ", "Balanced speech EQ curve with clarity lift.", "level"),
    Enhancement("studio_sound", "Studio Sound", "Compression, EQ and levelling for a polished voice.", "level"),
    Enhancement("keep_music", "Keep Music", "Applies every choice gently so music and ambience survive.", "level", modifier=True),
)

ENHANCEMENT_IDS = {item.id for item in ENHANCEMENTS}
PROCESSING_IDS = {item.id for item in ENHANCEMENTS if not item.modifier}

OUTPUT_FORMATS = {
    "mp3": ("libmp3lame", "mp3"),
    "m4a": ("aac", "m4a"),
    "wav": ("pcm_s16le", "wav"),
}


def validate_selection(selected: list[str]) -> list[str]:
    unknown = [item for item in selected if item not in ENHANCEMENT_IDS]
    if unknown:
        raise ApiError("UNKNOWN_ENHANCEMENT", "One or more selected enhancements are not supported.", status_code=422, details={"unknown": unknown})
    chosen = [item.id for item in ENHANCEMENTS if item.id in set(selected)]
    if not any(item in PROCESSING_IDS for item in chosen):
        raise ApiError("NO_ENHANCEMENT_SELECTED", "Choose at least one cleanup option.", status_code=422)
    return chosen


def build_filter_chain(selected: list[str]) -> str:
    """Compose one FFmpeg audio filter chain from the selected cleanup options."""

    chosen = set(selected)
    gentle = "keep_music" in chosen
    filters: list[str] = []

    if "fix_clipping" in chosen:
        filters.append("adeclip")
    if "remove_wind_noise" in chosen:
        filters.append("highpass=f=110")

    if "remove_background_audio" in chosen:
        filters.append(f"afftdn=nr={14 if gentle else 28}:nf=-28:tn=1")
    elif "remove_noise" in chosen:
        filters.append(f"afftdn=nr={10 if gentle else 20}:nf=-25:tn=1")

    if chosen & {"remove_echo", "remove_reverb"}:
        filters.append(f"afftdn=nr={8 if gentle else 14}:nf=-32:tn=1")
        if not gentle:
            filters.append("agate=threshold=0.015:ratio=1.8:attack=8:release=160")

    if "remove_mouth_sounds" in chosen:
        filters.append(f"deesser=i={0.25 if gentle else 0.4}")
    if "remove_breath" in chosen and not gentle:
        filters.append("agate=threshold=0.01:ratio=2:attack=5:release=120")

    if "remove_long_silences" in chosen:
        filters.append("silenceremove=stop_periods=-1:stop_duration=1.2:stop_threshold=-38dB:detection=peak")

    if "auto_eq" in chosen or "studio_sound" in chosen:
        filters.append("highpass=f=80")
        filters.append("equalizer=f=250:t=q:w=1:g=-2")
        filters.append(f"equalizer=f=3000:t=q:w=1.5:g={2 if gentle else 3}")
    if "studio_sound" in chosen:
        filters.append("acompressor=threshold=-18dB:ratio=3:attack=10:release=180:makeup=2")

    if "normalize" in chosen or "studio_sound" in chosen:
        filters.append("loudnorm=I=-16:TP=-1.5:LRA=11")

    if not filters:
        filters.append("anull")
    return ",".join(filters)


def catalog() -> list[dict[str, object]]:
    return [
        {"id": item.id, "label": item.label, "description": item.description, "group": item.group, "modifier": item.modifier}
        for item in ENHANCEMENTS
    ]
