// Exceptions shared by the simulator engine and its C runtime.

// A hardware/OS-level fault that kills the process (SIGSEGV, SIGBUS, ...).
// signal 'ASAN' is an AddressSanitizer report.
export class Fault extends Error {
  constructor(signal, message) { super(message); this.signal = signal; }
}

// Normal process exit (exit(), exit_group, return from main).
export class ExitSignal extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
