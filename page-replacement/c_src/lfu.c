#include "page_simulator.h"

#include <stdlib.h>

void simulate_lfu(Simulation *sim) {
    int *frames = malloc(sizeof(int) * sim->frame_count);
    int *frequency = malloc(sizeof(int) * sim->frame_count);
    int *loaded_at = malloc(sizeof(int) * sim->frame_count);
    int loaded = 0;
    init_frames(frames, sim->frame_count);

    for (int i = 0; i < sim->reference_count; i++) {
        int page = sim->references[i];
        int frame_index = find_index(frames, sim->frame_count, page);
        int hit = frame_index != -1;
        int evicted = EMPTY_FRAME;

        if (hit) {
            frequency[frame_index]++;
        } else if (loaded < sim->frame_count) {
            frames[loaded] = page;
            frequency[loaded] = 1;
            loaded_at[loaded] = i;
            loaded++;
        } else {
            int victim = 0;
            for (int j = 1; j < sim->frame_count; j++) {
                if (
                    frequency[j] < frequency[victim] ||
                    (frequency[j] == frequency[victim] && loaded_at[j] < loaded_at[victim])
                ) {
                    victim = j;
                }
            }
            evicted = frames[victim];
            frames[victim] = page;
            frequency[victim] = 1;
            loaded_at[victim] = i;
        }

        record_step(sim, i, page, hit, evicted, -1, frames, NULL);
    }

    free(frames);
    free(frequency);
    free(loaded_at);
}
