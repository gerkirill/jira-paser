import fs from 'fs';
import path from 'path';
import pMap from 'p-map';
import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { CONCURRENCY, HEADED } from './constants';

const BASE_URL = process.env.BASE_URL;
const PROJECT = process.env.PROJECT;
const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;

if (!BASE_URL) console.log('Error: BASE_URL is not set'), process.exit(1);
if (!PROJECT) console.log('Error: PROJECT is not set'), process.exit(1);
if (!USERNAME) console.log('Error: USERNAME is not set'), process.exit(1);
if (!PASSWORD) console.log('Error: PASSWORD is not set'), process.exit(1);

interface Context {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

interface ParsedIssue {
  title: string;
  labels: string[];
  components: string[];
  tags: string[];
  descriptionMd: string;
}

(async function main() {
  const ctx = await init();
  await login(ctx, USERNAME, PASSWORD);
  const ids = await getIssueIDs(ctx);
  // console.log(ids);
  await downloadIssues(ctx, ids);
  await shutdown(ctx);
})();

export async function init(): Promise<Context> {
  const browser = await chromium.launch({ ...HEADED, timeout: 60000 }); // Or 'firefox' or 'webkit'. chromium
  const context = await browser.newContext();
  const page = await context.newPage();
  return { browser, context, page };
}

export async function login(ctx: Context, login: string, password: string) {
  const page = ctx.page;
  await page.goto(BASE_URL + '/login.jsp');
  await page.fill('id=login-form-username', login);
  await page.fill('id=login-form-password', password);
  await page.click('id=login-form-submit');
  await page.waitForURL(BASE_URL + '/secure/Dashboard.jspa');
}

export async function getIssueIDs(ctx: Context) {
  const page = ctx.page;
  await page.goto(BASE_URL + '/projects/' + PROJECT + '/issues?filter=myopenissues');
  const ids = await page.locator('.issue-link-key').evaluateAll(elts => elts.map(e => e.innerText));
  return ids;
}

export async function downloadIssues(ctx: Context, ids: string[]) {
  const browserPool: Array<Page> = await Promise.all(
    Array.from({ length: CONCURRENCY }, () => ctx.context.newPage())
  );

  const poolIndex = Array.from({ length: CONCURRENCY }, () => false);

  await pMap(ids, async id => {
    const idx = poolIndex.indexOf(false);
    poolIndex[idx] = true;
    const page = browserPool[idx];
    await page.goto(BASE_URL + '/browse/' + id);
    const issue = await extractIssue(page);
    const issueMd = issueToMd(issue);
    // console.log(issueMd);
    poolIndex[idx] = false;
    fs.writeFileSync(path.join(__dirname, '..', 'issues', id + '.md'), issueMd);
  }, { concurrency: CONCURRENCY });

  await Promise.all(browserPool.map(p => p.close()));
}

export async function shutdown(ctx: Context) {
  // await ctx.context.close();
  await ctx.browser.close();
}

async function extractIssue(page: Page): Promise<ParsedIssue> {
  const title = await page.locator('#summary-val').evaluate(e => e.innerText);
  const labels = await page.locator('#wrap-labels li').evaluateAll(ls => ls.map(label => label.innerText));
  const components = await page.locator('#components-field a').evaluateAll(els => els.filter(e => !e.classList.contains('ellipsis')).map(e => e.innerText));
  const tags = [...labels, ...components].map((t: string) => t.replace(/[ &\/\\#,+()$~%.'":*?<>{}]/g, '-').replace(/-+/, '-'));

  const descriptionHtml = await page.locator('#description-val').innerHTML();
  const replacements = [
    { source: createRegex('![](/jira/images/icons/emoticons/check.png)'), replacement: '✅' },
    { source: createRegex('![](/jira/images/icons/emoticons/error.png)'), replacement: '❌' },
    { source: createRegex('![](/jira/images/icons/emoticons/help_16.png)'), replacement: '❓' },
    { source: new RegExp(/^### \*\*(.+?):?\*\*/, 'gm'), replacement: '### $1' }, // remove bold text in h3 headers like ### **Labels:**
  ];
  const descriptionMd = replacements.reduce(
    (acc, cur) => acc.replace(cur.source, cur.replacement),
    NodeHtmlMarkdown.translate(descriptionHtml)
  );
  return { title, labels, components, tags, descriptionMd };
}

function issueToMd(issue: ParsedIssue) {
  const { title, labels, components, tags, descriptionMd } = issue;

  const titleHtml = '<h2>' + title + '</h2>';
  const componentsHtml = `<h3>Components</h3>\n<ul>\n${components.map((l: string) => `<li>${l}</li>`).join('\n')}\n</ul>`;
  const labelsHtml = `<h3>Labels</h3>\n<ul>\n${labels.map((l: string) => `<li>${l}</li>`).join('\n')}\n</ul>`;
  const tagsMd = tags.map((t: string) => `#${t}`).join(' ');

  const issueHtml = [titleHtml, tagsMd, labelsHtml, componentsHtml].join('\n');
  const issueMd = NodeHtmlMarkdown.translate(issueHtml) + '\n\n' + '### Description\n\n' + descriptionMd;
  return issueMd;
}

function escapeRegex(s: string) {
  return s.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

function createRegex(s: string): RegExp {
  return new RegExp(escapeRegex(s), 'g');
}