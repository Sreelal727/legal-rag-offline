const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];
  const check = (name, pass) => { results.push({ name, pass }); console.log(pass ? `  ✅ ${name}` : `  ❌ ${name}`); };

  try {
    // Login as ADMIN Anathakrishnan
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.fill('input[type="email"]', 'anathakrishnan@legalrag.com');
    await page.fill('input[type="password"]', 'changeme123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(15000);
    check('Login works', page.url().includes('/dashboard'));

    // Settings (now as ADMIN)
    await page.goto('http://localhost:3000/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);
    const settings = await page.textContent('body');
    check('Settings shows Gouriankar Associates', settings.includes('Gouriankar'));
    check('Settings shows Palakkad address', settings.includes('Palakkad') || settings.includes('678'));

    // Users page (ADMIN only)
    await page.goto('http://localhost:3000/users', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);
    const users = await page.textContent('body');
    check('Users shows Ananthakrishnan', users.includes('Ananthakrishnan'));
    check('Users shows Gourisankar', users.includes('Gourisankar'));

    // Templates - check Palakkad custom templates
    await page.goto('http://localhost:3000/templates', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);
    const templates = await page.textContent('body');
    check('Has EP Affidavit template', templates.includes('Affidavit'));
    check('Has EP Attachment template', templates.includes('Attachment'));

    // Cases - check real data
    await page.goto('http://localhost:3000/cases', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);
    const cases = await page.textContent('body');
    check('Has O.S. cases', cases.includes('O.S.'));
    check('Has Subordinate Judge court', cases.includes('Subordinate') || cases.includes('Munsiff') || cases.includes('Court'));

    // Clients - check real bank clients
    await page.goto('http://localhost:3000/clients', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);
    const clients = await page.textContent('body');
    check('Has bank clients', clients.includes('Bank'));

    // Clean product checks
    check('No Kumar & Associates anywhere', !settings.includes('Kumar'));
    check('No sample Mahesh Industries', !clients.includes('Mahesh'));
    check('No sample CS/123/2024', !cases.includes('CS/123/2024'));

  } catch (e) {
    console.error('Error:', e.message);
  }

  const passed = results.filter(r => r.pass).length;
  console.log(`\n=== Final: ${passed}/${results.length} passed ===\n`);

  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})();
