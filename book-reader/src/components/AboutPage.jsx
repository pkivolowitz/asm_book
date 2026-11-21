import { Link } from 'react-router-dom';
import { useTitle } from '../lib/useTitle';
import { lessonUrl } from '../lib/routes';

const AboutPage = () => {
  useTitle('About');
  return (
    <article className="markdown-body about-page">
      <h1>About Low-Level Lab</h1>
      <p>
        Low-Level Lab is a free place to learn ARM64 assembly and C by running code, and to build
        the foundation that mobile security research needs: reading disassembly, understanding
        memory, and finding bugs with tools instead of luck. It is made for self-learners, and
        practicing a little every day is the idea behind the <Link to="/practice">practice track</Link>.
      </p>

      <h2>Credits and license</h2>
      <p>
        The book <em>A Gentle Introduction to Assembly Language Programming</em> is by{' '}
        <strong>Perry Kivolowitz</strong> (<a href="https://github.com/pkivolowitz/asm_book" target="_blank" rel="noopener noreferrer">original repository</a>).
        It is licensed under{' '}
        <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-NC-SA 4.0</a>,
        and so is this edition.
      </p>
      <p>
        This edition is a fork (<a href="https://github.com/Petec0x0/asm_book" target="_blank" rel="noopener noreferrer">source on GitHub</a>).
        It adds the in-browser ARM64 simulator and debugger, the C compiler and runtime, the graded
        lesson exercises, practice levels and C labs, the C course chapters, and Section 6 on mobile
        security. These additions are not reviewed or endorsed by the original author, so report
        mistakes in them to this fork, not upstream.
      </p>

      <h2>Your data</h2>
      <ul>
        <li>There are no accounts, ads or analytics.</li>
        <li>Your code runs in your browser. It is never uploaded.</li>
        <li>
          Solved levels, your streak, drafts and the last lesson you read are saved in this
          browser&apos;s local storage only. Clearing site data or using a private window removes
          them. Use Export and Import on the <Link to="/practice">Practice page</Link> to back them up or
          move them to another device.
        </li>
        <li>
          Like any website, the host sees ordinary request logs (such as IP addresses). The fonts are
          loaded from Google Fonts, so Google sees those font requests too.
        </li>
      </ul>

      <h2>Using the security material</h2>
      <p>
        <Link to={lessonUrl('section_5_exploitation/debugging_with_gdb.md')}>Section 5</Link> and{' '}
        <Link to={lessonUrl('section_6_mobile/README.md')}>Section 6</Link> explain how memory-safety bugs
        are found and why mitigations matter. Practice on your own code, your own devices, emulators and
        deliberately vulnerable training targets. Testing apps, devices or services you do not own is only
        acceptable under a bug bounty program or with written permission.
      </p>

      <h2>Limits of the simulator</h2>
      <p>
        The simulator runs user-mode AArch64 Linux programs and is strict about what the GNU assembler
        accepts, but it is not a real CPU: there are no SIMD vector instructions or threads, and the C
        compiler does not support bit-fields, variable-length arrays or <code>va_list</code> yet. For
        those, and for anything in Sections 5 and 6, use a real ARM64 Linux machine or QEMU, as the{' '}
        <Link to={lessonUrl('section_6_mobile/01_lab_setup.md')}>lab setup chapter</Link> describes.
      </p>
    </article>
  );
};

export default AboutPage;
