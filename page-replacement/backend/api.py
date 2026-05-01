from __future__ import annotations

import argparse
import json
import mimetypes
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse

from .simulator import SUPPORTED_ALGORITHMS, simulate


PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_ROOT = PROJECT_ROOT / "frontend"


class SimulatorRequestHandler(BaseHTTPRequestHandler):
    server_version = "PageReplacementSimulator/1.0"

    def do_OPTIONS(self) -> None:
        self._send_json({}, status=204)

    def do_HEAD(self) -> None:
        self._handle_get(send_body=False)

    def do_GET(self) -> None:
        self._handle_get(send_body=True)

    def _handle_get(self, send_body: bool) -> None:
        path = urlparse(self.path).path
        if path == "/health":
            self._send_json({"status": "ok"}, send_body=send_body)
        elif path == "/algorithms":
            self._send_json({"algorithms": list(SUPPORTED_ALGORITHMS)}, send_body=send_body)
        elif path == "/" or path.startswith("/assets/") or path in {"/app.js", "/styles.css"}:
            self._send_static(path, send_body=send_body)
        else:
            self._send_error(404, "Route not found.", send_body=send_body)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path != "/simulate":
            self._send_error(404, "Route not found.")
            return

        try:
            payload = self._read_json()
            algorithm = payload["algorithm"]
            frame_count = payload["frame_count"]
            reference_string = payload["reference_string"]
            result = simulate(algorithm, frame_count, reference_string)
        except KeyError as exc:
            self._send_error(400, f"Missing required field: {exc.args[0]}.")
        except (TypeError, ValueError, RuntimeError, json.JSONDecodeError) as exc:
            self._send_error(400, str(exc))
        else:
            self._send_json(result.to_dict())

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(length)
        payload = json.loads(raw_body.decode("utf-8") or "{}")
        if not isinstance(payload, dict):
            raise ValueError("JSON body must be an object.")
        return payload

    def _send_error(self, status: int, message: str, send_body: bool = True) -> None:
        self._send_json({"error": message}, status=status, send_body=send_body)

    def _send_static(self, path: str, send_body: bool = True) -> None:
        relative_path = "index.html" if path == "/" else path.lstrip("/")
        requested_path = (FRONTEND_ROOT / relative_path).resolve()
        try:
            requested_path.relative_to(FRONTEND_ROOT.resolve())
        except ValueError:
            self._send_error(404, "Route not found.")
            return

        if not requested_path.is_file():
            self._send_error(404, "Route not found.")
            return

        body = requested_path.read_bytes()
        content_type = mimetypes.guess_type(requested_path.name)[0] or "application/octet-stream"
        if requested_path.suffix == ".js":
            content_type = "application/javascript"
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if send_body:
            self.wfile.write(body)

    def _send_json(self, payload: dict[str, Any], status: int = 200, send_body: bool = True) -> None:
        body = b"" if status == 204 else json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if body and send_body:
            self.wfile.write(body)


def create_server(host: str = "127.0.0.1", port: int = 8000) -> ThreadingHTTPServer:
    return ThreadingHTTPServer((host, port), SimulatorRequestHandler)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the page replacement simulator API.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8000, type=int)
    args = parser.parse_args()

    server = create_server(args.host, args.port)
    print(f"Serving page replacement simulator API on http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
