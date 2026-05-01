#ifndef PAGE_SIMULATOR_H
#define PAGE_SIMULATOR_H

#define EMPTY_FRAME -2147483647

typedef struct {
    int step;
    int page;
    int hit;
    int evicted;
    int pointer;
    int *frames;
    int *reference_bits;
} Step;

typedef struct {
    const char *algorithm;
    int frame_count;
    int reference_count;
    int *references;
    Step *steps;
    int hits;
    int faults;
} Simulation;

int equals_algorithm(const char *left, const char *right);
int find_index(const int *items, int count, int value);
void init_frames(int *frames, int frame_count);
void record_step(
    Simulation *sim,
    int index,
    int page,
    int hit,
    int evicted,
    int pointer,
    const int *frames,
    const int *reference_bits
);
void print_json(const Simulation *sim);
void free_simulation(Simulation *sim);

void simulate_fifo(Simulation *sim);
void simulate_lru(Simulation *sim);
void simulate_mru(Simulation *sim);
void simulate_lfu(Simulation *sim);
void simulate_mfu(Simulation *sim);
void simulate_random(Simulation *sim);
void simulate_optimal(Simulation *sim);
void simulate_second_chance(Simulation *sim);

#endif
