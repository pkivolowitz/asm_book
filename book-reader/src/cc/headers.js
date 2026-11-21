// System headers for the in-browser C toolchain. They declare exactly what
// the simulator's C library (src/simulator/libc.js) implements, plus a few
// functions written in C in PRELUDE below.

const H = {};

H['stddef.h'] = `#ifndef _STDDEF_H
#define _STDDEF_H
typedef unsigned long size_t;
typedef long ptrdiff_t;
typedef int wchar_t;
typedef long max_align_t;
#define NULL ((void *)0)
#define offsetof(type, member) ((size_t)&(((type *)0)->member))
#endif
`;

H['stdbool.h'] = `#ifndef _STDBOOL_H
#define _STDBOOL_H
#define bool _Bool
#define true 1
#define false 0
#define __bool_true_false_are_defined 1
#endif
`;

H['stdint.h'] = `#ifndef _STDINT_H
#define _STDINT_H
typedef signed char int8_t;
typedef short int16_t;
typedef int int32_t;
typedef long int64_t;
typedef unsigned char uint8_t;
typedef unsigned short uint16_t;
typedef unsigned int uint32_t;
typedef unsigned long uint64_t;
typedef long intptr_t;
typedef unsigned long uintptr_t;
typedef long intmax_t;
typedef unsigned long uintmax_t;
#define INT8_MIN (-128)
#define INT8_MAX 127
#define UINT8_MAX 255
#define INT16_MIN (-32768)
#define INT16_MAX 32767
#define UINT16_MAX 65535
#define INT32_MIN (-2147483647-1)
#define INT32_MAX 2147483647
#define UINT32_MAX 4294967295U
#define INT64_MIN (-9223372036854775807L-1)
#define INT64_MAX 9223372036854775807L
#define UINT64_MAX 18446744073709551615UL
#define SIZE_MAX 18446744073709551615UL
#define INTPTR_MAX INT64_MAX
#define UINTPTR_MAX UINT64_MAX
#endif
`;

H['inttypes.h'] = `#ifndef _INTTYPES_H
#define _INTTYPES_H
#include <stdint.h>
#define PRId8 "d"
#define PRId16 "d"
#define PRId32 "d"
#define PRId64 "ld"
#define PRIu8 "u"
#define PRIu16 "u"
#define PRIu32 "u"
#define PRIu64 "lu"
#define PRIx8 "x"
#define PRIx16 "x"
#define PRIx32 "x"
#define PRIx64 "lx"
#define PRIX32 "X"
#define PRIX64 "lX"
#endif
`;

H['limits.h'] = `#ifndef _LIMITS_H
#define _LIMITS_H
#define CHAR_BIT 8
#define SCHAR_MIN (-128)
#define SCHAR_MAX 127
#define UCHAR_MAX 255
#define CHAR_MIN 0
#define CHAR_MAX 255
#define SHRT_MIN (-32768)
#define SHRT_MAX 32767
#define USHRT_MAX 65535
#define INT_MIN (-2147483647-1)
#define INT_MAX 2147483647
#define UINT_MAX 4294967295U
#define LONG_MIN (-9223372036854775807L-1)
#define LONG_MAX 9223372036854775807L
#define ULONG_MAX 18446744073709551615UL
#define LLONG_MIN LONG_MIN
#define LLONG_MAX LONG_MAX
#define ULLONG_MAX ULONG_MAX
#define PATH_MAX 4096
#endif
`;

H['float.h'] = `#ifndef _FLOAT_H
#define _FLOAT_H
#define FLT_EPSILON 1.19209290e-7F
#define DBL_EPSILON 2.2204460492503131e-16
#define FLT_MAX 3.40282347e+38F
#define DBL_MAX 1.7976931348623157e+308
#define FLT_MIN 1.17549435e-38F
#define DBL_MIN 2.2250738585072014e-308
#define FLT_DIG 6
#define DBL_DIG 15
#endif
`;

H['stdarg.h'] = `#ifndef _STDARG_H
#define _STDARG_H
#error "user-defined variadic functions (va_list) are not supported by this simulator's compiler yet"
#endif
`;

