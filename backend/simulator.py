from __future__ import annotations

from typing import Any

from backend.c_engine import simulate_with_c
from backend.models import SimulationResult


SUPPORTED_ALGORITHMS = ("FIFO", "LRU", "MRU", "LFU", "MFU", "RANDOM", "OPTIMAL", "SECOND_CHANCE")


def normalize_algorithm(algorithm: str) -> str:
    normalized = algorithm.strip().replace("-", "_").replace(" ", "_").upper()
    aliases = {
        "OPT": "OPTIMAL",
        "RAND": "RANDOM",
        "CLOCK": "SECOND_CHANCE",
        "SECONDCHANCE": "SECOND_CHANCE",
    }
    normalized = aliases.get(normalized, normalized)
    if normalized not in SUPPORTED_ALGORITHMS:
        supported = ", ".join(SUPPORTED_ALGORITHMS)
        raise ValueError(f"Unsupported algorithm '{algorithm}'. Use one of: {supported}.")
    return normalized


def simulate(algorithm: str, frame_count: int, reference_string: list[Any]) -> SimulationResult:
    if not isinstance(frame_count, int) or frame_count <= 0:
        raise ValueError("frame_count must be a positive integer.")
    if not isinstance(reference_string, list):
        raise ValueError("reference_string must be a list.")
    if not all(isinstance(page, int) and not isinstance(page, bool) for page in reference_string):
        raise ValueError("reference_string must contain integers only.")

    normalized = normalize_algorithm(algorithm)
    return simulate_with_c(normalized, frame_count, reference_string)
