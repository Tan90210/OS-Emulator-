CC ?= gcc
CFLAGS ?= -std=c11 -Wall -Wextra -O2
SIM_SOURCES := c_src/page_simulator.c c_src/common.c c_src/fifo.c c_src/lru.c c_src/mru.c c_src/lfu.c c_src/mfu.c c_src/random.c c_src/optimal.c c_src/second_chance.c

.PHONY: c-engine test clean

c-engine: build/page_simulator

build/page_simulator: $(SIM_SOURCES) c_src/page_simulator.h
	mkdir -p build
	$(CC) $(CFLAGS) -o build/page_simulator $(SIM_SOURCES)

test: c-engine
	python3 -m unittest discover -s tests

clean:
	rm -rf build
