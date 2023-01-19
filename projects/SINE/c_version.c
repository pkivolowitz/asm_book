#include <stdio.h>
#include <stdlib.h>

double pi = 3.14159265359;

double D2R(double d) {
    return d * pi / 180.0;
}

long Factorial(int n) {
    long retval = 1;

    if (n > 0) {
        while (n > 1) {
            retval = retval * n--;
        }
    }
    return retval;
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

    for (int term = 0, base = 1; term < terms; term++, base += 2) {
        double toggle = (term & 1) ? -1.0 : 1.0;

		sin += toggle *
			   IntegerPower(r_angle, base) / Factorial(base);
        /*
		if (toggle > 0) {
			printf("adding      %d p/b intermediate: %f\n", base, sin);
		} else {
			printf("subtracting %d p/b intermediate: %f\n", base, sin);
		}
        */
	}
	printf("The sine of %.2f degrees is %f in radians.\n", angle, sin);

    return 0;
}