H['errno.h'] = `#ifndef _ERRNO_H
#define _ERRNO_H
int *__errno_location(void);
#define errno (*__errno_location())
#define EPERM 1
#define ENOENT 2
#define EINTR 4
#define EIO 5
#define EBADF 9
#define EAGAIN 11
#define ENOMEM 12
#define EACCES 13
#define EFAULT 14
#define EEXIST 17
#define ENOTDIR 20
#define EISDIR 21
#define EINVAL 22
#define EMFILE 24
#define ENOSPC 28
#define ESPIPE 29
#define ERANGE 34
#define ENOSYS 38
#endif
`;

H['stdio.h'] = `#ifndef _STDIO_H
#define _STDIO_H
#include <stddef.h>
typedef struct _IO_FILE FILE;
#define stdin  ((FILE *)0x7A1000)
#define stdout ((FILE *)0x7A1010)
#define stderr ((FILE *)0x7A1020)
#define EOF (-1)
#define BUFSIZ 8192
#define SEEK_SET 0
#define SEEK_CUR 1
#define SEEK_END 2
#define _IONBF 2
#define _IOLBF 1
#define _IOFBF 0
int printf(const char *fmt, ...);
int fprintf(FILE *stream, const char *fmt, ...);
int sprintf(char *str, const char *fmt, ...);
int snprintf(char *str, size_t size, const char *fmt, ...);
int scanf(const char *fmt, ...);
int sscanf(const char *str, const char *fmt, ...);
int fscanf(FILE *stream, const char *fmt, ...);
int puts(const char *s);
int fputs(const char *s, FILE *stream);
int putchar(int c);
int fputc(int c, FILE *stream);
int putc(int c, FILE *stream);
int getchar(void);
int fgetc(FILE *stream);
int getc(FILE *stream);
int ungetc(int c, FILE *stream);
char *fgets(char *s, int size, FILE *stream);
FILE *fopen(const char *path, const char *mode);
int fclose(FILE *stream);
size_t fread(void *ptr, size_t size, size_t nmemb, FILE *stream);
size_t fwrite(const void *ptr, size_t size, size_t nmemb, FILE *stream);
int fflush(FILE *stream);
int feof(FILE *stream);
int ferror(FILE *stream);
void clearerr(FILE *stream);
int fseek(FILE *stream, long offset, int whence);
long ftell(FILE *stream);
void rewind(FILE *stream);
int fileno(FILE *stream);
void perror(const char *s);
int remove(const char *path);
int rename(const char *oldpath, const char *newpath);
int setvbuf(FILE *stream, char *buf, int mode, size_t size);
#endif
`;

H['stdlib.h'] = `#ifndef _STDLIB_H
#define _STDLIB_H
#include <stddef.h>
#define EXIT_SUCCESS 0
#define EXIT_FAILURE 1
#define RAND_MAX 2147483647
void *malloc(size_t size);
void *calloc(size_t nmemb, size_t size);
void *realloc(void *ptr, size_t size);
void free(void *ptr);
void exit(int status);
void _exit(int status);
void abort(void);
int atoi(const char *s);
long atol(const char *s);
long long atoll(const char *s);
double atof(const char *s);
long strtol(const char *s, char **end, int base);
unsigned long strtoul(const char *s, char **end, int base);
long long strtoll(const char *s, char **end, int base);
unsigned long long strtoull(const char *s, char **end, int base);
double strtod(const char *s, char **end);
int abs(int x);
long labs(long x);
long long llabs(long long x);
int rand(void);
void srand(unsigned int seed);
char *getenv(const char *name);
int system(const char *cmd);
void qsort(void *base, size_t nmemb, size_t size, int (*compar)(const void *, const void *));
void *bsearch(const void *key, const void *base, size_t nmemb, size_t size, int (*compar)(const void *, const void *));
#endif
`;

