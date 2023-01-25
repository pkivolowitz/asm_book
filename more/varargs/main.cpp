#include <iostream>
#include <iomanip>
#include <cinttypes>
#include <string>
#include <cstdarg>
#include <math.h>

using namespace std;

/*	va_start() and va_end() are MACROS not functions themselves. The implementation
	of these are architecture dependent. A common implementation is that va_start()
	takes the address of the last non-variadic variable which identifies where on
	the stack the following arguments can be found. The format string (or whatever)
	determines how to advance the pointer. Some architectures are quite complicated.

	For example, here is a comment from the implementation of va_start:
	//
 	* In GNU the stack is not necessarily arranged very neatly in order to
 	* pack shorts and such into a smaller argument list. Fortunately a
 	* neatly arranged version is available through the use of __builtin_next_arg.
 	//
*/

/*	Simple() - a first example of a variadic function in which all 
	parameters are assumed to be pointers to char.
*/

void Simple(uint32_t count, ...) {
	int digits_needed = (int) ceil(log10((double) count)) + 1;
	va_list args;
	va_start(args, count);
	for (uint32_t index = 0; index < count; index++) {
		cout << "Index: [" << setw(digits_needed) << index << "] " << va_arg(args, char *) << endl;
	}
	va_end(args);
}

/*	LessSimple() is a bit more like printf in that multiple data types are
	supported, passed in in a format string. This function is an important
	lesson in the types of data types that are supported by varargs.  Note
	that a float is passed as a double and char and short are passed by as
	ints. The patterns is that if a data type is automatically promotable,
	you must handle it as the highest level of promotion.

	For example, a char is an int so it must be handled like an int. Floats
	are automatically promotable to double, so they must be supported as 
	doubles. An int is not automatically promoted to long, so longs can
	be dealt with directly.
*/

void LessSimple(string fmt, ...) {
	va_list args;
	va_start(args, fmt);
	for (uint32_t index = 0; index < fmt.size(); index++) {
		switch (fmt.at(index)) {
			case 'i':
				cout << "i: " << va_arg(args, int64_t) << endl;
				break;
			case 'f':
				cout << "f: " << (float) va_arg(args, double) << endl;
				break;
			case 'd':
				cout << "d: " << va_arg(args, double) << endl;
				break;
			case 'c':
				cout << "c: " << (int8_t) va_arg(args, int32_t) << endl;
				break;
			case 's':
				cout << "s: " << (int16_t) va_arg(args, int32_t) << endl;
				break;
			default:
				break;
		}
	}
	va_end(args);
}

int main() {
	Simple(5, "Foo", "is", "a", "Variadic", "Function");
	Simple(13, "Foo", "is", "a", "Variadic", "Function", "which means", "it", "can", "take", "any", "number", "of", "args");
	LessSimple(string("ifdcs"), 99L, 4.4f, 4.4, 'c', (int16_t) 30000);
	return 0;
}
