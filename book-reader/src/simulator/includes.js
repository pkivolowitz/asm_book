// Files the simulator can #include. The book's portability macros come from
// the repo's macros/ directory so they never drift from the canonical copy.
import CONVERGENCE_MACROS from '../../../macros/apple-linux-convergence.S?raw';

export const SIM_INCLUDES = { 'apple-linux-convergence.S': CONVERGENCE_MACROS };
