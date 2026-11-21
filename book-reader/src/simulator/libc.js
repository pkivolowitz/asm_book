// The simulated process's operating system and C library.
//
// Programs reach this code two ways:
//   * `svc #0` with a Linux AArch64 syscall number in x8  -> syscall()
//   * `bl printf` (or any name in CRT_FUNCTIONS) when no label of that name
//     exists in the program                                  -> call(name)
//
// It provides an in-memory filesystem (so file I/O lessons work in the
// browser), stdio streams, string/stdlib/ctype/math functions, and a heap
// with optional AddressSanitizer-style checking and leak detection.

import { Fault, ExitSignal } from './faults.js';

export const HEAP_BASE = 0x00600000n;
export const HEAP_SIZE = 0x100000;          // 1 MiB
export const LIBC_BASE = 0x007A0000n;       // errno, FILE objects, static buffers
export const LIBC_SIZE = 0x10000;
const ERRNO_ADDR = LIBC_BASE;
const FILE_BASE = LIBC_BASE + 0x1000n;      // FILE* handles: FILE_BASE + 16 * slot
const STATIC_BUF = LIBC_BASE + 0x8000n;     // strerror() result etc.
const REDZONE = 16n;

export const STDIN_HANDLE = FILE_BASE;
export const STDOUT_HANDLE = FILE_BASE + 16n;
export const STDERR_HANDLE = FILE_BASE + 32n;

const E = { EPERM: 1, ENOENT: 2, EBADF: 9, ENOMEM: 12, EACCES: 13, EFAULT: 14, EEXIST: 17, EISDIR: 21, EINVAL: 22, EMFILE: 24, ENOSPC: 28, ESPIPE: 29, ERANGE: 34, ENOSYS: 38 };
const ERRNO_TEXT = {
  0: 'Success', 1: 'Operation not permitted', 2: 'No such file or directory', 9: 'Bad file descriptor',
  12: 'Cannot allocate memory', 13: 'Permission denied', 14: 'Bad address', 17: 'File exists', 21: 'Is a directory',
  22: 'Invalid argument', 24: 'Too many open files', 28: 'No space left on device', 29: 'Illegal seek',
  34: 'Numerical result out of range', 38: 'Function not implemented',
};

// Linux AArch64 open() flags
const O_ACCMODE = 3; const O_WRONLY = 1; const O_RDWR = 2;
const O_CREAT = 0o100; const O_EXCL = 0o200; const O_TRUNC = 0o1000; const O_APPEND = 0o2000;

export const CRT_FUNCTIONS = [
  // stdio
  'printf', 'fprintf', 'sprintf', 'snprintf', 'puts', 'fputs', 'putchar', 'fputc', 'putc', 'getchar', 'fgetc', 'getc', 'ungetc',
  'fgets', 'fopen', 'fclose', 'fread', 'fwrite', 'fflush', 'feof', 'ferror', 'clearerr', 'fseek', 'ftell', 'rewind', 'fileno',
  'scanf', 'sscanf', 'fscanf', 'perror', 'remove', 'rename', 'setvbuf', '__printf_chk', '__fprintf_chk', '__sprintf_chk',
  // stdlib
  'malloc', 'calloc', 'realloc', 'free', 'exit', '_exit', 'abort', 'atoi', 'atol', 'atoll', 'atof', 'strtol', 'strtoul', 'strtoll',
  'strtoull', 'strtod', 'abs', 'labs', 'llabs', 'rand', 'srand', 'getenv', 'system',
  // string
  'strlen', 'strnlen', 'strcpy', 'strncpy', 'strcat', 'strncat', 'strcmp', 'strncmp', 'strcasecmp', 'strchr', 'strrchr', 'strstr',
  'strdup', 'strndup', 'strspn', 'strcspn', 'strtok', 'strerror', 'memcpy', 'memmove', 'memset', 'memcmp', 'memchr',
  // ctype
  'isdigit', 'isalpha', 'isalnum', 'isspace', 'isupper', 'islower', 'isxdigit', 'isprint', 'ispunct', 'iscntrl', 'toupper', 'tolower',
  // unistd / fcntl / sys/stat
  'write', 'read', 'open', 'close', 'lseek', 'fstat', 'stat', 'unlink', 'access', 'getpid', 'getuid', 'sleep', 'usleep',
  // math
  'sqrt', 'pow', 'fabs', 'floor', 'ceil', 'round', 'trunc', 'fmod', 'sin', 'cos', 'tan', 'exp', 'log', 'log10', 'log2',
  // misc
  'time', 'clock', '__errno_location', '__error', '__assert_fail', '__stack_chk_fail', 'fflush_unlocked',
];

const enc = new TextEncoder();
const dec = new TextDecoder();
const signExtend = (v, bits) => BigInt.asIntN(bits, v);
const f64ToBits = (f) => { const dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, f, true); return dv.getBigUint64(0, true); };
const bitsToF64 = (b) => { const dv = new DataView(new ArrayBuffer(8)); dv.setBigUint64(0, BigInt.asUintN(64, b), true); return dv.getFloat64(0, true); };

function toBytes(v) {
  if (v instanceof Uint8Array) return v;
  if (typeof v === 'string') return enc.encode(v);
  if (Array.isArray(v)) return Uint8Array.from(v);
  return new Uint8Array(0);
}

export class LibC {
  constructor(sim, options = {}) {
    this.sim = sim;
    this.options = options;
  }

  // Called by the engine on every (re)assemble.
  reset() {
    const o = this.options;
    this.stdin = toBytes(this.sim.stdin ?? o.stdin ?? '');
    this.stdinPos = 0;
    this.asan = !!o.asan;
    this.leakCheck = !!o.leakCheck;
    this.heapNext = HEAP_BASE;
    this.shadow = this.asan ? new Uint8Array(HEAP_SIZE) : null; // 0 = unallocated/redzone, 1 = live, 2 = freed
    this.allocations = new Map(); // addr -> { size, freed, id }
    this.allocCount = 0;
    this.randState = 1n;
    this.strtokPtr = 0n;
    this.files = new Map();
    for (const [p, v] of Object.entries(o.files || {})) this.files.set(this.normPath(p), { data: Uint8Array.from(toBytes(v)), size: toBytes(v).length });
    this.fds = new Map([[0, { kind: 'stdin' }], [1, { kind: 'stdout' }], [2, { kind: 'stderr' }]]);
    this.streams = new Map([[STDIN_HANDLE, { fd: 0, eof: false, err: false, unget: -1 }], [STDOUT_HANDLE, { fd: 1, eof: false, err: false, unget: -1 }], [STDERR_HANDLE, { fd: 2, eof: false, err: false, unget: -1 }]]);
    this.nextStreamSlot = 3n;
  }

