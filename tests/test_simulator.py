import unittest
from pathlib import Path

from backend.c_engine import BINARY_PATH, simulate_with_c
from backend.simulator import SUPPORTED_ALGORITHMS, simulate


class SimulatorTests(unittest.TestCase):
    def test_c_algorithms_have_separate_source_files(self):
        c_root = Path(__file__).resolve().parent.parent / "c_src"
        expected_files = [
            "fifo.c",
            "lru.c",
            "mru.c",
            "lfu.c",
            "mfu.c",
            "random.c",
            "optimal.c",
            "second_chance.c",
        ]

        for filename in expected_files:
            with self.subTest(filename=filename):
                self.assertTrue((c_root / filename).is_file())

    def test_all_algorithms_return_one_step_per_reference(self):
        refs = [7, 0, 1, 2, 0, 3, 0, 4]

        for algorithm in SUPPORTED_ALGORITHMS:
            with self.subTest(algorithm=algorithm):
                result = simulate(algorithm, 3, refs)

                self.assertEqual(len(result.steps), len(refs))
                self.assertEqual(result.stats.references, len(refs))
                self.assertEqual(result.stats.hits + result.stats.faults, len(refs))

    def test_integer_references_are_supported_by_c_engine(self):
        result = simulate_with_c("LRU", 3, [7, 0, 1, 2, 0, 3, 0, 4])

        self.assertTrue(BINARY_PATH.exists())
        self.assertEqual(result.algorithm, "LRU")
        self.assertEqual(result.stats.hits, 2)
        self.assertEqual(result.stats.faults, 6)

    def test_fifo_fault_count(self):
        result = simulate("FIFO", 3, [1, 2, 3, 1, 4, 5])

        self.assertEqual(result.stats.hits, 1)
        self.assertEqual(result.stats.faults, 5)
        self.assertEqual(result.steps[-1].frames, [4, 5, 3])

    def test_lru_fault_count(self):
        result = simulate("LRU", 3, [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2])

        self.assertEqual(result.stats.faults, 9)

    def test_mru_evicts_most_recently_used_page(self):
        result = simulate("MRU", 2, [1, 2, 1, 3])

        self.assertEqual(result.steps[-1].evicted, 1)
        self.assertEqual(result.steps[-1].frames, [3, 2])

    def test_lfu_uses_oldest_loaded_page_to_break_ties(self):
        result = simulate("LFU", 2, [1, 2, 3])

        self.assertEqual(result.steps[-1].evicted, 1)
        self.assertEqual(result.steps[-1].frames, [3, 2])

    def test_mfu_uses_oldest_loaded_page_to_break_ties(self):
        result = simulate("MFU", 2, [1, 2, 1, 3])

        self.assertEqual(result.steps[-1].evicted, 1)
        self.assertEqual(result.steps[-1].frames, [3, 2])

    def test_random_replacement_is_supported(self):
        result = simulate("Random", 3, [7, 0, 1, 2, 0, 3, 0, 4])

        self.assertEqual(result.algorithm, "RANDOM")
        self.assertEqual(len(result.steps), 8)
        self.assertEqual(result.stats.hits + result.stats.faults, 8)

    def test_optimal_fault_count(self):
        result = simulate("Optimal", 3, [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2])

        self.assertEqual(result.algorithm, "OPTIMAL")
        self.assertEqual(result.stats.faults, 7)

    def test_second_chance_tracks_pointer_and_reference_bits(self):
        result = simulate("Second Chance", 3, [1, 2, 3, 1, 4])

        self.assertEqual(result.algorithm, "SECOND_CHANCE")
        self.assertTrue(result.steps[3].hit)
        self.assertEqual(result.steps[-1].evicted, 1)
        self.assertEqual(result.steps[-1].frames, [4, 2, 3])
        self.assertEqual(result.steps[-1].reference_bits, [1, 0, 0])

    def test_rejects_invalid_algorithm(self):
        with self.assertRaises(ValueError):
            simulate("NotReal", 3, [1, 2, 3])

    def test_rejects_invalid_frame_count(self):
        with self.assertRaises(ValueError):
            simulate("FIFO", 0, [1, 2, 3])

    def test_rejects_non_integer_references(self):
        with self.assertRaises(ValueError):
            simulate("FIFO", 2, [1, "A", 2])


if __name__ == "__main__":
    unittest.main()
