#include <iostream>
#include <thread>
#include <atomic>
#include <vector>

using std::cout;
using std::endl;
using std::atomic;
using std::vector;
using std::thread;

const uint32_t MAX_LOOPS = 10000;
const uint32_t NUM_THREADS = 16;

/*  volatile is necessary if any use of the optimizer 
    is to be made.
*/
volatile uint32_t naked_int;
atomic<uint32_t> atomic_integer(0);

extern "C" void LoadLinkedStoreConditional(uint32_t * value);

void LLSCWorker() {
	extern volatile uint32_t naked_int;

	for (uint32_t i = 0; i < MAX_LOOPS; i++) {
		LoadLinkedStoreConditional((uint32_t *)&naked_int);
	}
}

void NakedWorker() {
    extern volatile uint32_t naked_int;

    for (uint32_t i = 0; i < MAX_LOOPS; i++) {
        naked_int++;
    }
}

void AtomicWorker() {
	extern atomic<uint32_t> atomic_integer;

	for (uint32_t i = 0; i < MAX_LOOPS; i++) {
		atomic_integer++;
	}
}

void DoNaked() {
	vector<thread *> threads;
    
    naked_int = 0;
	for (uint32_t i = 0; i < NUM_THREADS; i++) {
		threads.push_back(new thread(NakedWorker));
	}

	for (auto &t : threads) {
		t->join();
	}
}

void DoLLSC() {
	vector<thread *> threads;
    naked_int = 0;

	for (uint32_t i = 0; i < NUM_THREADS; i++) {
		threads.push_back(new thread(LLSCWorker));
	}

	for (auto &t : threads) {
		t->join();
	}
}

void DoAtomic() {
	vector<thread *> threads;

	for (uint32_t i = 0; i < NUM_THREADS; i++) {
		threads.push_back(new thread(AtomicWorker));
	}

	for (auto &t : threads) {
		t->join();
	}
}

int main() {

    DoNaked();
    DoAtomic();

	cout << "Correct sum is: ";
    cout << NUM_THREADS * MAX_LOOPS << endl;
    cout << "Naked sum: " << naked_int << endl;
	cout << "Atomic sum: " << atomic_integer << endl;

    DoLLSC();
	cout << "LLSC sum: " << naked_int << endl;
	return 0;
}
