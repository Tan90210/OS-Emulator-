from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

from backend.models import SimulationResult, SimulationStats, SimulationStep


PROJECT_ROOT = Path(__file__).resolve().parent.parent
C_SOURCE_PATHS = [
    PROJECT_ROOT / "c_src" / "page_simulator.c",
    PROJECT_ROOT / "c_src" / "common.c",
    PROJECT_ROOT / "c_src" / "fifo.c",
    PROJECT_ROOT / "c_src" / "lru.c",
    PROJECT_ROOT / "c_src" / "mru.c",
    PROJECT_ROOT / "c_src" / "lfu.c",
    PROJECT_ROOT / "c_src" / "mfu.c",
    PROJECT_ROOT / "c_src" / "random.c",
    PROJECT_ROOT / "c_src" / "optimal.c",
    PROJECT_ROOT / "c_src" / "second_chance.c",
    PROJECT_ROOT / "c_src" / "page_simulator.h",
]
BINARY_PATH = PROJECT_ROOT / "build" / "page_simulator"


def simulate_with_c(algorithm: str, frame_count: int, reference_string: list[int]) -> SimulationResult:
    ensure_c_engine_built()
    command = [str(BINARY_PATH), algorithm, str(frame_count), *(str(page) for page in reference_string)]
    completed = subprocess.run(command, capture_output=True, text=True, check=False)
    if completed.returncode != 0:
        message = completed.stderr.strip() or "C simulator failed."
        raise RuntimeError(message)

    payload = json.loads(completed.stdout)
    return _result_from_payload(payload)


def ensure_c_engine_built() -> None:
    if _binary_is_current():
        return

    BINARY_PATH.parent.mkdir(parents=True, exist_ok=True)
    source_files = [str(path) for path in C_SOURCE_PATHS if path.suffix == ".c"]
    command = ["gcc", "-std=c11", "-Wall", "-Wextra", "-O2", "-o", str(BINARY_PATH), *source_files]
    completed = subprocess.run(command, capture_output=True, text=True, check=False)
    if completed.returncode != 0:
        message = completed.stderr.strip() or "Could not compile C simulator."
        raise RuntimeError(message)


def _binary_is_current() -> bool:
    if not BINARY_PATH.exists():
        return False
    binary_mtime = BINARY_PATH.stat().st_mtime
    return all(binary_mtime >= path.stat().st_mtime for path in C_SOURCE_PATHS)


def _result_from_payload(payload: dict[str, Any]) -> SimulationResult:
    steps = [
        SimulationStep(
            step=step["step"],
            page=step["page"],
            hit=step["hit"],
            fault=step["fault"],
            frames=step["frames"],
            evicted=step["evicted"],
            pointer=step["pointer"],
            reference_bits=step["reference_bits"],
        )
        for step in payload["steps"]
    ]
    stats = SimulationStats(**payload["stats"])
    return SimulationResult(
        algorithm=payload["algorithm"],
        frame_count=payload["frame_count"],
        reference_string=payload["reference_string"],
        steps=steps,
        stats=stats,
    )
