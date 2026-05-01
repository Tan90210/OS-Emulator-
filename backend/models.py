from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class SimulationStep:
    step: int
    page: Any
    hit: bool
    fault: bool
    frames: list[Any | None]
    evicted: Any | None
    pointer: int | None = None
    reference_bits: list[int] | None = None


@dataclass(frozen=True)
class SimulationStats:
    references: int
    hits: int
    faults: int
    hit_rate: float
    fault_rate: float


@dataclass(frozen=True)
class SimulationResult:
    algorithm: str
    frame_count: int
    reference_string: list[Any]
    steps: list[SimulationStep]
    stats: SimulationStats

    def to_dict(self) -> dict[str, Any]:
        return {
            "algorithm": self.algorithm,
            "frame_count": self.frame_count,
            "reference_string": self.reference_string,
            "steps": [asdict(step) for step in self.steps],
            "stats": asdict(self.stats),
        }

