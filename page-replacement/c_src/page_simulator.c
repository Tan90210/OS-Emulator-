#include "page_simulator.h"

#include <stdio.h>
#include <stdlib.h>

int main(int argc, char **argv) {
    if (argc < 3) {
        fprintf(stderr, "Usage: %s ALGORITHM FRAME_COUNT [PAGE ...]\n", argv[0]);
        return 2;
    }

    const char *algorithm = argv[1];
    int frame_count = atoi(argv[2]);
    int reference_count = argc - 3;
    if (frame_count <= 0) {
        fprintf(stderr, "FRAME_COUNT must be positive.\n");
        return 2;
    }

    Simulation sim;
    sim.algorithm = algorithm;
    sim.frame_count = frame_count;
    sim.reference_count = reference_count;
    sim.references = malloc(sizeof(int) * reference_count);
    sim.steps = calloc(reference_count, sizeof(Step));
    sim.hits = 0;
    sim.faults = 0;

    if (sim.references == NULL || sim.steps == NULL) {
        fprintf(stderr, "Failed to allocate simulation memory.\n");
        free_simulation(&sim);
        return 1;
    }

    for (int i = 0; i < reference_count; i++) {
        sim.references[i] = atoi(argv[i + 3]);
    }

    if (equals_algorithm(algorithm, "FIFO")) {
        simulate_fifo(&sim);
    } else if (equals_algorithm(algorithm, "LRU")) {
        simulate_lru(&sim);
    } else if (equals_algorithm(algorithm, "MRU")) {
        simulate_mru(&sim);
    } else if (equals_algorithm(algorithm, "LFU")) {
        simulate_lfu(&sim);
    } else if (equals_algorithm(algorithm, "MFU")) {
        simulate_mfu(&sim);
    } else if (equals_algorithm(algorithm, "RANDOM")) {
        simulate_random(&sim);
    } else if (equals_algorithm(algorithm, "OPTIMAL")) {
        simulate_optimal(&sim);
    } else if (equals_algorithm(algorithm, "SECOND_CHANCE")) {
        simulate_second_chance(&sim);
    } else {
        fprintf(stderr, "Unsupported algorithm: %s\n", algorithm);
        free_simulation(&sim);
        return 2;
    }

    print_json(&sim);
    free_simulation(&sim);
    return 0;
}