H['string.h'] = `#ifndef _STRING_H
#define _STRING_H
#include <stddef.h>
size_t strlen(const char *s);
size_t strnlen(const char *s, size_t maxlen);
char *strcpy(char *dst, const char *src);
char *strncpy(char *dst, const char *src, size_t n);
char *strcat(char *dst, const char *src);
char *strncat(char *dst, const char *src, size_t n);
int strcmp(const char *a, const char *b);
int strncmp(const char *a, const char *b, size_t n);
int strcasecmp(const char *a, const char *b);
char *strchr(const char *s, int c);
char *strrchr(const char *s, int c);
char *strstr(const char *hay, const char *needle);
char *strdup(const char *s);
char *strndup(const char *s, size_t n);
size_t strspn(const char *s, const char *accept);
size_t strcspn(const char *s, const char *reject);
char *strtok(char *s, const char *delim);
char *strerror(int errnum);
void *memcpy(void *dst, const void *src, size_t n);
void *memmove(void *dst, const void *src, size_t n);
void *memset(void *s, int c, size_t n);
int memcmp(const void *a, const void *b, size_t n);
void *memchr(const void *s, int c, size_t n);
#endif
`;

H['strings.h'] = `#include <string.h>
`;

H['ctype.h'] = `#ifndef _CTYPE_H
#define _CTYPE_H
int isdigit(int c);
int isalpha(int c);
int isalnum(int c);
int isspace(int c);
int isupper(int c);
int islower(int c);
int isxdigit(int c);
int isprint(int c);
int ispunct(int c);
int iscntrl(int c);
int toupper(int c);
int tolower(int c);
#endif
`;

H['math.h'] = `#ifndef _MATH_H
#define _MATH_H
#define M_PI 3.14159265358979323846
#define M_E 2.7182818284590452354
#define INFINITY (1.0/0.0)
#define NAN (0.0/0.0)
double sqrt(double x);
double pow(double x, double y);
double fabs(double x);
double floor(double x);
double ceil(double x);
double round(double x);
double trunc(double x);
double fmod(double x, double y);
double sin(double x);
double cos(double x);
double tan(double x);
double exp(double x);
double log(double x);
double log10(double x);
double log2(double x);
#endif
`;

H['assert.h'] = `#undef assert
#ifdef NDEBUG
#define assert(e) ((void)0)
#else
void __assert_fail(const char *expr, const char *file, int line, const char *func);
#define assert(e) ((e) ? (void)0 : __assert_fail(#e, __FILE__, __LINE__, __func__))
#endif
`;

H['time.h'] = `#ifndef _TIME_H
#define _TIME_H
#include <stddef.h>
typedef long time_t;
typedef long clock_t;
#define CLOCKS_PER_SEC 1000000L
time_t time(time_t *t);
clock_t clock(void);
#endif
`;

H['sys/types.h'] = `#ifndef _SYS_TYPES_H
#define _SYS_TYPES_H
#include <stddef.h>
typedef long ssize_t;
typedef long off_t;
typedef unsigned int mode_t;
typedef int pid_t;
typedef unsigned int uid_t;
typedef unsigned int gid_t;
#endif
`;

H['unistd.h'] = `#ifndef _UNISTD_H
#define _UNISTD_H
#include <sys/types.h>
#define STDIN_FILENO 0
#define STDOUT_FILENO 1
#define STDERR_FILENO 2
#define F_OK 0
#define R_OK 4
#define W_OK 2
#define X_OK 1
ssize_t read(int fd, void *buf, size_t count);
ssize_t write(int fd, const void *buf, size_t count);
int close(int fd);
off_t lseek(int fd, off_t offset, int whence);
int unlink(const char *path);
int access(const char *path, int mode);
pid_t getpid(void);
uid_t getuid(void);
unsigned int sleep(unsigned int seconds);
int usleep(unsigned int usec);
extern char *optarg;
extern int optind, opterr, optopt;
int getopt(int argc, char *const argv[], const char *optstring);
#endif
`;

