#include <stdio.h>
#include <stdlib.h>
#include <math.h>

double pi = 3.14159265358979323846;

double D2R(double d) {
    return d * pi / 180.0;
}

double Factorial(int n) {
    long retval = 1;

    if (n > 0) {
        while (n > 1) {
            retval = retval * n--;
        }
    }
    return (double) retval;
}

double IntegerPower(double b, int e) {
    double retval = 1.0;
    if (e > 0) {
        while (e > 0) {
            retval = retval * b;
            e--;
        }
    }
    return retval;
}


int main(int argc, char ** argv) {
    double sin = 0.0;

	if (argc != 3) {
		fprintf(stderr, "Two numerical arguments must be given.\n");
        return 1;
	}

	double angle = atof(argv[1]);
    int terms = atoi(argv[2]);

    if (terms < 1 || terms > 10) {
        fprintf(stderr, "Number of terms is out of range.\n");
        return 1;
    }

    double r_angle = D2R(angle);

    double toggle = 1.0;
    for (int term = 0, base = 1; term < terms; term++, base += 2) {
		if (toggle > 0) {
			printf("%+03.8e + %+03.8e / %+03.8e [term %2d is %+03.8e]\n", sin, IntegerPower(r_angle, base),
				   Factorial(base), term + 1, toggle * IntegerPower(r_angle, base) / Factorial(base));
		} else {
			printf("%+03.8e - %+03.8e / %+03.8e [term %2d is %+03.8e]\n", sin, IntegerPower(r_angle, base),
				   Factorial(base), term + 1, toggle * IntegerPower(r_angle, base) / Factorial(base));
		}
		sin += toggle *
			   IntegerPower(r_angle, base) / Factorial(base);
        toggle = toggle * -1;
	}
	printf("The sine of %0.4f degrees is %0.10f.\n", angle, sin);

    return 0;
}