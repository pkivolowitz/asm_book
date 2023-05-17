#include <stdio.h>

class TestClass {
    public:
    void SetString(char * s);
    char * GetString();
    private:
    char * _s = nullptr;
};

void TestClass::SetString(char * s) {
    _s = s;
    printf("String set to: %s\n", _s);
}

char * TestClass::GetString() {
    return _s;
}

char * test_string = (char *) "Test String";

TestClass tc;

int main() {
    tc.SetString(test_string);
    printf("Stored string is: %s\n", tc.GetString());
    return 0;
}
