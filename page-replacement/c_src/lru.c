#include "page_simulator.h"

#include <stdlib.h>

void simulate_lru(Simulation *sim) {
    int *frames = malloc(sizeof(int) * sim->frame_count);
    int *last_used = malloc(sizeof(int) * sim->frame_count);
    int loaded = 0;
    init_frames(frames, sim->frame_count);

    for (int i = 0; i < sim->reference_count; i++) {
        int page = sim->references[i];
        int frame_index = find_index(frames, sim->frame_count, page);
        int hit = frame_index != -1;
        int evicted = EMPTY_FRAME;

        if (hit) {
            last_used[frame_index] = i;
        } else if (loaded < sim->frame_count) {
            frames[loaded] = page;
            last_used[loaded] = i;
            loaded++;
        } else {
            int victim = 0;
            for (int j = 1; j < sim->frame_count; j++) {
                if (last_used[j] < last_used[victim]) {
                    victim = j;
                }
            }
            evicted = frames[victim];
            frames[victim] = page;
            last_used[victim] = i;
        }

        record_step(sim, i, page, hit, evicted, -1, frames, NULL);
    }

    free(frames);
    free(last_used);
}
