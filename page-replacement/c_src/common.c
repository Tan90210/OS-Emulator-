#include "page_simulator.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int equals_algorithm(const char *left, const char *right) {
    return strcmp(left, right) == 0;
}

int find_index(const int *items, int count, int value) {
    for (int i = 0; i < count; i++) {
        if (items[i] == value) {
            return i;
        }
    }
    return -1;
}

void init_frames(int *frames, int frame_count) {
    for (int i = 0; i < frame_count; i++) {
        frames[i] = EMPTY_FRAME;
    }
}

static void copy_frames(Step *step, const int *frames, int frame_count) {
    step->frames = malloc(sizeof(int) * frame_count);
    if (step->frames == NULL) {
        fprintf(stderr, "Failed to allocate frame snapshot.\n");
        exit(1);
    }
    for (int i = 0; i < frame_count; i++) {
        step->frames[i] = frames[i];
    }
}

static void copy_bits(Step *step, const int *bits, int frame_count) {
    step->reference_bits = malloc(sizeof(int) * frame_count);
    if (step->reference_bits == NULL) {
        fprintf(stderr, "Failed to allocate reference bit snapshot.\n");
        exit(1);
    }
    for (int i = 0; i < frame_count; i++) {
        step->reference_bits[i] = bits[i];
    }
}

void record_step(
    Simulation *sim,
    int index,
    int page,
    int hit,
    int evicted,
    int pointer,
    const int *frames,
    const int *reference_bits
) {
    Step *step = &sim->steps[index];
    step->step = index;
    step->page = page;
    step->hit = hit;
    step->evicted = evicted;
    step->pointer = pointer;
    copy_frames(step, frames, sim->frame_count);
    if (reference_bits != NULL) {
        copy_bits(step, reference_bits, sim->frame_count);
    } else {
        step->reference_bits = NULL;
    }
    if (hit) {
        sim->hits++;
    } else {
        sim->faults++;
    }
}

static void print_nullable_int(int value) {
    if (value == EMPTY_FRAME) {
        printf("null");
    } else {
        printf("%d", value);
    }
}

void print_json(const Simulation *sim) {
    double hit_rate = sim->reference_count == 0 ? 0.0 : (double)sim->hits / sim->reference_count;
    double fault_rate = sim->reference_count == 0 ? 0.0 : (double)sim->faults / sim->reference_count;

    printf("{\"algorithm\":\"%s\",\"frame_count\":%d,\"reference_string\":[", sim->algorithm, sim->frame_count);
    for (int i = 0; i < sim->reference_count; i++) {
        if (i > 0) {
            printf(",");
        }
        printf("%d", sim->references[i]);
    }
    printf("],\"steps\":[");

    for (int i = 0; i < sim->reference_count; i++) {
        const Step *step = &sim->steps[i];
        if (i > 0) {
            printf(",");
        }
        printf("{\"step\":%d,\"page\":%d,\"hit\":%s,\"fault\":%s,\"frames\":[",
            step->step,
            step->page,
            step->hit ? "true" : "false",
            step->hit ? "false" : "true"
        );
        for (int j = 0; j < sim->frame_count; j++) {
            if (j > 0) {
                printf(",");
            }
            print_nullable_int(step->frames[j]);
        }
        printf("],\"evicted\":");
        print_nullable_int(step->evicted);
        printf(",\"pointer\":");
        if (step->pointer < 0) {
            printf("null");
        } else {
            printf("%d", step->pointer);
        }
        printf(",\"reference_bits\":");
        if (step->reference_bits == NULL) {
            printf("null");
        } else {
            printf("[");
            for (int j = 0; j < sim->frame_count; j++) {
                if (j > 0) {
                    printf(",");
                }
                printf("%d", step->reference_bits[j]);
            }
            printf("]");
        }
        printf("}");
    }

    printf("],\"stats\":{\"references\":%d,\"hits\":%d,\"faults\":%d,\"hit_rate\":%.4f,\"fault_rate\":%.4f}}\n",
        sim->reference_count,
        sim->hits,
        sim->faults,
        hit_rate,
        fault_rate
    );
}

void free_simulation(Simulation *sim) {
    if (sim->steps != NULL) {
        for (int i = 0; i < sim->reference_count; i++) {
            free(sim->steps[i].frames);
            free(sim->steps[i].reference_bits);
        }
    }
    free(sim->steps);
    free(sim->references);
}
