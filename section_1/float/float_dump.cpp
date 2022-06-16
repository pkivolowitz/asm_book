/*	Perry Kivolowitz
	Professor and Chair of Computer Science
	Carthage College
*/

#include <iostream>
#include <iomanip>
#include <string>
#include <sstream>
#include <cstdlib>
#include <cmath>

using namespace std;

const int FRAC_SIZD = 52;
const int FRAC_SIZF = 23;

const int EXPO_SIZD = 11;
const int EXPO_SIZF = 8;

const int SIGN_SIZE = 1;

struct SP {
	unsigned int frac : FRAC_SIZF;
	unsigned int expo : EXPO_SIZF;
	unsigned int sign : SIGN_SIZE;
};

struct DP {
	unsigned long frac : FRAC_SIZD;
	unsigned long expo : EXPO_SIZD;
	unsigned long sign : SIGN_SIZE;
};

union Double {
	double d;
	DP D;
};

union Single {
	float f;
	SP F;
};

double DeBinary(bool is_double, unsigned long frac) {
	double f = 0.0f;
	int bits = (is_double ? FRAC_SIZD : FRAC_SIZF);

	for (int i = 0; i < bits; i++) {
		if (frac & ((unsigned long)1 << (bits - 1 - i))) {
			f += 1.0f / double(1 << (i + 1));
		}
	}
	return f;
}

template<class T>
string MakeEquation(T & u, int bias) {
	stringstream ss;
	bool is_double = (bias == 1023);
	ss << (u.sign ? "-" : "") << 1.0 + DeBinary(is_double, u.frac) << " x 2^" << (u.expo - bias);
	return ss.str();
}

int main(int argc, char ** argv) {
	Double d;
	Single  f;

	const int fore_space = 20;
	const int field_space = 25;

	if (argc < 2) {
		cerr << "Must supply a floating point value as a command line argument.\n";
		return 1;
	}
	d.d = atof(argv[1]);
	f.f = float(d.d);

	cout << left << setw(fore_space) << "Component" << left << setw(25) << "Double";
	cout << left << setw(field_space) << "Float" << "Comment" << endl;

	cout << left << setw(fore_space) << "Value:" << setw(25) << setprecision(10) << d.d;
	cout << setw(field_space) << setprecision(10) << f.f;
	cout << "Delta(F - D): " << setw(16) << setprecision(10) << f.f - d.d << endl;

	cout << left << setw(fore_space) << "Sign:";
	cout << setw(field_space) << (bool)d.D.sign;
	cout << setw(field_space) << (bool)f.F.sign;
	cout << endl;

	cout << setw(fore_space) << "Exponent (hex):";
	cout << setw(field_space) << hex << d.D.expo;
	cout << setw(field_space) << hex << f.F.expo;
	cout << endl;

	cout << setw(fore_space) << "De-biased (dec):";
	cout << setw(field_space) << dec << d.D.expo - 1023;
	cout << setw(field_space) << dec << f.F.expo - 127;
	cout << endl;

	cout << setw(fore_space) << "Fraction (hex):";
	cout << setw(field_space) << hex << d.D.frac;
	cout << setw(field_space) << hex << f.F.frac;
	cout << endl;

	cout << setw(fore_space) << "Halves:";
	cout << setw(field_space) << hex << ((d.D.frac >> (FRAC_SIZD - 1)) & 1);
	cout << setw(field_space) << hex << ((f.F.frac >> (FRAC_SIZF - 1)) & 1);
	cout << endl;

	cout << setw(fore_space) << "Quarters:";
	cout << setw(field_space) << hex << ((d.D.frac >> (FRAC_SIZD - 2)) & 1);
	cout << setw(field_space) << hex << ((f.F.frac >> (FRAC_SIZF - 2)) & 1);
	cout << endl;

	cout << setw(fore_space) << "Eighths:";
	cout << setw(field_space) << hex << ((d.D.frac >> (FRAC_SIZD - 3)) & 1);
	cout << setw(field_space) << hex << ((f.F.frac >> (FRAC_SIZF - 3)) & 1);
	cout << endl;

	cout << setw(fore_space) << "Sixteenths:";
	cout << setw(field_space) << hex << ((d.D.frac >> (FRAC_SIZD - 4)) & 1);
	cout << setw(field_space) << hex << ((f.F.frac >> (FRAC_SIZF - 4)) & 1);
	cout << endl;

	cout << setw(fore_space) << "Thirty seconds:";
	cout << setw(field_space) << hex << ((d.D.frac >> (FRAC_SIZD - 5)) & 1);
	cout << setw(field_space) << hex << ((f.F.frac >> (FRAC_SIZF - 5)) & 1);
	cout << endl;

	cout << setw(fore_space) << "Full fraction:";
	cout << setw(field_space) << dec << DeBinary(true,  d.D.frac);
	cout << setw(field_space) << dec << DeBinary(false, f.F.frac);
	cout << endl;

	cout << setw(fore_space) << "Equation:";
	cout << setw(field_space) << dec << MakeEquation<DP>(d.D, 1023);
	cout << setw(field_space) << dec << MakeEquation<SP>(f.F, 127);
	cout << endl;

	return 0;
}