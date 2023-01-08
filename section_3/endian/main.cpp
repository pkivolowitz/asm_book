/*  Determine Endianness
    Perry Kivolowitz
    Carthage College
*/

#include <iostream>
#include <iomanip>
#include <sstream>
#include <cinttypes>
#include <string>

using namespace std;

template <class T>
string Dump(T & i) {
    stringstream ss;
    unsigned char * p = reinterpret_cast<unsigned char *>(&i);

    ss << hex << setfill('0');
    for (uint32_t counter = 0; counter < sizeof(T); counter++) {
        ss << setw(2) << static_cast<int>(*(p++));
    }
    return ss.str();
}

int main() {
    int16_t i16 = 0x0123;
    int32_t i32 = 0x01234567;
    int64_t i64 = 0x0123456789ABCDEF;

    cout << hex << setfill('0');
    cout << "Endianness of this computer:\n";
    cout << "i16: " << setw(16) << Dump(i16) << " value: " << setw(16) << i16 << endl;
    cout << "i32: " << setw(16) << Dump(i32) << " value: " << setw(16) << i32 << endl;
    cout << "i64: " << setw(16) << Dump(i64) << " value: " << setw(16) << i64 << endl;
    cout << "If little endian, column 1 will not equal column 2.\n";
    return 0;
}
