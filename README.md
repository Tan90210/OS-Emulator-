# Page Replacement Algorithm Simulator

A C-backed web simulator for classic page replacement algorithms:

- FIFO
- LRU
- MRU
- LFU
- MFU
- Random
- Optimal
- Second Chance

The replacement algorithms are implemented in C for OS lab use. The Python
backend serves the HTTP API and frontend using only the standard library.

## Run the Backend

```bash
python3 -m backend.api
```

The server starts on `http://127.0.0.1:8000` by default. Open that URL in a
browser to use the visual simulator.

You can override the host and port:

```bash
python3 -m backend.api --host 0.0.0.0 --port 8080
```

## C Algorithm Engine

Because this is an OS lab style project, the backend uses C implementations for
integer page reference strings. The Python backend compiles the files in `c_src/`
to `build/page_simulator` automatically when needed.

Each replacement policy lives in its own C file:

- `c_src/fifo.c`
- `c_src/lru.c`
- `c_src/mru.c`
- `c_src/lfu.c`
- `c_src/mfu.c`
- `c_src/random.c`
- `c_src/optimal.c`
- `c_src/second_chance.c`

You can also build and run the C engine directly:

```bash
make c-engine
./build/page_simulator SECOND_CHANCE 3 7 0 1 2 0 3 0 4
```

The Python code only serves the API/frontend and converts the C simulator output
to JSON responses.

## API

### `GET /health`

Returns a simple health response.

### `GET /algorithms`

Returns the supported algorithms.

### `POST /simulate`

Request body:

```json
{
  "algorithm": "LRU",
  "frame_count": 3,
  "reference_string": [7, 0, 1, 2, 0, 3, 0, 4]
}
```

Response body includes per-step frame states and aggregate statistics:

```json
{
  "algorithm": "LRU",
  "frame_count": 3,
  "reference_string": [7, 0, 1, 2, 0, 3, 0, 4],
  "steps": [],
  "stats": {
    "references": 8,
    "hits": 2,
    "faults": 6,
    "hit_rate": 0.25,
    "fault_rate": 0.75
  }
}
```

## Run Tests

```bash
make test
```
