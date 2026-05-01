import json
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from backend.api import create_server


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = create_server("127.0.0.1", 0)
        cls.port = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def test_algorithms_endpoint(self):
        with urlopen(f"http://127.0.0.1:{self.port}/algorithms", timeout=2) as response:
            payload = json.loads(response.read())

        self.assertIn("FIFO", payload["algorithms"])
        self.assertIn("SECOND_CHANCE", payload["algorithms"])
        self.assertIn("RANDOM", payload["algorithms"])
        self.assertIn("OPTIMAL", payload["algorithms"])

    def test_serves_frontend_index(self):
        with urlopen(f"http://127.0.0.1:{self.port}/", timeout=2) as response:
            body = response.read().decode("utf-8")

        self.assertIn("Page Replacement Simulator", body)
        self.assertEqual(response.headers["Content-Type"], "text/html")

    def test_frontend_supports_head_request(self):
        request = Request(f"http://127.0.0.1:{self.port}/", method="HEAD")

        with urlopen(request, timeout=2) as response:
            body = response.read()

        self.assertEqual(body, b"")
        self.assertEqual(response.headers["Content-Type"], "text/html")

    def test_simulate_endpoint(self):
        body = json.dumps(
            {"algorithm": "FIFO", "frame_count": 2, "reference_string": [1, 2, 1, 3]}
        ).encode("utf-8")
        request = Request(
            f"http://127.0.0.1:{self.port}/simulate",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urlopen(request, timeout=2) as response:
            payload = json.loads(response.read())

        self.assertEqual(payload["stats"]["hits"], 1)
        self.assertEqual(payload["stats"]["faults"], 3)
        self.assertEqual(payload["steps"][-1]["evicted"], 1)

    def test_simulate_endpoint_validates_payload(self):
        request = Request(
            f"http://127.0.0.1:{self.port}/simulate",
            data=b"{}",
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with self.assertRaises(HTTPError) as context:
            urlopen(request, timeout=2)

        self.assertEqual(context.exception.code, 400)


if __name__ == "__main__":
    unittest.main()