H['fcntl.h'] = `#ifndef _FCNTL_H
#define _FCNTL_H
#include <sys/types.h>
#define O_RDONLY 0
#define O_WRONLY 1
#define O_RDWR 2
#define O_CREAT 0100
#define O_EXCL 0200
#define O_TRUNC 01000
#define O_APPEND 02000
#define S_IRWXU 0700
#define S_IRUSR 0400
#define S_IWUSR 0200
#define S_IXUSR 0100
#define S_IRGRP 040
#define S_IWGRP 020
#define S_IROTH 04
#define S_IWOTH 02
int open(const char *path, int flags, ...);
#endif
`;

H['sys/stat.h'] = `#ifndef _SYS_STAT_H
#define _SYS_STAT_H
#include <sys/types.h>
struct timespec { long tv_sec; long tv_nsec; };
struct stat {
  unsigned long st_dev;
  unsigned long st_ino;
  unsigned int st_mode;
  unsigned int st_nlink;
  unsigned int st_uid;
  unsigned int st_gid;
  unsigned long st_rdev;
  unsigned long __pad1;
  long st_size;
  int st_blksize;
  int __pad2;
  long st_blocks;
  struct timespec st_atim;
  struct timespec st_mtim;
  struct timespec st_ctim;
  unsigned int __unused[2];
};
#define S_IFMT 0170000
#define S_IFREG 0100000
#define S_IFDIR 0040000
#define S_ISREG(m) (((m) & S_IFMT) == S_IFREG)
#define S_ISDIR(m) (((m) & S_IFMT) == S_IFDIR)
#define S_IRUSR 0400
#define S_IWUSR 0200
int fstat(int fd, struct stat *st);
int stat(const char *path, struct stat *st);
#endif
`;

export const SYSTEM_HEADERS = H;

// Library functions implemented in C (they need to call back into user code).
export const PRELUDE = String.raw`#include <stddef.h>
#include <stdio.h>
#include <string.h>
char *optarg;
int optind = 1, opterr = 1, optopt;
static int __optpos = 1;
int getopt(int argc, char *const argv[], const char *optstring) {
  optarg = NULL;
  if (optind >= argc || argv[optind] == NULL || argv[optind][0] != '-' || argv[optind][1] == '\0') return -1;
  if (strcmp(argv[optind], "--") == 0) { optind++; return -1; }
  int c = argv[optind][__optpos];
  const char *spec = strchr(optstring, c);
  if (spec == NULL || c == ':') {
    optopt = c;
    if (opterr && optstring[0] != ':') fprintf(stderr, "%s: invalid option -- '%c'\n", argv[0], c);
    if (argv[optind][++__optpos] == '\0') { optind++; __optpos = 1; }
    return '?';
  }
  if (spec[1] == ':') {
    if (argv[optind][__optpos + 1] != '\0') optarg = &argv[optind][__optpos + 1];
    else if (optind + 1 < argc) optarg = argv[++optind];
    else {
      optopt = c; optind++; __optpos = 1;
      if (opterr && optstring[0] != ':') fprintf(stderr, "%s: option requires an argument -- '%c'\n", argv[0], c);
      return optstring[0] == ':' ? ':' : '?';
    }
    optind++; __optpos = 1;
    return c;
  }
  if (argv[optind][++__optpos] == '\0') { optind++; __optpos = 1; }
  return c;
}
static void __swap_bytes(char *a, char *b, size_t n) {
  while (n--) { char t = *a; *a++ = *b; *b++ = t; }
}
void qsort(void *base, size_t nmemb, size_t size, int (*compar)(const void *, const void *)) {
  char *b = base;
  for (size_t i = 1; i < nmemb; i++) {
    for (size_t j = i; j > 0 && compar(b + (j - 1) * size, b + j * size) > 0; j--)
      __swap_bytes(b + (j - 1) * size, b + j * size, size);
  }
}
void *bsearch(const void *key, const void *base, size_t nmemb, size_t size, int (*compar)(const void *, const void *)) {
  const char *b = base;
  size_t lo = 0, hi = nmemb;
  while (lo < hi) {
    size_t mid = lo + (hi - lo) / 2;
    int c = compar(key, b + mid * size);
    if (c == 0) return (void *)(b + mid * size);
    if (c < 0) hi = mid; else lo = mid + 1;
  }
  return NULL;
}
`;
