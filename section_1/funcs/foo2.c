#include <stdio.h>

struct Foo {
	int a[256];
};

struct Foo FooMaker() {
	struct Foo f;
	for (int i = 0; i < 256; i++) {
		f.a[i] = i;
	}
	return f;
}

void CallFooMaker() {
	struct Foo f = FooMaker();
	printf("%d\n", f.a[0]);
}
