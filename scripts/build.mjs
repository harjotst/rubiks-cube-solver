/**
 * Assemble the deployable site into dist/: no bundling, just the files the
 * browser needs. GitHub Pages serves dist/ from the gh-pages branch.
 */
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';

const out = 'dist';
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const entry of ['index.html', 'style.css', 'app', 'src']) {
  await cp(entry, `${out}/${entry}`, { recursive: true });
}
await writeFile(`${out}/.nojekyll`, '');
console.log(`Built ${out}/`);
