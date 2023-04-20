#include <iostream>
#include <thread>
#include <vector>
#include <chrono>

using namespace std;

extern "C" void Lock(int32_t *);
extern "C" void Unlock(int32_t *);

int32_t lock_variable = 0;
const uint32_t NUM_THREADS = 16;

void Worker(int32_t id) {
    int32_t counter = 0;
    while (counter < 4) {
        Lock(&lock_variable);
        counter++;
        cout << "thread: " << id << " counter: " << counter << endl;
        std::this_thread::sleep_for(chrono::milliseconds(5));
        Unlock(&lock_variable);
        sched_yield();
    }
}

int main() {
    vector<thread *> threads;

    for (uint32_t i = 0; i < NUM_THREADS; i++) {
        threads.push_back(new thread(Worker, i));
    }

    for (auto & t : threads)
        t->join();
    
    return 0;
}
