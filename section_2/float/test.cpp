#include <cinttypes>

extern "C" uint32_t T1(double d) {
	return uint32_t(d);
}

extern "C" uint32_t T2(float f) {
	return uint32_t(f);
}

extern "C" int32_t T3(double d) {
	return int32_t(d);
}

extern "C" int32_t T4(float f) {
	return int32_t(f);
}

extern "C" uint64_t T5(double d) {
	return uint64_t(d);
}
