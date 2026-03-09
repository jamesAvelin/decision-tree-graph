import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900 },
});

const page = await browser.newPage();
await page.goto('https://app.together-made.com/signin', { waitUntil: 'networkidle2', timeout: 30000 });
await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });

const emailInput = await page.$('input[type="email"], input[name="email"]');
await emailInput.click({ clickCount: 3 });
await emailInput.type('jameslondal@gmail.com');
const passInput = await page.$('input[type="password"], input[name="password"]');
await passInput.click({ clickCount: 3 });
await passInput.type('G8LYCcRXeaMFpqS');
const submitBtn = await page.$('button[type="submit"]');
await submitBtn.click();
await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
await new Promise(r => setTimeout(r, 3000));

await page.goto('https://app.together-made.com/guidance/G000000000000000000000001/decision-tree', {
  waitUntil: 'domcontentloaded',
  timeout: 45000,
});
await new Promise(r => setTimeout(r, 8000));

// Close the install prompt if present
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const notNow = btns.find(b => b.textContent?.includes('Not now'));
  if (notNow) notNow.click();
});
await new Promise(r => setTimeout(r, 500));

// Click "fit view" in ReactFlow controls to see the whole tree
await page.evaluate(() => {
  const fitBtn = document.querySelector('.react-flow__controls-fitview');
  if (fitBtn) fitBtn.click();
});
await new Promise(r => setTimeout(r, 2000));

await page.screenshot({ path: '/tmp/together-made-full.png', fullPage: false });
console.log('Full tree screenshot saved');

// Now extract detailed node styling
const analysis = await page.evaluate(() => {
  const results = {};

  // Get a custom node's inner structure
  const customNodes = document.querySelectorAll('.react-flow__node-custom');
  if (customNodes.length > 0) {
    const first = customNodes[0];
    results.nodeOuterHTML = first.innerHTML.slice(0, 1000);

    // Get all child element styles
    const children = first.querySelectorAll('*');
    results.nodeChildStyles = [];
    for (let i = 0; i < Math.min(10, children.length); i++) {
      const el = children[i];
      const cs = getComputedStyle(el);
      results.nodeChildStyles.push({
        tag: el.tagName,
        class: el.className?.toString?.()?.slice(0, 200) || '',
        bg: cs.backgroundColor,
        border: cs.border,
        borderRadius: cs.borderRadius,
        color: cs.color,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        padding: cs.padding,
        text: el.textContent?.slice(0, 60),
      });
    }
  }

  // Get edge path styles from ReactFlow edges
  const rfEdges = document.querySelectorAll('.react-flow__edge');
  results.edgeCount = rfEdges.length;
  if (rfEdges.length > 0) {
    const edge = rfEdges[0];
    results.edgeOuterHTML = edge.innerHTML.slice(0, 500);
    const paths = edge.querySelectorAll('path');
    results.edgePaths = [];
    for (const p of paths) {
      const cs = getComputedStyle(p);
      results.edgePaths.push({
        stroke: p.getAttribute('stroke') || cs.stroke,
        strokeWidth: p.getAttribute('stroke-width') || cs.strokeWidth,
        fill: p.getAttribute('fill'),
        markerEnd: p.getAttribute('marker-end'),
        d: p.getAttribute('d')?.slice(0, 100),
      });
    }
  }

  // Background pattern
  const bgSvg = document.querySelector('.react-flow__background');
  if (bgSvg) {
    results.bgPattern = bgSvg.innerHTML.slice(0, 300);
  }

  // ReactFlow panel/viewport background
  const pane = document.querySelector('.react-flow__pane');
  if (pane) {
    results.paneBg = getComputedStyle(pane).backgroundColor;
  }
  const renderer = document.querySelector('.react-flow__renderer');
  if (renderer) {
    results.rendererBg = getComputedStyle(renderer).backgroundColor;
  }
  const rf = document.querySelector('.react-flow');
  if (rf) {
    results.rfBg = getComputedStyle(rf).backgroundColor;
    results.rfClasses = rf.className.slice(0, 300);
  }

  return results;
});

console.log('\n--- Node Structure ---');
console.log('Node HTML:', analysis.nodeOuterHTML);
console.log('\nNode child styles:');
for (const s of analysis.nodeChildStyles || []) {
  console.log(`  <${s.tag}> bg=${s.bg} border=${s.border} radius=${s.borderRadius} color=${s.color} font=${s.fontSize}/${s.fontWeight} pad=${s.padding} "${s.text?.slice(0,40)}"`);
}

console.log('\n--- Edge Structure ---');
console.log('Edge count:', analysis.edgeCount);
console.log('Edge HTML:', analysis.edgeOuterHTML);
for (const p of analysis.edgePaths || []) {
  console.log(`  Path stroke=${p.stroke} width=${p.strokeWidth} fill=${p.fill} marker=${p.markerEnd}`);
}

console.log('\n--- Background ---');
console.log('BG pattern:', analysis.bgPattern);
console.log('Pane BG:', analysis.paneBg);
console.log('Renderer BG:', analysis.rendererBg);
console.log('RF BG:', analysis.rfBg);
console.log('RF classes:', analysis.rfClasses);

await browser.close();
