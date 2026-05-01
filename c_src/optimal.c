#include "page_simulator.h"

#include <stdlib.h>

static int next_use_distance(const int *references, int reference_count, int start, int page) {
    for (int i = start; i < reference_count; i++) {
        if (references[i] == page) {
            return i - start;
        }
    }
    return reference_count + 1;
}

void simulate_optimal(Simulation *sim) {
    int *frames = malloc(sizeof(int) * sim->frame_count);
    int loaded = 0;
    init_frames(frames, sim->frame_count);

    for (int i = 0; i < sim->reference_count; i++) {
        int page = sim->references[i];
        int hit = find_index(frames, sim->frame_count, page) != -1;
        int evicted = EMPTY_FRAME;

        if (!hit) {
            if (loaded < sim->frame_count) {
                frames[loaded++] = page;
            } else {
                int victim = 0;
                int victim_distance = next_use_distance(sim->references, sim->reference_count, i + 1, frames[0]);
                for (int j = 1; j < sim->frame_count; j++) {
                    int distance = next_use_distance(sim->references, sim->reference_count, i + 1, frames[j]);
                    if (distance > victim_distance) {
                        victim = j;
                        victim_distance = distance;
                    }
                }
                evicted = frames[victim];
                frames[victim] = page;
            }
        }

        record_step(sim, i, page, hit, evicted, -1, frames, NULL);
    }

    free(frames);
}
