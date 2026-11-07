// Run against a running local server. Uses an existing Chromium and Playwright installation.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.WORKSHOP_PLAYWRIGHT || 'playwright');
const out = process.env.WORKSHOP_SCREENSHOTS || 'outputs';
const base = process.env.WORKSHOP_URL || 'http://127.0.0.1:5173/';
await mkdir(out,{recursive:true});
const browser = await chromium.launch({
  channel: process.env.WORKSHOP_CHROME ? undefined : 'chrome',
  executablePath: process.env.WORKSHOP_CHROME,
  args:['--enable-unsafe-swiftshader'],
});
const errors = [];
try {
  const page = await browser.newPage({viewport:{width:1440,height:1050}});
  page.on('pageerror',e => errors.push(e.message));
  await page.goto(base);
  await page.locator('.viewport canvas').waitFor();
  await page.getByRole('button',{name:'Inspect Input 1',exact:true}).waitFor();
  const weight = page.getByRole('spinbutton',{name:'Weight',exact:true});
  const guess = page.getByRole('spinbutton',{name:'Predicted output y'});
  const send = page.getByRole('button',{name:'Send signal'});
  const choose = page.getByLabel('Component');
  const reset = page.getByRole('button',{name:'Reset bench'});
  await page.screenshot({path:join(out,'neural-workshop-desktop.png'),fullPage:true});

  // Click a visible part of the selected cable, independent of the DOM controls.
  const wire = await page.locator('.wire-tag').boundingBox();
  assert.ok(wire);
  await choose.selectOption('h2-y');
  await page.mouse.click(wire.x + wire.width/2,wire.y + wire.height/2 + 5);
  assert.equal(await choose.inputValue(),'x1-h1');
  await page.getByRole('button',{name:'Inspect Hidden 1 bias',exact:true}).focus();
  await page.keyboard.press('Enter');
  assert.equal(await choose.inputValue(),'h1');
  await choose.selectOption('x1-h1');

  await send.click();
  await page.getByRole('alert').getByText('Enter a numeric prediction first.').waitFor();
  await guess.fill('-1.25');
  await send.click();
  await page.getByText('Negative sum blocked',{exact:false}).waitFor();
  await page.getByText('Lift below target').waitFor();
  assert.equal(await page.locator('.lift-tag span').textContent(),'-1.25');
  await page.screenshot({path:join(out,'neural-workshop-relu-blocked.png'),fullPage:true});

  await weight.fill('11');
  assert.equal(await weight.getAttribute('aria-invalid'),'true');
  assert.equal(await page.locator('.wire-tag').textContent(),'0.5');
  await weight.fill('3');
  assert.equal(await guess.inputValue(),'');
  assert.equal(await page.locator('.lift-tag span').textContent(),'—');
  await guess.fill('1');
  await send.click();
  await page.getByText('Lift reached target').waitFor();
  assert.equal(await page.getByText('Challenge complete').count(),0);
  await guess.fill('1.75');
  await send.click();
  await page.getByText('Challenge complete').waitFor();
  assert.equal(await page.locator('.lift-tag span').textContent(),'1.75');
  await page.screenshot({path:join(out,'neural-workshop-lift-raised.png'),fullPage:true});
  await page.getByText('See the calculation').click();
  await page.getByText('The output is linear:',{exact:false}).waitFor();

  await guess.fill('1.75');
  await send.click();
  await weight.fill('2');
  assert.equal(await page.locator('.lift-tag span').textContent(),'—');
  assert.equal(await guess.inputValue(),'');
  await reset.click();
  assert.equal(await weight.inputValue(),'0.5');

  const mobile = await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce',isMobile:true,hasTouch:true});
  mobile.on('pageerror',e => errors.push(e.message));
  await mobile.goto(base);
  await mobile.locator('.viewport canvas').waitFor();
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
  await mobile.getByRole('spinbutton',{name:'Weight',exact:true}).fill('3');
  await mobile.getByRole('spinbutton',{name:'Predicted output y'}).fill('1.75');
  await mobile.getByRole('button',{name:'Send signal'}).click();
  await mobile.getByText('Challenge complete').waitFor({timeout:2000});
  await mobile.screenshot({path:join(out,'neural-workshop-mobile.png'),fullPage:true});

  const fallback = await browser.newPage();
  fallback.on('pageerror',e => errors.push(e.message));
  await fallback.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type,...args) {
      return type.startsWith('webgl') ? null : getContext.call(this,type,...args);
    };
  });
  await fallback.goto(base);
  await fallback.getByText('3D is unavailable.',{exact:false}).waitFor();
  await fallback.getByRole('spinbutton',{name:'Predicted output y'}).fill('-1.25');
  await fallback.getByRole('button',{name:'Send signal'}).click();
  await fallback.getByText('Lift below target').waitFor();
  assert.deepEqual(errors,[]);
  console.log('Passed: cable picking, keyboard, invalid inputs, ReLU, lift and grading, edit cancellation, reset, mobile, reduced motion and WebGL fallback.');
} finally {
  await browser.close();
}
