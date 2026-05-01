#include "page_simulator.h"
#include <time.h>

#include <stdlib.h>

void simulate_random(Simulation *sim) {
    int *frames = malloc(sizeof(int) * sim->frame_count);
    int loaded = 0;
    init_frames(frames, sim->frame_count);
    srand(time(NULL));   

    for (int i = 0; i < sim->reference_count; i++) {
        int page = sim->references[i];
        int hit = find_index(frames, sim->frame_count, page) != -1;
        int evicted = EMPTY_FRAME;

        if (!hit) {
            if (loaded < sim->frame_count) {
                frames[loaded++] = page;
            } else {
                int victim = rand() % sim->frame_count;
                evicted = frames[victim];
                frames[victim] = page;
            }
        }

        record_step(sim, i, page, hit, evicted, -1, frames, NULL);
    }

    free(frames);
}
