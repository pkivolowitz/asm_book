#include <iostream>
#include <iomanip>
#include <cmath>

using namespace std;

template <typename T>
int RoundAwayFromZero(T x) {
	return int((x < 0) ? floor(x) : ceil(x));
}

int main() {
	int32_t iv;
	float fv = 5.1;

	iv = (int(fv) == fv) ? int(fv) : int(fv) + ((fv < 0) ? -1 : 1);
	cout << setw(4) << fv << " away from zero (should be  6):  ";
	cout << iv << endl;
	fv = -fv;
	iv = (int(fv) == fv) ? int(fv) : int(fv) + ((fv < 0) ? -1 : 1);
	cout << setw(4) << fv << " away from zero (should be -6): ";
	cout << iv << endl;
	cout << endl;
	cout << "Using MyRound()\n";
	fv = -fv;
	iv = RoundAwayFromZero(fv);
	cout << setw(4) << fv << " away from zero (should be  6):  ";
	cout << iv << endl;
	fv = -fv;
	iv = RoundAwayFromZero(fv);
	cout << setw(4) << fv << " away from zero (should be -6): ";
	cout << iv << endl;

	return 0;
}