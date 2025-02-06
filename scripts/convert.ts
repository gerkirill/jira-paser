import { NodeHtmlMarkdown, NodeHtmlMarkdownOptions } from 'node-html-markdown';
import * as fs from 'fs';
import path from 'path';


/* ********************************************************* *
 * Single use
 * If using it once, you can use the static method
 * ********************************************************* */

// Single file
const res = NodeHtmlMarkdown.translate(
  /* html */ fs.readFileSync(path.join(__dirname, '..', 'issues', 'ISSUE-251.html'), 'utf-8'),
  /* options (optional) */ {},
  /* customTranslators (optional) */ undefined,
  /* customCodeBlockTranslators (optional) */ undefined
);
console.log(res);
