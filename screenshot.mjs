import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900 },
});

const page = await browser.newPage();

// Go to sign in
await page.goto('https://app.together-made.com/signin', { waitUntil: 'networkidle2', timeout: 30000 });
await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });

// Fill credentials
const emailInput = await page.$('input[type="email"], input[name="email"]');
await emailInput.click({ clickCount: 3 });
await emailInput.type('jameslondal@gmail.com');

const passInput = await page.$('input[type="password"], input[name="password"]');
await passInput.click({ clickCount: 3 });
await passInput.type('G8LYCcRXeaMFpqS');

// Submit
const submitBtn = await page.$('button[type="submit"]');
await submitBtn.click();

// Wait for navigation after login
await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
await new Promise(r => setTimeout(r, 3000));

console.log('After login URL:', page.url());

// Navigate to decision tree — use domcontentloaded and longer timeout
await page.goto('https://app.together-made.com/guidance/G000000000000000000000001/decision-tree', {
  waitUntil: 'domcontentloaded',
  timeout: 45000,
});

// Wait for content to render
await new Promise(r => setTimeout(r, 8000));
console.log('Decision tree URL:', page.url());

// Take screenshot
await page.screenshot({ path: '/tmp/together-made-tree.png', fullPage: false });
console.log('Screenshot saved to /tmp/together-made-tree.png');

// Analyze the page
const treeHTML = await page.evaluate(() => {
  const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
  const elements = main.querySelectorAll('*');
  const styles = new Set();
  const classNames = new Set();

  for (const el of elements) {
    if (el.className && typeof el.className === 'string') {
      el.className.split(' ').forEach(c => {
        if (c.match(/node|edge|tree|graph|flow|react-flow|handle|canvas|svg|elk/i)) {
          classNames.add(c);
        }
      });
    }
    if (el.tagName === 'svg' || el.tagName === 'SVG') {
      styles.add(`SVG found: ${el.getAttribute('width')}x${el.getAttribute('height')}, class=${el.getAttribute('class')}`);
    }
    if (el.tagName === 'canvas' || el.tagName === 'CANVAS') {
      styles.add(`Canvas found: ${el.width}x${el.height}`);
    }
  }

  // ReactFlow
  const reactFlowEl = document.querySelector('.react-flow') || document.querySelector('[class*="reactflow"]');
  if (reactFlowEl) {
    const cs = getComputedStyle(reactFlowEl);
    styles.add(`ReactFlow bg: ${cs.backgroundColor}`);
  }

  // Nodes
  const nodeEls = document.querySelectorAll('.react-flow__node, [class*="node"]');
  for (let i = 0; i < Math.min(3, nodeEls.length); i++) {
    const el = nodeEls[i];
    const cs = getComputedStyle(el);
    styles.add(`Node[${i}] tag=${el.tagName} class="${el.className}" bg=${cs.backgroundColor} border=${cs.border} radius=${cs.borderRadius} shadow=${cs.boxShadow} w=${cs.width} h=${cs.height}`);
    // Get inner text
    styles.add(`Node[${i}] text="${el.textContent?.slice(0, 80)}"`);
  }
  styles.add(`Node count: ${nodeEls.length}`);

  // Edges
  const edgePaths = document.querySelectorAll('.react-flow__edge path, [class*="edge"] path, svg path');
  for (let i = 0; i < Math.min(3, edgePaths.length); i++) {
    const p = edgePaths[i];
    styles.add(`Path[${i}] stroke=${p.getAttribute('stroke')} strokeWidth=${p.getAttribute('stroke-width')} fill=${p.getAttribute('fill')} d=${p.getAttribute('d')?.slice(0, 80)}`);
  }
  styles.add(`SVG path count: ${edgePaths.length}`);

  // Background dots pattern?
  const bgEls = document.querySelectorAll('.react-flow__background, [class*="background"]');
  for (const bg of bgEls) {
    styles.add(`Background element: tag=${bg.tagName} class="${bg.className}"`);
  }

  return {
    classNames: [...classNames].slice(0, 50),
    styles: [...styles],
    bodyBg: getComputedStyle(document.body).backgroundColor,
    title: document.title,
    url: window.location.href,
    outerHTML: main.innerHTML.slice(0, 500),
  };
});

console.log('\n--- Page Analysis ---');
console.log('Title:', treeHTML.title);
console.log('URL:', treeHTML.url);
console.log('Body BG:', treeHTML.bodyBg);
console.log('Tree classes:', treeHTML.classNames.join(', '));
console.log('\nStyles:');
for (const s of treeHTML.styles) console.log(' ', s);
console.log('\nFirst 500 chars of main HTML:');
console.log(treeHTML.outerHTML);

await browser.close();