  // ------------------------------------------------------------------
  // helpers
  // ------------------------------------------------------------------
  get x() { return this.sim.x; }
  ret(v) { this.sim.x[0] = BigInt.asUintN(64, BigInt(v)); this.sim.changedRegisters.add('x0'); }
  retF(f) { this.sim.v[0] = f64ToBits(f); this.sim.changedRegisters.add('d0'); }
  fpArg(i) { return bitsToF64(this.sim.v[i]); }
  setErrno(e) { this.sim.store(ERRNO_ADDR, 4, BigInt(e)); }
  getErrno() { return Number(this.sim.load(ERRNO_ADDR, 4)); }
  str(addr, max = 1 << 20) {
    if (addr === 0n) throw new Fault('SIGSEGV', 'NULL pointer passed where a string was expected (address 0x0)');
    const out = [];
    for (let i = 0n; i < BigInt(max); i++) { const b = Number(this.sim.load(addr + i, 1)); if (b === 0) break; out.push(b); }
    return dec.decode(Uint8Array.from(out));
  }
  rawStr(addr) { // bytes without decoding
    const out = [];
    for (let i = 0n; ; i++) { const b = Number(this.sim.load(addr + i, 1)); if (b === 0) break; out.push(b); }
    return out;
  }
  writeBytes(addr, bytes) { for (let i = 0; i < bytes.length; i++) this.sim.store(addr + BigInt(i), 1, BigInt(bytes[i])); }
  writeCString(addr, s) { const b = toBytes(s); this.writeBytes(addr, b); this.sim.store(addr + BigInt(b.length), 1, 0n); }
  normPath(p) { return String(p).replace(/^\.\//, '').replace(/\/+/g, '/'); }

  emit(fd, bytes) {
    const s = dec.decode(bytes);
    if (fd === 1) this.sim.stdout += s; else this.sim.stderr += s;
  }

  // ------------------------------------------------------------------
  // heap
  // ------------------------------------------------------------------
  malloc(size) {
    const sz = BigInt.asUintN(64, size);
    if (sz > BigInt(HEAP_SIZE)) { this.setErrno(E.ENOMEM); return 0n; }
    const p = (this.heapNext + REDZONE + 15n) & ~15n;
    if (p + sz + REDZONE > HEAP_BASE + BigInt(HEAP_SIZE)) { this.setErrno(E.ENOMEM); return 0n; }
    this.heapNext = p + sz;
    this.allocations.set(p, { size: sz, freed: false, id: ++this.allocCount });
    if (this.shadow) this.shadow.fill(1, Number(p - HEAP_BASE), Number(p - HEAP_BASE + sz));
    return p;
  }

  free(p, who = 'free') {
    if (p === 0n) return;
    const info = this.allocations.get(p);
    if (!info) {
      if (this.asan) throw new Fault('ASAN', `attempting ${who === 'free' ? 'free' : who} on address 0x${p.toString(16)} which was not malloc()-ed`);
      throw new Fault('SIGABRT', `${who}(): invalid pointer 0x${p.toString(16)}`);
    }
    if (info.freed) {
      if (this.asan) throw new Fault('ASAN', `attempting double-free on 0x${p.toString(16)} (${info.size}-byte region, allocation #${info.id})`);
      throw new Fault('SIGABRT', 'free(): double free detected in tcache 2');
    }
    info.freed = true;
    if (this.shadow) this.shadow.fill(2, Number(p - HEAP_BASE), Number(p - HEAP_BASE + info.size));
  }

  // Called by the engine for every load/store into the heap region.
  checkHeapAccess(addr, size, isWrite) {
    if (!this.shadow) return;
    const off = Number(addr - HEAP_BASE);
    for (let i = 0; i < size; i++) {
      const s = this.shadow[off + i];
      if (s === 1) continue;
      const bad = addr + BigInt(i);
      const what = `${isWrite ? 'WRITE' : 'READ'} of size ${size} at 0x${addr.toString(16)}`;
      if (s === 2) {
        const [base, info] = this.findAlloc(bad, true);
        throw new Fault('ASAN', `heap-use-after-free: ${what}\n  0x${bad.toString(16)} is ${bad - base} bytes inside a ${info.size}-byte region [0x${base.toString(16)}, 0x${(base + info.size).toString(16)}) that was already freed`);
      }
      const near = this.findNearest(bad);
      if (near) {
        const [base, info] = near;
        const end = base + info.size;
        const rel = bad >= end ? `${bad - end} bytes after` : `${base - bad} bytes before`;
        throw new Fault('ASAN', `heap-buffer-overflow: ${what}\n  0x${bad.toString(16)} is ${rel} the ${info.size}-byte region [0x${base.toString(16)}, 0x${end.toString(16)})`);
      }
      throw new Fault('ASAN', `wild heap access: ${what} (no allocation near this address)`);
    }
  }

  findAlloc(addr, freedOk) {
    for (const [base, info] of this.allocations) {
      if (addr >= base && addr < base + info.size && (freedOk || !info.freed)) return [base, info];
    }
    return [addr, { size: 0n }];
  }

  findNearest(addr) {
    let best = null; let dist = null;
    for (const [base, info] of this.allocations) {
      const end = base + info.size;
      const d = addr >= end ? addr - end : base > addr ? base - addr : 0n;
      if (dist === null || d < dist) { best = [base, info]; dist = d; }
    }
    return best && dist <= 64n ? best : null;
  }

  leaks() {
    return [...this.allocations].filter(([, i]) => !i.freed).map(([addr, i]) => ({ addr, size: i.size, id: i.id }));
  }

  leakReport() {
    const l = this.leaks();
    if (!l.length) return '';
    const total = l.reduce((a, b) => a + b.size, 0n);
    const lines = l.slice(0, 10).map(k => `Direct leak of ${k.size} byte(s) in 1 object allocated at 0x${k.addr.toString(16)} (allocation #${k.id})`);
    if (l.length > 10) lines.push(`... and ${l.length - 10} more`);
    return `\n=================================================================\nERROR: LeakSanitizer: detected memory leaks\n\n${lines.join('\n')}\n\nSUMMARY: AddressSanitizer: ${total} byte(s) leaked in ${l.length} allocation(s).\n`;
  }

  // ------------------------------------------------------------------
  // file descriptors and the in-memory filesystem
  // ------------------------------------------------------------------
  sysOpen(path, flags) {
    const p = this.normPath(path);
    if (!p || p.endsWith('/')) return -E.EISDIR;
    let f = this.files.get(p);
    if (!f) {
      if (!(flags & O_CREAT)) return -E.ENOENT;
      f = { data: new Uint8Array(64), size: 0 };
      this.files.set(p, f);
    } else if ((flags & O_CREAT) && (flags & O_EXCL)) return -E.EEXIST;
    if ((flags & O_TRUNC) && (flags & O_ACCMODE) !== 0) f.size = 0;
    let fd = 3;
    while (this.fds.has(fd)) fd++;
    if (fd > 64) return -E.EMFILE;
    this.fds.set(fd, { kind: 'file', path: p, file: f, pos: 0, acc: flags & O_ACCMODE, append: !!(flags & O_APPEND) });
    return fd;
  }

  sysRead(fd, buf, count) {
    const d = this.fds.get(fd);
    if (!d) return -E.EBADF;
    if (d.kind === 'stdin') {
      const n = Math.min(count, this.stdin.length - this.stdinPos);
      if (n <= 0) return 0;
      this.writeBytes(buf, this.stdin.subarray(this.stdinPos, this.stdinPos + n));
      this.stdinPos += n;
      return n;
    }
    if (d.kind !== 'file' || d.acc === O_WRONLY) return -E.EBADF;
    const n = Math.max(0, Math.min(count, d.file.size - d.pos));
    this.writeBytes(buf, d.file.data.subarray(d.pos, d.pos + n));
    d.pos += n;
    return n;
  }

  sysWrite(fd, buf, count) {
    const d = this.fds.get(fd);
    if (!d) return -E.EBADF;
    if (count > (1 << 22)) return -E.EFAULT;
    const bytes = new Uint8Array(count);
    for (let i = 0; i < count; i++) bytes[i] = Number(this.sim.load(buf + BigInt(i), 1));
    if (d.kind === 'stdout' || d.kind === 'stderr') { this.emit(d.kind === 'stdout' ? 1 : 2, bytes); return count; }
    if (d.kind !== 'file' || d.acc === 0) return -E.EBADF;
    const f = d.file;
    if (d.append) d.pos = f.size;
    const need = d.pos + count;
    if (need > (1 << 22)) return -E.ENOSPC;
    if (need > f.data.length) { const nd = new Uint8Array(Math.max(need, f.data.length * 2)); nd.set(f.data.subarray(0, f.size)); f.data = nd; }
    f.data.set(bytes, d.pos);
    d.pos += count;
    if (d.pos > f.size) f.size = d.pos;
    return count;
  }

  sysLseek(fd, off, whence) {
    const d = this.fds.get(fd);
    if (!d) return -E.EBADF;
    if (d.kind !== 'file') return -E.ESPIPE;
    const base = whence === 0 ? 0 : whence === 1 ? d.pos : whence === 2 ? d.file.size : null;
    if (base === null) return -E.EINVAL;
    const np = base + off;
    if (np < 0) return -E.EINVAL;
    d.pos = np;
    return np;
  }

  sysClose(fd) {
    if (!this.fds.has(fd)) return -E.EBADF;
    this.fds.delete(fd);
    return 0;
  }

  writeStat(buf, size, isFile = true) {
    for (let i = 0n; i < 128n; i += 8n) this.sim.store(buf + i, 8, 0n);
    this.sim.store(buf + 16n, 4, BigInt(isFile ? 0o100644 : 0o20620)); // st_mode
    this.sim.store(buf + 20n, 4, 1n);                                   // st_nlink
    this.sim.store(buf + 48n, 8, BigInt(size));                         // st_size
    this.sim.store(buf + 56n, 4, 4096n);                                // st_blksize
    this.sim.store(buf + 64n, 8, BigInt(Math.ceil(size / 512)));        // st_blocks
  }

  sysFstat(fd, buf) {
    const d = this.fds.get(fd);
    if (!d) return -E.EBADF;
    this.writeStat(buf, d.kind === 'file' ? d.file.size : 0, d.kind === 'file');
    return 0;
  }

  sysStat(path, buf) {
    const f = this.files.get(this.normPath(path));
    if (!f) return -E.ENOENT;
    this.writeStat(buf, f.size, true);
    return 0;
  }

  // Snapshot of the filesystem for graders and the UI.
  fileContents(path) {
    const f = this.files.get(this.normPath(path));
    return f ? f.data.slice(0, f.size) : null;
  }
  listFiles() { return [...this.files.keys()]; }

  // ------------------------------------------------------------------
  // syscalls (svc #0)
  // ------------------------------------------------------------------
  syscall() {
    const x = this.x;
    const nr = Number(x[8]);
    const a = (i) => x[i];
    const int = (i) => Number(signExtend(x[i], 64));
    switch (nr) {
      case 56: { // openat(dirfd, path, flags, mode)
        return this.ret(this.sysOpen(this.str(a(1)), int(2)));
      }
      case 57: return this.ret(this.sysClose(int(0)));
      case 62: return this.ret(this.sysLseek(int(0), int(1), int(2)));
      case 63: return this.ret(this.sysRead(int(0), a(1), int(2)));
      case 64: return this.ret(this.sysWrite(int(0), a(1), int(2)));
      case 79: return this.ret(this.sysStat(this.str(a(1)), a(2))); // newfstatat
      case 80: return this.ret(this.sysFstat(int(0), a(1)));
      case 35: { const p = this.normPath(this.str(a(1))); return this.ret(this.files.delete(p) ? 0 : -E.ENOENT); } // unlinkat
      case 93: case 94: throw new ExitSignal(Number(x[0] & 0xFFn), `exit(${Number(x[0] & 0xFFn)}) via syscall ${nr}`);
      case 172: return this.ret(1337);
      case 173: return this.ret(1);
      case 174: case 175: case 176: case 177: return this.ret(1000);
      case 214: return this.ret(this.heapNext);
      case 222: return this.ret(-E.ENOMEM); // mmap
      default:
        this.sim.stderr += `[simulator] syscall ${nr} is not implemented; returning -ENOSYS\n`;
        return this.ret(-E.ENOSYS);
    }
  }

  // libc wrapper convention: negative kernel result -> errno, return -1
  wrap(r) {
    if (r < 0) { this.setErrno(-r); return this.ret(-1); }
    return this.ret(r);
  }

  // ------------------------------------------------------------------
  // stdio streams
  // ------------------------------------------------------------------
  stream(h) {
    const s = this.streams.get(BigInt.asUintN(64, h));
    if (!s) {
      if (h === 0n) throw new Fault('SIGSEGV', 'NULL FILE* passed to a stdio function (did fopen fail?)');
      throw new Fault('SIGSEGV', `invalid FILE* 0x${h.toString(16)} (closed, or never returned by fopen)`);
    }
    return s;
  }

  streamWrite(h, bytes) {
    const s = this.stream(h);
    const d = this.fds.get(s.fd);
    if (!d) { s.err = true; return -1; }
    if (d.kind === 'stdout' || d.kind === 'stderr') { this.emit(d.kind === 'stdout' ? 1 : 2, bytes); return bytes.length; }
    if (d.kind !== 'file' || d.acc === 0) { s.err = true; return -1; }
    // Reuse sysWrite through a scratch copy in memory-independent form.
    const f = d.file;
    if (d.append) d.pos = f.size;
    const need = d.pos + bytes.length;
    if (need > f.data.length) { const nd = new Uint8Array(Math.max(need, f.data.length * 2)); nd.set(f.data.subarray(0, f.size)); f.data = nd; }
    f.data.set(bytes, d.pos);
    d.pos += bytes.length;
    if (d.pos > f.size) f.size = d.pos;
    return bytes.length;
  }

  // Read one byte from a stream; -1 at EOF.
  streamGetc(h) {
    const s = this.stream(h);
    if (s.unget >= 0) { const c = s.unget; s.unget = -1; return c; }
    const d = this.fds.get(s.fd);
    if (!d) { s.err = true; return -1; }
    if (d.kind === 'stdin') {
      if (this.stdinPos >= this.stdin.length) { s.eof = true; return -1; }
      return this.stdin[this.stdinPos++];
    }
    if (d.kind !== 'file' || d.acc === O_WRONLY) { s.err = true; return -1; }
    if (d.pos >= d.file.size) { s.eof = true; return -1; }
    return d.file.data[d.pos++];
  }

  fopen(path, mode) {
    const m = mode.replace(/[bt]/g, '');
    const flags = { r: 0, 'r+': O_RDWR, w: O_WRONLY | O_CREAT | O_TRUNC, 'w+': O_RDWR | O_CREAT | O_TRUNC, a: O_WRONLY | O_CREAT | O_APPEND, 'a+': O_RDWR | O_CREAT | O_APPEND }[m];
    if (flags === undefined) { this.setErrno(E.EINVAL); return 0n; }
    const fd = this.sysOpen(path, flags);
    if (fd < 0) { this.setErrno(-fd); return 0n; }
    const h = FILE_BASE + this.nextStreamSlot * 16n;
    this.nextStreamSlot++;
    this.streams.set(h, { fd, eof: false, err: false, unget: -1 });
    this.sim.store(h, 4, BigInt(fd)); // a FILE really does contain its fd
    return h;
  }

  // ------------------------------------------------------------------
  // printf / scanf
  // ------------------------------------------------------------------
  // AAPCS64 (Linux): variadic integer args in x registers then the stack,
  // floating point args in d registers.
  argReader(firstInt) {
    let gi = firstInt; let fi = 0; let stackOff = 0n;
    const sim = this.sim;
    const apple = sim.appleFlavor;
    return {
      int: () => {
        if (gi <= 7 && !apple) return sim.x[gi++];
        const v = sim.load(sim.sp + stackOff, 8); stackOff += 8n; return v;
      },
      fp: () => {
        if (fi <= 7 && !apple) return bitsToF64(sim.v[fi++]);
        const v = bitsToF64(sim.load(sim.sp + stackOff, 8)); stackOff += 8n; return v;
      },
    };
  }

  format(fmt, args) {
    return fmt.replace(/%([-+ 0#]*)(\*|\d+)?(?:\.(\*|\d*))?(hh|h|ll|l|z|j|t|L)?([diouxXcspfFeEgGn%])/g, (all, flags, width, prec, len, conv) => {
      if (conv === '%') return '%';
      if (width === '*') width = String(Number(signExtend(args.int(), 32)));
      if (prec === '*') prec = String(Number(signExtend(args.int(), 32)));
      if (prec === '') prec = '0';
      const bits = (len === 'l' || len === 'll' || len === 'z' || len === 'j' || len === 't') ? 64 : len === 'h' ? 16 : len === 'hh' ? 8 : 32;
      let body;
      switch (conv) {
        case 'd': case 'i': {
          const v = signExtend(args.int(), bits);
          body = (v < 0n ? -v : v).toString();
          if (prec !== undefined) body = (prec === '0' && v === 0n) ? '' : body.padStart(Number(prec), '0');
          body = (v < 0n ? '-' : flags.includes('+') ? '+' : flags.includes(' ') ? ' ' : '') + body;
          break;
        }
        case 'u': case 'x': case 'X': case 'o': {
          const v = BigInt.asUintN(bits, args.int());
          body = v.toString(conv === 'u' ? 10 : conv === 'o' ? 8 : 16);
          if (conv === 'X') body = body.toUpperCase();
          if (prec !== undefined) body = body.padStart(Number(prec), '0');
          if (flags.includes('#') && v !== 0n && conv !== 'u') body = (conv === 'o' ? '0' : conv === 'x' ? '0x' : '0X') + body;
          break;
        }
        case 'p': { const v = args.int(); body = v === 0n ? '(nil)' : `0x${v.toString(16)}`; break; }
        case 'c': body = String.fromCharCode(Number(args.int() & 0xFFn)); break;
        case 's': {
          const a = args.int();
          body = a === 0n ? '(null)' : this.str(a);
          if (prec !== undefined) body = body.slice(0, Number(prec));
          break;
        }
        case 'f': case 'F': {
          const f = args.fp();
          const pr = prec !== undefined ? Number(prec) : 6;
          if (!Number.isFinite(f)) body = Number.isNaN(f) ? 'nan' : f < 0 ? '-inf' : 'inf';
          else if (Math.abs(f) >= 1e21) body = BigInt(Math.trunc(f)).toString() + (pr ? '.' + '0'.repeat(pr) : ''); // toFixed switches to exponent form here; printf does not
          else body = f.toFixed(pr);
          if (flags.includes('+') && f >= 0) body = '+' + body;
          break;
        }
        case 'e': case 'E': {
          body = args.fp().toExponential(prec !== undefined ? Number(prec) : 6).replace(/e([+-])(\d)$/, 'e$10$2');
          if (conv === 'E') body = body.toUpperCase();
          break;
        }
        case 'g': case 'G': {
          const f = args.fp(); const p = prec !== undefined ? Math.max(1, Number(prec)) : 6;
          body = f === 0 ? '0' : String(Number(f.toPrecision(p)));
          if (/e/.test(body)) body = body.replace(/e([+-])(\d)$/, 'e$10$2');
          break;
        }
        case 'n': return '';
        default: body = all;
      }
      const w = width ? Number(width) : 0;
      if (body.length < w) {
        if (flags.includes('-')) body = body.padEnd(w, ' ');
        else if (flags.includes('0') && 'diouxXfFeE'.includes(conv) && (prec === undefined || 'fFeE'.includes(conv))) {
          const pre = /^[-+ ]/.test(body) ? body[0] : /^0[xX]/.test(body) ? body.slice(0, 2) : '';
          body = pre + body.slice(pre.length).padStart(w - pre.length, '0');
        } else body = body.padStart(w, ' ');
      }
      return body;
    });
  }

  // Shared scanf engine: next() returns the next byte or -1; unread(c) pushes back.
  scan(fmt, next, unread, args) {
    let assigned = 0; let i = 0; let sawInput = false;
    const skipWs = () => { let c; do { c = next(); } while (c >= 0 && /\s/.test(String.fromCharCode(c))); if (c >= 0) unread(c); };
    while (i < fmt.length) {
      const ch = fmt[i];
      if (/\s/.test(ch)) { skipWs(); i++; continue; }
      if (ch !== '%') { const c = next(); if (c !== ch.charCodeAt(0)) { if (c >= 0) unread(c); break; } i++; continue; }
      const m = /^%(\*)?(\d+)?(hh|h|ll|l|L|z)?([diuxXofeEgGcs%])/.exec(fmt.slice(i));
      if (!m) break;
      i += m[0].length;
      const [, suppress, widthStr, len, conv] = m;
      if (conv === '%') { skipWs(); const c = next(); if (c !== 37) break; continue; }
      const width = widthStr ? Number(widthStr) : Infinity;
      if (conv !== 'c') skipWs();
      let text = '';
      if (conv === 'c') {
        const n = widthStr ? width : 1; const bytes = [];
        for (let k = 0; k < n; k++) { const c = next(); if (c < 0) break; bytes.push(c); }
        if (!bytes.length) return sawInput || assigned ? assigned : -1;
        sawInput = true;
        if (!suppress) { this.writeBytes(args.int(), bytes); assigned++; }
        continue;
      }
      if (conv === 's') {
        const bytes = [];
        for (let c = next(); c >= 0 && !/\s/.test(String.fromCharCode(c)) && bytes.length < width; c = next()) bytes.push(c);
        if (!bytes.length) return sawInput || assigned ? assigned : -1;
        sawInput = true;
        if (!suppress) { const p = args.int(); this.writeBytes(p, bytes); this.sim.store(p + BigInt(bytes.length), 1, 0n); assigned++; }
        continue;
      }
      const isFloat = 'feEgG'.includes(conv);
      const re = isFloat ? /^[-+]?(\d+\.?\d*([eE][-+]?\d+)?|\.\d+([eE][-+]?\d+)?|inf|nan)/i : conv === 'x' || conv === 'X' ? /^[-+]?(0[xX])?[0-9a-fA-F]+/ : conv === 'o' ? /^[-+]?[0-7]+/ : /^[-+]?\d+/;
      // read greedily while the prefix could still be valid
      for (;;) {
        if (text.length >= width) break;
        const c = next();
        if (c < 0) break;
        const cand = text + String.fromCharCode(c);
        if (/^[-+]?[0-9a-fA-FxX.eE]*$/.test(cand) || /^[-+]?(i|in|inf|n|na|nan)$/i.test(cand)) {
          if (!isFloat && /[.eE]/.test(String.fromCharCode(c)) && !(conv === 'x' || conv === 'X')) { unread(c); break; }
          text = cand;
        } else { unread(c); break; }
      }
      const mm = re.exec(text);
      if (!mm) { if (text === '' && sawInput === false && assigned === 0) return next() < 0 ? -1 : 0; break; }
      sawInput = true;
      if (suppress) continue;
      const p = args.int();
      if (isFloat) {
        const f = parseFloat(mm[0]);
        if (len === 'l' || len === 'L') this.sim.store(p, 8, f64ToBits(f));
        else { const dv = new DataView(new ArrayBuffer(4)); dv.setFloat32(0, f, true); this.sim.store(p, 4, BigInt(dv.getUint32(0, true))); }
      } else {
        const radix = conv === 'x' || conv === 'X' ? 16 : conv === 'o' ? 8 : conv === 'i' && /^[-+]?0[xX]/.test(mm[0]) ? 16 : 10;
        const t = mm[0].replace(/^([-+]?)0[xX]/, '$1');
        const neg = t.startsWith('-');
        let v = BigInt(radix === 16 ? '0x' + t.replace(/^[-+]/, '') : radix === 8 ? '0o' + t.replace(/^[-+]/, '') : t.replace(/^[-+]/, ''));
        if (neg) v = -v;
        const size = len === 'l' || len === 'll' || len === 'z' ? 8 : len === 'h' ? 2 : len === 'hh' ? 1 : 4;
        this.sim.store(p, size, BigInt.asUintN(size * 8, v));
      }
      assigned++;
    }
    return assigned;
  }

  // strtol family: returns [value, charsConsumed]
  parseInt(s, base) {
    const m = /^(\s*)([-+]?)/.exec(s);
    let i = m[0].length; const neg = m[2] === '-';
    let b = base;
    if ((b === 0 || b === 16) && /^0[xX][0-9a-fA-F]/.test(s.slice(i))) { i += 2; b = 16; }
    else if (b === 0 && s[i] === '0') b = 8;
    else if (b === 0) b = 10;
    const digits = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, b);
    let v = 0n; const start = i;
    while (i < s.length && digits.includes(s[i].toLowerCase())) { v = v * BigInt(b) + BigInt(digits.indexOf(s[i].toLowerCase())); i++; }
    if (i === start) return [0n, 0];
    return [neg ? -v : v, i];
  }

  staticString(s) {
    this.writeCString(STATIC_BUF, s);
    return STATIC_BUF;
  }

  // ------------------------------------------------------------------
  // C library entry point
  // ------------------------------------------------------------------
  call(name) {
    const sim = this.sim; const x = sim.x;
    const a = (i) => x[i];
    const int = (i) => Number(signExtend(x[i], 64));
    const i32 = (i) => Number(signExtend(x[i], 32));
    const byte = (i) => Number(x[i] & 0xFFn);
    const ctype = (pred) => { const c = i32(0); this.ret(c >= 0 && c < 256 && pred(c) ? 1 : 0); };
    switch (name) {
      // ---------- stdio ----------
      case 'printf': case '__printf_chk': {
        const first = name === 'printf' ? 0 : 1;
        const out = this.format(this.str(a(first)), this.argReader(first + 1));
        const b = enc.encode(out); this.streamWrite(STDOUT_HANDLE, b); return this.ret(b.length);
      }
      case 'fprintf': case '__fprintf_chk': {
        const h = a(0); const first = name === 'fprintf' ? 1 : 2;
        const out = enc.encode(this.format(this.str(a(first)), this.argReader(first + 1)));
        return this.ret(this.streamWrite(h, out));
      }
      case 'sprintf': case '__sprintf_chk': {
        const first = name === 'sprintf' ? 1 : 3;
        const out = this.format(this.str(a(first)), this.argReader(first + 1));
        this.writeCString(a(0), out); return this.ret(enc.encode(out).length);
      }
      case 'snprintf': {
        const out = enc.encode(this.format(this.str(a(2)), this.argReader(3)));
        const n = int(1);
        if (n > 0) { const k = Math.min(out.length, n - 1); this.writeBytes(a(0), out.subarray(0, k)); sim.store(a(0) + BigInt(k), 1, 0n); }
        return this.ret(out.length);
      }
      case 'puts': { const b = [...this.rawStr(a(0)), 10]; this.streamWrite(STDOUT_HANDLE, Uint8Array.from(b)); return this.ret(b.length); }
      case 'fputs': return this.ret(this.streamWrite(a(1), Uint8Array.from(this.rawStr(a(0)))) < 0 ? -1 : 1);
      case 'putchar': this.streamWrite(STDOUT_HANDLE, Uint8Array.of(byte(0))); return this.ret(byte(0));
      case 'fputc': case 'putc': return this.ret(this.streamWrite(a(1), Uint8Array.of(byte(0))) < 0 ? -1 : byte(0));
      case 'getchar': return this.ret(this.streamGetc(STDIN_HANDLE));
      case 'fgetc': case 'getc': return this.ret(this.streamGetc(a(0)));
      case 'ungetc': { if (i32(0) < 0) return this.ret(-1); const s = this.stream(a(1)); s.unget = byte(0); s.eof = false; return this.ret(byte(0)); }
      case 'fgets': {
        const buf = a(0); const n = int(1); const h = a(2);
        if (n <= 0) return this.ret(0);
        const bytes = [];
        while (bytes.length < n - 1) { const c = this.streamGetc(h); if (c < 0) break; bytes.push(c); if (c === 10) break; }
        if (!bytes.length) return this.ret(0);
        this.writeBytes(buf, bytes); sim.store(buf + BigInt(bytes.length), 1, 0n);
        return this.ret(buf);
      }
      case 'fopen': return this.ret(this.fopen(this.str(a(0)), this.str(a(1))));
      case 'fclose': {
        const s = this.stream(a(0)); this.sysClose(s.fd); this.streams.delete(BigInt.asUintN(64, a(0)));
        return this.ret(0);
      }
      case 'fread': {
        const buf = a(0); const size = int(1); const nmemb = int(2); const h = a(3);
        if (size === 0 || nmemb === 0) return this.ret(0);
        const total = size * nmemb; const bytes = [];
        while (bytes.length < total) { const c = this.streamGetc(h); if (c < 0) break; bytes.push(c); }
        this.writeBytes(buf, bytes);
        return this.ret(Math.floor(bytes.length / size));
      }
      case 'fwrite': {
        const buf = a(0); const size = int(1); const nmemb = int(2);
        const total = size * nmemb; const bytes = new Uint8Array(total);
        for (let i = 0; i < total; i++) bytes[i] = Number(sim.load(buf + BigInt(i), 1));
        const w = this.streamWrite(a(3), bytes);
        return this.ret(w < 0 ? 0 : size ? Math.floor(w / size) : 0);
      }
      case 'fflush': case 'fflush_unlocked': case 'setvbuf': return this.ret(0);
      case 'feof': return this.ret(this.stream(a(0)).eof ? 1 : 0);
      case 'ferror': return this.ret(this.stream(a(0)).err ? 1 : 0);
      case 'clearerr': { const s = this.stream(a(0)); s.eof = false; s.err = false; return this.ret(0); }
      case 'fseek': {
        const s = this.stream(a(0)); const r = this.sysLseek(s.fd, int(1), int(2));
        if (r < 0) { this.setErrno(-r); return this.ret(-1); }
        s.eof = false; s.unget = -1; return this.ret(0);
      }
      case 'ftell': { const s = this.stream(a(0)); return this.wrap(this.sysLseek(s.fd, 0, 1)); }
      case 'rewind': { const s = this.stream(a(0)); this.sysLseek(s.fd, 0, 0); s.eof = false; s.err = false; return this.ret(0); }
      case 'fileno': return this.ret(this.stream(a(0)).fd);
      case 'scanf': case 'sscanf': case 'fscanf': {
        let next; let unread; let fmtIdx;
        if (name === 'sscanf') {
          const bytes = this.rawStr(a(0)); let pos = 0;
          next = () => (pos < bytes.length ? bytes[pos++] : -1); unread = () => { pos--; }; fmtIdx = 1;
        } else {
          const h = name === 'scanf' ? STDIN_HANDLE : a(0);
          next = () => this.streamGetc(h); unread = (c) => { this.stream(h).unget = c; }; fmtIdx = name === 'scanf' ? 0 : 1;
        }
        return this.ret(this.scan(this.str(a(fmtIdx)), next, unread, this.argReader(fmtIdx + 1)));
      }
      case 'perror': {
        const msg = ERRNO_TEXT[this.getErrno()] || `Unknown error ${this.getErrno()}`;
        const pre = a(0) !== 0n ? this.str(a(0)) : '';
        this.emit(2, enc.encode(`${pre ? pre + ': ' : ''}${msg}\n`));
        return this.ret(0);
      }
      case 'strerror': return this.ret(this.staticString(ERRNO_TEXT[i32(0)] || `Unknown error ${i32(0)}`));
      case 'remove': case 'unlink': { const ok = this.files.delete(this.normPath(this.str(a(0)))); if (!ok) { this.setErrno(E.ENOENT); return this.ret(-1); } return this.ret(0); }
      case 'rename': {
        const from = this.normPath(this.str(a(0))); const to = this.normPath(this.str(a(1)));
        const f = this.files.get(from); if (!f) { this.setErrno(E.ENOENT); return this.ret(-1); }
        this.files.delete(from); this.files.set(to, f); return this.ret(0);
      }

      // ---------- stdlib ----------
      case 'malloc': return this.ret(this.malloc(a(0)));
      case 'calloc': {
        const n = a(0); const sz = a(1); const total = n * sz;
        if (sz !== 0n && total / sz !== n) { this.setErrno(E.ENOMEM); return this.ret(0); }
        const p = this.malloc(total);
        if (p) for (let i = 0n; i < total; i++) sim.store(p + i, 1, 0n);
        return this.ret(p);
      }
      case 'realloc': {
        const old = a(0); const size = a(1);
        if (old === 0n) return this.ret(this.malloc(size));
        const info = this.allocations.get(old);
        if (!info || info.freed) {
          if (this.asan) throw new Fault('ASAN', `attempting realloc on ${info ? 'already freed ' : 'non-malloc()-ed '}address 0x${old.toString(16)}`);
          throw new Fault('SIGABRT', 'realloc(): invalid pointer');
        }
        if (size === 0n) { this.free(old); return this.ret(0); }
        const p = this.malloc(size);
        if (p === 0n) return this.ret(0);
        const n = info.size < size ? info.size : size;
        for (let i = 0n; i < n; i++) sim.store(p + i, 1, sim.load(old + i, 1));
        this.free(old, 'realloc');
        return this.ret(p);
      }
      case 'free': this.free(a(0)); return undefined;
      case 'exit': throw new ExitSignal(Number(x[0] & 0xFFn), `exit(${i32(0)})`);
      case '_exit': throw new ExitSignal(Number(x[0] & 0xFFn), `_exit(${i32(0)})`);
      case 'abort': throw new Fault('SIGABRT', 'abort() called');
      case 'atoi': case 'atol': case 'atoll': {
        const [v] = this.parseInt(this.str(a(0)), 10);
        return this.ret(name === 'atoi' ? BigInt.asIntN(32, v) : v);
      }
      case 'strtol': case 'strtoul': case 'strtoll': case 'strtoull': {
        const s = this.str(a(0)); const [v, n] = this.parseInt(s, i32(2));
        if (a(1) !== 0n) sim.store(a(1), 8, a(0) + BigInt(new TextEncoder().encode(s.slice(0, n)).length));
        const max = 0x7FFFFFFFFFFFFFFFn;
        let r = v;
        if (name === 'strtol' || name === 'strtoll') { if (v > max) { r = max; this.setErrno(E.ERANGE); } else if (v < -max - 1n) { r = -max - 1n; this.setErrno(E.ERANGE); } }
        return this.ret(r);
      }
      case 'atof': case 'strtod': {
        const s = this.str(a(0)); const m = /^\s*[-+]?(\d+\.?\d*([eE][-+]?\d+)?|\.\d+([eE][-+]?\d+)?|inf(inity)?|nan)/i.exec(s);
        const f = m ? parseFloat(m[0]) : 0;
        if (name === 'strtod' && a(1) !== 0n) sim.store(a(1), 8, a(0) + BigInt(m ? m[0].length : 0));
        return this.retF(Number.isNaN(f) && !(m && /nan/i.test(m[0])) ? 0 : f);
      }
      case 'abs': return this.ret(BigInt.asUintN(32, BigInt(Math.abs(i32(0)))));
      case 'labs': case 'llabs': { const v = signExtend(a(0), 64); return this.ret(v < 0n ? -v : v); }
      case 'srand': this.randState = BigInt.asUintN(32, a(0)); return undefined;
      case 'rand': this.randState = (this.randState * 1103515245n + 12345n) & 0x7FFFFFFFn; return this.ret(this.randState);
      case 'getenv': return this.ret(0);
      case 'system': return this.ret(-1);

      // ---------- string ----------
      case 'strlen': { let n = 0n; while (sim.load(a(0) + n, 1) !== 0n) n++; return this.ret(n); }
      case 'strnlen': { let n = 0n; while (n < a(1) && sim.load(a(0) + n, 1) !== 0n) n++; return this.ret(n); }
      case 'strcpy': { let i = 0n; let c; do { c = sim.load(a(1) + i, 1); sim.store(a(0) + i, 1, c); i++; } while (c !== 0n); return this.ret(a(0)); }
      case 'strncpy': { let ended = false; for (let i = 0n; i < a(2); i++) { const c = ended ? 0n : sim.load(a(1) + i, 1); if (c === 0n) ended = true; sim.store(a(0) + i, 1, c); } return this.ret(a(0)); }
      case 'strcat': case 'strncat': {
        let d = a(0); while (sim.load(d, 1) !== 0n) d++;
        const lim = name === 'strncat' ? a(2) : -1n;
        let i = 0n;
        for (; lim < 0n || i < lim; i++) { const c = sim.load(a(1) + i, 1); if (c === 0n) break; sim.store(d + i, 1, c); }
        sim.store(d + i, 1, 0n);
        return this.ret(a(0));
      }
      case 'strcmp': case 'strncmp': case 'strcasecmp': {
        const lim = name === 'strncmp' ? a(2) : -1n;
        let r = 0;
        for (let i = 0n; lim < 0n || i < lim; i++) {
          let c1 = Number(sim.load(a(0) + i, 1)); let c2 = Number(sim.load(a(1) + i, 1));
          if (name === 'strcasecmp') { if (c1 >= 65 && c1 <= 90) c1 += 32; if (c2 >= 65 && c2 <= 90) c2 += 32; }
          if (c1 !== c2) { r = c1 - c2; break; }
          if (c1 === 0) break;
        }
        return this.ret(r);
      }
      case 'strchr': case 'strrchr': {
        const c = byte(1); let found = 0n;
        for (let p = a(0); ; p++) {
          const b = Number(sim.load(p, 1));
          if (b === c) { found = p; if (name === 'strchr') break; }
          if (b === 0) break;
        }
        return this.ret(found);
      }
      case 'strstr': {
        const hay = this.rawStr(a(0)); const needle = this.rawStr(a(1));
        if (!needle.length) return this.ret(a(0));
        for (let i = 0; i + needle.length <= hay.length; i++) {
          let ok = true; for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) { ok = false; break; }
          if (ok) return this.ret(a(0) + BigInt(i));
        }
        return this.ret(0);
      }
      case 'strdup': case 'strndup': {
        let b = this.rawStr(a(0)); if (name === 'strndup') b = b.slice(0, int(1));
        const p = this.malloc(BigInt(b.length + 1));
        if (p) { this.writeBytes(p, b); sim.store(p + BigInt(b.length), 1, 0n); }
        return this.ret(p);
      }
      case 'strspn': case 'strcspn': {
        const s = this.rawStr(a(0)); const set = new Set(this.rawStr(a(1)));
        let n = 0; while (n < s.length && set.has(s[n]) === (name === 'strspn')) n++;
        return this.ret(n);
      }
      case 'strtok': {
        let p = a(0) !== 0n ? a(0) : this.strtokPtr;
        if (p === 0n) return this.ret(0);
        const delim = new Set(this.rawStr(a(1)));
        while (sim.load(p, 1) !== 0n && delim.has(Number(sim.load(p, 1)))) p++;
        if (sim.load(p, 1) === 0n) { this.strtokPtr = 0n; return this.ret(0); }
        const start = p;
        while (sim.load(p, 1) !== 0n && !delim.has(Number(sim.load(p, 1)))) p++;
        if (sim.load(p, 1) !== 0n) { sim.store(p, 1, 0n); this.strtokPtr = p + 1n; } else this.strtokPtr = 0n;
        return this.ret(start);
      }
      case 'memcpy': case 'memmove': {
        const n = int(2);
        if (name === 'memcpy' && n > 0) {
          const d = a(0); const s = a(1);
          if (d < s + BigInt(n) && s < d + BigInt(n) && this.asan) throw new Fault('ASAN', `memcpy-param-overlap: memory ranges [0x${d.toString(16)}, +${n}) and [0x${s.toString(16)}, +${n}) overlap (use memmove)`);
        }
        const tmp = []; for (let i = 0; i < n; i++) tmp.push(sim.load(a(1) + BigInt(i), 1));
        for (let i = 0; i < n; i++) sim.store(a(0) + BigInt(i), 1, tmp[i]);
        return this.ret(a(0));
      }
      case 'memset': { for (let i = 0n; i < a(2); i++) sim.store(a(0) + i, 1, BigInt(byte(1))); return this.ret(a(0)); }
      case 'memcmp': {
        let r = 0;
        for (let i = 0n; i < a(2); i++) { const c1 = Number(sim.load(a(0) + i, 1)); const c2 = Number(sim.load(a(1) + i, 1)); if (c1 !== c2) { r = c1 - c2; break; } }
        return this.ret(r);
      }
      case 'memchr': { for (let i = 0n; i < a(2); i++) if (Number(sim.load(a(0) + i, 1)) === byte(1)) return this.ret(a(0) + i); return this.ret(0); }

      // ---------- ctype ----------
      case 'isdigit': return ctype(c => c >= 48 && c <= 57);
      case 'isalpha': return ctype(c => (c | 32) >= 97 && (c | 32) <= 122);
      case 'isalnum': return ctype(c => (c >= 48 && c <= 57) || ((c | 32) >= 97 && (c | 32) <= 122));
      case 'isspace': return ctype(c => [32, 9, 10, 11, 12, 13].includes(c));
      case 'isupper': return ctype(c => c >= 65 && c <= 90);
      case 'islower': return ctype(c => c >= 97 && c <= 122);
      case 'isxdigit': return ctype(c => (c >= 48 && c <= 57) || ((c | 32) >= 97 && (c | 32) <= 102));
      case 'isprint': return ctype(c => c >= 32 && c < 127);
      case 'ispunct': return ctype(c => c > 32 && c < 127 && !((c >= 48 && c <= 57) || ((c | 32) >= 97 && (c | 32) <= 122)));
      case 'iscntrl': return ctype(c => c < 32 || c === 127);
      case 'toupper': { const c = i32(0); return this.ret(c >= 97 && c <= 122 ? c - 32 : c); }
      case 'tolower': { const c = i32(0); return this.ret(c >= 65 && c <= 90 ? c + 32 : c); }

      // ---------- POSIX ----------
      case 'write': return this.wrap(this.sysWrite(i32(0), a(1), int(2)));
      case 'read': return this.wrap(this.sysRead(i32(0), a(1), int(2)));
      case 'open': return this.wrap(this.sysOpen(this.str(a(0)), i32(1)));
      case 'close': return this.wrap(this.sysClose(i32(0)));
      case 'lseek': return this.wrap(this.sysLseek(i32(0), int(1), i32(2)));
      case 'fstat': return this.wrap(this.sysFstat(i32(0), a(1)));
      case 'stat': return this.wrap(this.sysStat(this.str(a(0)), a(1)));
      case 'access': return this.wrap(this.files.has(this.normPath(this.str(a(0)))) ? 0 : -E.ENOENT);
      case 'getpid': return this.ret(1337);
      case 'getuid': return this.ret(1000);
      case 'sleep': case 'usleep': return this.ret(0);

      // ---------- math (double in d0/d1, result in d0) ----------
      case 'sqrt': return this.retF(Math.sqrt(this.fpArg(0)));
      case 'pow': return this.retF(Math.pow(this.fpArg(0), this.fpArg(1)));
      case 'fabs': return this.retF(Math.abs(this.fpArg(0)));
      case 'floor': return this.retF(Math.floor(this.fpArg(0)));
      case 'ceil': return this.retF(Math.ceil(this.fpArg(0)));
      case 'round': { const f = this.fpArg(0); return this.retF(f < 0 ? -Math.round(-f) : Math.round(f)); }
      case 'trunc': return this.retF(Math.trunc(this.fpArg(0)));
      case 'fmod': return this.retF(this.fpArg(0) % this.fpArg(1));
      case 'sin': return this.retF(Math.sin(this.fpArg(0)));
      case 'cos': return this.retF(Math.cos(this.fpArg(0)));
      case 'tan': return this.retF(Math.tan(this.fpArg(0)));
      case 'exp': return this.retF(Math.exp(this.fpArg(0)));
      case 'log': return this.retF(Math.log(this.fpArg(0)));
      case 'log10': return this.retF(Math.log10(this.fpArg(0)));
      case 'log2': return this.retF(Math.log2(this.fpArg(0)));

      // ---------- misc ----------
      case 'time': { const t = BigInt(Math.floor(Date.now() / 1000)); if (a(0) !== 0n) sim.store(a(0), 8, t); return this.ret(t); }
      case 'clock': return this.ret(sim.cycleCount);
      case '__errno_location': case '__error': return this.ret(ERRNO_ADDR);
      case '__assert_fail': {
        const expr = this.str(a(0)); const file = this.str(a(1)); const line = i32(2);
        const fn = a(3) !== 0n ? this.str(a(3)) : '?';
        throw new Fault('SIGABRT', `a.out: ${file}:${line}: ${fn}: Assertion \`${expr}' failed.`);
      }
      case '__stack_chk_fail': throw new Fault('SIGABRT', '*** stack smashing detected ***: terminated (the stack canary changed before the function returned)');
      default: throw new Fault('SIGILL', `C library function ${name} is not implemented in the simulator`);
    }
  }
}
