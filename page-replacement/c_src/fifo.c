#include "page_simulator.h"

#include <stdlib.h>

void simulate_fifo(Simulation *sim) {
    int *frames = malloc(sizeof(int) * sim->frame_count);
    int *queue = malloc(sizeof(int) * sim->frame_count);
    int loaded = 0;
    int queue_start = 0;
    int queue_size = 0;
    init_frames(frames, sim->frame_count);

    for (int i = 0; i < sim->reference_count; i++) {
        int page = sim->references[i];
        int hit = find_index(frames, sim->frame_count, page) != -1;
        int evicted = EMPTY_FRAME;

        if (!hit) {
            if (loaded < sim->frame_count) {
                frames[loaded++] = page;
            } else {
                evicted = queue[queue_start];
                queue_start = (queue_start + 1) % sim->frame_count;
                queue_size--;
                frames[find_index(frames, sim->frame_count, evicted)] = page;
            }
            queue[(queue_start + queue_size) % sim->frame_count] = page;
            queue_size++;
        }

        record_step(sim, i, page, hit, evicted, -1, frames, NULL);
    }

    free(frames);
    free(queue);
}
