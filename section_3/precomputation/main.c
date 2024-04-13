#include <stdio.h>

#define MIN     1
#define MAX     15

long Iterative(long n);
long Recursive(long n);
long Precomputed(long n);

extern long ifact(long);
extern long rfact(long);
extern long pfact(long);

int main() {
    long (*func[])(long) = {
        Iterative,
        Recursive,
        Precomputed,
        ifact,
        rfact,
        pfact,
        NULL
    };

    printf("%3s %13s %13s %13s\n", 
        "N", "Iterative", "Recursive", "Precomputed");

    for (long n = MIN; n <= MAX; n++) {
        printf("%3ld ", n);
        int i = 0;
        while (func[i] != NULL) {
            printf("%13ld ", (*func[i])(n));
            i++;
        }
        printf("\n");
    }

    return 0;
}

/*  Iterative() - this function computes the factorial of a long integer
    by  counting  down,  multiplying each time the value computed in the
    previous iteration.

    The maximum value of the parameter is NOT enforced here, having been
    checked by the calling function.
*/

long Iterative(long n) {
    long retval = 1;
    for (long i = 1; i <= n; i++) {
        retval *= i;
    }
    return retval;
}

/*  Recursive() - this function computes the factorial of a long integer
	recursively.  At each point, the current value of n in multiplied by
    the return value  of  calling  the function with its parameter being
    reduced by b1.

	The maximum value of the parameter is NOT enforced here, having been
	checked by the calling function.
*/

long Recursive(long n) {
    long retval;
    if (n <= 1)
        retval = 1;
    else
        retval = n * Recursive(n - 1);
        
    return retval;
}

long v[] = {
	1,
	1,
	2,
	6,
	24,
	120,
	720,
	5040,
	40320,
	362880,
	3628800,
	39916800,
	479001600,
	6227020800,
	87178291200,
	1307674368000
};

/*  Precomputed() - this  function  computes  the  factorial  of  a long
    integer using pre-computation. The values of  the  parameter over  a
    predefined  range  are computed  prior  to the  first  call  of  the
    factorial function.  These values  are stored in a table and fetched
    using the parameter as an index.

	The maximum value of the parameter is NOT enforced here, having been
	checked by the calling function.
*/

long Precomputed(long n) {
    if (n < 0 || n > 15)
        return 1;

	return v[n];
}
