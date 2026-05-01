#include "page_simulator.h"

#include <stdlib.h>

void simulate_second_chance(Simulation *sim) {
    int *frames = malloc(sizeof(int) * sim->frame_count);
    int *reference_bits = malloc(sizeof(int) * sim->frame_count);
    int pointer = 0;
    init_frames(frames, sim->frame_count);
    for (int i = 0; i < sim->frame_count; i++) {
        reference_bits[i] = 0;
    }

    for (int i = 0; i < sim->reference_count; i++) {
        int page = sim->references[i];
        int frame_index = find_index(frames, sim->frame_count, page);
        int hit = frame_index != -1;
        int evicted = EMPTY_FRAME;

        if (hit) {
            reference_bits[frame_index] = 1;
        } else {
            while (frames[pointer] != EMPTY_FRAME && reference_bits[pointer] == 1) {
                reference_bits[pointer] = 0;
                pointer = (pointer + 1) % sim->frame_count;
            }
            evicted = frames[pointer];
            frames[pointer] = page;
            reference_bits[pointer] = 1;
            pointer = (pointer + 1) % sim->frame_count;
        }

        record_step(sim, i, page, hit, evicted, pointer, frames, reference_bits);
    }

    free(frames);
    free(reference_bits);
}
