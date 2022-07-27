#include <iostream>
#include <cinttypes>
#include <iomanip>
#include <cmath>
#include <string>

using namespace std;

union U {
	float f;
	uint32_t i;
};

int main(int argc, char ** argv) {
	U u;
	int e;
	
	cout << "Enter a number (-100 causes divide by 0, -200 causes sqrt(-1): ";
	cin >> u.f;
	if (u.f == -100) {
		cout << "Dividing by zero." << endl;
		u.f /= 0.0;
	} else if (u.f == -200) {
		cout << "Using sqrt(-1))." << endl;
		u.f = sqrtf(-1);
	}
	e = ((u.i >> 23) & 0xFF);
	cout << "sign: " << hex << ((u.i >> 31) & 0x01) << endl;
	cout << "exp:  " << hex << e << " debiased: " << dec << e - 127 << endl;
	cout << "frac: " << hex << setw(7) << setfill('0') << (u.i & 0x7FFFFF) << endl;
	cout << "NaN:  " << isnan(u.f) << endl;
	cout << "Inf:  " << isinf(u.f) << endl;
	return 0;
}