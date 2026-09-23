/**
 * Client-side PDF → text with pdf.js. The library (and its worker) is loaded
 * lazily, so users who paste text never download it. The file never leaves
 * the browser.
 */
export async function pdfToText(file: File): Promise<string> {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data });
  const doc = await task.promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = '';
    const lines: string[] = [];
    let lastY: number | null = null;
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = item.transform[5] as number;
      // A change in baseline means a new visual line.
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line.trim());
        line = '';
      }
      line += item.str + (item.hasEOL ? '\n' : '');
      lastY = y;
    }
    if (line.trim()) lines.push(line.trim());
    pages.push(lines.join('\n'));
  }
  await task.destroy();
  return pages
    .join('\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
