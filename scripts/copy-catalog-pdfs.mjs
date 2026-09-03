import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const [repoRoot, siteDir] = process.argv.slice(2);
if (!repoRoot || !siteDir) {
  throw new Error("Usage: node copy-catalog-pdfs.mjs <repository-root> <site-directory>");
}

const catalogSource = await fs.readFile(path.join(repoRoot, "paper-navigator", "papers-data.js"), "utf8");
const context = { window: {} };
vm.runInNewContext(catalogSource, context, { filename: "papers-data.js" });
const papers = context.window.PAPER_CATALOG || [];
const copied = new Set();

for (const paper of papers) {
  if (!paper.pdf || /^https?:/i.test(paper.pdf)) continue;
  const relativePdf = decodeURI(paper.pdf).replace(/^\.\.\//, "");
  if (!relativePdf.startsWith("Quantum_DB_Papers/")) {
    throw new Error(`Unexpected local PDF path: ${paper.pdf}`);
  }
  if (copied.has(relativePdf)) continue;
  const source = path.join(repoRoot, relativePdf);
  const destination = path.join(siteDir, relativePdf);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
  copied.add(relativePdf);
}

console.log(`Copied ${copied.size} catalog-linked PDFs.`);
