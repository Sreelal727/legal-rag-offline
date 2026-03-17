// Content script — runs on eCourts pages
// Scrapes case data from the rendered HTML tables

(function () {
  if (window.__legalDeskInjected) return;
  window.__legalDeskInjected = true;

  // ─── Scraping Functions ───

  // Scrape case search results table (advocate search, party search, case number search)
  function scrapeSearchResults() {
    const cases = [];

    // eCourts renders results in tables with case data
    const rows = document.querySelectorAll(
      'table tr[onclick], table tr.case_row, table tbody tr'
    );

    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length < 3) continue;

      // Skip header rows
      const firstText = cells[0]?.textContent?.trim() || '';
      if (firstText === 'Sr No' || firstText === 'S.No' || firstText === '#') continue;

      // Try to extract CNR from onclick or links
      let cnrNumber = '';
      const onclick = row.getAttribute('onclick') || '';
      const cnrMatch = onclick.match(/[A-Z]{4}\d{12}/);
      if (cnrMatch) cnrNumber = cnrMatch[0];

      // Also check links inside the row
      if (!cnrNumber) {
        const links = row.querySelectorAll('a[href], a[onclick]');
        for (const link of links) {
          const href = (link.getAttribute('href') || '') + (link.getAttribute('onclick') || '');
          const m = href.match(/[A-Z]{4}\d{12}/);
          if (m) { cnrNumber = m[0]; break; }
        }
      }

      // Extract cell values
      const cellTexts = Array.from(cells).map((c) => c.textContent?.trim() || '');

      // Try to parse structured data from cells
      const caseData = {
        cnrNumber,
        caseNumber: '',
        caseType: '',
        year: '',
        petitioner: '',
        respondent: '',
        status: '',
        court: '',
      };

      // Different eCourts pages have different column orders
      // Common patterns:
      // [Sr, CaseType/Number/Year, Petitioner vs Respondent, Status]
      // [Sr, CaseNumber, Parties, Advocate, NextDate, Status]
      for (const text of cellTexts) {
        // Case number pattern: TYPE/NUMBER/YEAR
        if (/^[A-Z]{1,10}\/\d+\/\d{4}$/.test(text) && !caseData.caseNumber) {
          caseData.caseNumber = text;
          const parts = text.split('/');
          caseData.caseType = parts[0];
          caseData.year = parts[2];
        }
        // "vs" or "v/s" pattern for parties
        else if ((text.includes(' vs ') || text.includes(' v/s ')) && !caseData.petitioner) {
          const sep = text.includes(' vs ') ? ' vs ' : ' v/s ';
          const partyParts = text.split(sep);
          caseData.petitioner = partyParts[0]?.trim() || '';
          caseData.respondent = partyParts[1]?.trim() || '';
        }
        // Status keywords
        else if (/^(pending|disposed|disposed off|case disposed|allowed|dismissed|decreed|case running)/i.test(text) && !caseData.status) {
          caseData.status = text;
        }
      }

      // Only add if we got meaningful data
      if (caseData.cnrNumber || caseData.caseNumber || caseData.petitioner) {
        cases.push(caseData);
      }
    }

    return cases;
  }

  // Scrape full case status page (CNR lookup result)
  function scrapeCaseStatus() {
    const body = document.body.innerHTML;

    const getTableValue = (label) => {
      // Try multiple patterns for table cell labels
      const patterns = [
        new RegExp(label + '[\\s:]*</(?:td|th|span|b|strong)>[\\s]*<(?:td|span)[^>]*>([^<]+)', 'i'),
        new RegExp(label + '[\\s:]*([^<\\n]+)', 'i'),
      ];
      for (const regex of patterns) {
        const match = body.match(regex);
        if (match) return match[1].trim();
      }
      return '';
    };

    const cnrNumber = getTableValue('CNR Number') || getTableValue('CNR');
    if (!cnrNumber && !body.includes('Case Number')) return null;

    // Parse hearing history
    const hearingHistory = [];
    const tables = document.querySelectorAll('table');
    for (const table of tables) {
      const headers = table.querySelectorAll('th');
      const headerTexts = Array.from(headers).map((h) => h.textContent?.trim()?.toLowerCase() || '');

      if (headerTexts.some((h) => h.includes('business') || h.includes('hearing') || h.includes('purpose'))) {
        const rows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
        for (const row of rows) {
          if (row.querySelector('th')) continue;
          const cells = row.querySelectorAll('td');
          if (cells.length >= 3) {
            const dateText = cells[0]?.textContent?.trim() || '';
            if (/\d{2}-\d{2}-\d{4}/.test(dateText)) {
              hearingHistory.push({
                date: dateText,
                judge: cells[1]?.textContent?.trim() || '',
                businessOnDate: cells[2]?.textContent?.trim() || '',
                purpose: cells[3]?.textContent?.trim() || cells[2]?.textContent?.trim() || '',
              });
            }
          }
        }
      }
    }

    // Parse orders
    const orders = [];
    for (const table of tables) {
      const headers = table.querySelectorAll('th');
      const headerTexts = Array.from(headers).map((h) => h.textContent?.trim()?.toLowerCase() || '');

      if (headerTexts.some((h) => h.includes('order'))) {
        const rows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
        for (const row of rows) {
          if (row.querySelector('th')) continue;
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const dateText = cells[0]?.textContent?.trim() || '';
            if (/\d{2}-\d{2}-\d{4}/.test(dateText)) {
              orders.push({
                date: dateText,
                description: cells[1]?.textContent?.trim() || '',
              });
            }
          }
        }
      }
    }

    // Parse acts
    const acts = [];
    const actsRegex = /Under Act\(s\)[^<]*<[^>]*>([^<]+)/gi;
    let actsMatch;
    while ((actsMatch = actsRegex.exec(body)) !== null) {
      acts.push(actsMatch[1].trim());
    }

    return {
      cnrNumber: cnrNumber || getTableValue('CNR Number'),
      caseNumber: getTableValue('Case Number') || getTableValue('Registration Number') || getTableValue('Case No'),
      caseType: getTableValue('Case Type'),
      filingDate: getTableValue('Filing Date'),
      registrationDate: getTableValue('Registration Date'),
      courtName: getTableValue('Court Name') || getTableValue('Court Number') || getTableValue('Court'),
      judge: getTableValue('Judge') || getTableValue('Coram'),
      status: getTableValue('Case Status') || getTableValue('Status'),
      nextHearingDate: getTableValue('Next Hearing Date') || getTableValue('Next Date') || null,
      petitioner: getTableValue('Petitioner') || getTableValue('Applicant'),
      respondent: getTableValue('Respondent') || getTableValue('Opposite Party'),
      petitionerAdvocate: getTableValue('Petitioner Advocate') || getTableValue('Pet. Advocate'),
      respondentAdvocate: getTableValue('Respondent Advocate') || getTableValue('Res. Advocate'),
      acts,
      hearingHistory,
      orders,
    };
  }

  // Auto-detect what type of page we're on and scrape accordingly
  function scrapeCurrentPage() {
    const url = window.location.href;
    const body = document.body.innerHTML.toLowerCase();

    // Check if this is a case status/detail page
    if (body.includes('cnr number') || body.includes('case status') || body.includes('hearing date')) {
      const caseStatus = scrapeCaseStatus();
      if (caseStatus && (caseStatus.cnrNumber || caseStatus.caseNumber)) {
        return { type: 'case_detail', data: caseStatus };
      }
    }

    // Check if this is a search results page
    const searchResults = scrapeSearchResults();
    if (searchResults.length > 0) {
      return { type: 'search_results', data: searchResults };
    }

    return { type: 'empty', data: null };
  }

  // ─── Floating Button ───

  const btn = document.createElement('div');
  btn.id = 'legaldesk-fab';
  btn.innerHTML = `
    <div id="legaldesk-fab-btn" title="Send to LegalDesk">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    </div>
    <div id="legaldesk-panel" style="display:none;">
      <div id="legaldesk-panel-header">
        <strong>LegalDesk Importer</strong>
        <span id="legaldesk-close">&times;</span>
      </div>
      <div id="legaldesk-panel-body">
        <div id="legaldesk-status">Scanning page...</div>
        <div id="legaldesk-results" style="display:none;"></div>
        <div id="legaldesk-actions" style="display:none;">
          <div id="legaldesk-server-url-group">
            <label>Server URL</label>
            <input type="text" id="legaldesk-server-url" placeholder="http://localhost:3000" />
          </div>
          <button id="legaldesk-send-btn">Send to LegalDesk</button>
        </div>
        <div id="legaldesk-progress" style="display:none;"></div>
      </div>
    </div>
  `;
  document.body.appendChild(btn);

  const fab = document.getElementById('legaldesk-fab-btn');
  const panel = document.getElementById('legaldesk-panel');
  const closeBtn = document.getElementById('legaldesk-close');
  const statusEl = document.getElementById('legaldesk-status');
  const resultsEl = document.getElementById('legaldesk-results');
  const actionsEl = document.getElementById('legaldesk-actions');
  const sendBtn = document.getElementById('legaldesk-send-btn');
  const progressEl = document.getElementById('legaldesk-progress');
  const serverUrlInput = document.getElementById('legaldesk-server-url');

  // Load saved server URL
  chrome.storage.local.get('legalDeskServerUrl', (data) => {
    if (data.legalDeskServerUrl) {
      serverUrlInput.value = data.legalDeskServerUrl;
    }
  });

  let scrapedData = null;

  fab.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    if (panel.style.display !== 'none') {
      scanPage();
    }
  });

  closeBtn.addEventListener('click', () => {
    panel.style.display = 'none';
  });

  function scanPage() {
    statusEl.textContent = 'Scanning page...';
    resultsEl.style.display = 'none';
    actionsEl.style.display = 'none';
    progressEl.style.display = 'none';

    scrapedData = scrapeCurrentPage();

    if (scrapedData.type === 'empty' || !scrapedData.data) {
      statusEl.textContent = 'No case data found on this page. Navigate to a case search result or case status page.';
      return;
    }

    if (scrapedData.type === 'case_detail') {
      const d = scrapedData.data;
      statusEl.textContent = 'Found case details:';
      resultsEl.innerHTML = `
        <div class="legaldesk-case-card">
          <div class="legaldesk-case-title">${d.caseNumber || d.cnrNumber || 'Unknown'}</div>
          <div class="legaldesk-case-parties">${d.petitioner || '?'} vs ${d.respondent || '?'}</div>
          <div class="legaldesk-case-meta">
            ${d.cnrNumber ? `<span>CNR: ${d.cnrNumber}</span>` : ''}
            ${d.status ? `<span class="legaldesk-badge">${d.status}</span>` : ''}
            ${d.nextHearingDate ? `<span>Next: ${d.nextHearingDate}</span>` : ''}
          </div>
          ${d.hearingHistory.length > 0 ? `<div class="legaldesk-case-meta">${d.hearingHistory.length} hearing(s) found</div>` : ''}
        </div>
      `;
      resultsEl.style.display = 'block';
      actionsEl.style.display = 'block';
      sendBtn.textContent = 'Import This Case';
    }

    if (scrapedData.type === 'search_results') {
      const cases = scrapedData.data;
      statusEl.textContent = `Found ${cases.length} case(s):`;
      resultsEl.innerHTML = cases
        .map(
          (c, i) => `
        <label class="legaldesk-case-row">
          <input type="checkbox" class="legaldesk-case-check" data-index="${i}" checked />
          <div class="legaldesk-case-info">
            <div class="legaldesk-case-title">${c.caseNumber || c.cnrNumber || 'Case ' + (i + 1)}</div>
            <div class="legaldesk-case-parties">${c.petitioner || '?'} vs ${c.respondent || '?'}</div>
            ${c.cnrNumber ? `<div class="legaldesk-case-meta"><span>CNR: ${c.cnrNumber}</span></div>` : ''}
          </div>
        </label>
      `
        )
        .join('');
      resultsEl.style.display = 'block';
      actionsEl.style.display = 'block';
      sendBtn.textContent = `Import ${cases.length} Case(s)`;

      // Update button count on checkbox change
      resultsEl.addEventListener('change', () => {
        const checked = resultsEl.querySelectorAll('.legaldesk-case-check:checked');
        sendBtn.textContent = `Import ${checked.length} Case(s)`;
      });
    }
  }

  sendBtn.addEventListener('click', async () => {
    const serverUrl = serverUrlInput.value.trim().replace(/\/$/, '');
    if (!serverUrl) {
      progressEl.style.display = 'block';
      progressEl.innerHTML = '<div class="legaldesk-error">Please enter your LegalDesk server URL</div>';
      return;
    }

    // Save server URL
    chrome.storage.local.set({ legalDeskServerUrl: serverUrl });

    sendBtn.disabled = true;
    progressEl.style.display = 'block';
    progressEl.innerHTML = '<div class="legaldesk-loading">Sending to LegalDesk...</div>';

    try {
      if (scrapedData.type === 'case_detail') {
        // Send single case detail
        const res = await fetch(`${serverUrl}/api/ecourts/extension-import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: 'case_detail',
            cases: [scrapedData.data],
          }),
        });
        const result = await res.json();
        if (res.ok) {
          progressEl.innerHTML = `<div class="legaldesk-success">Imported successfully! Case: ${result.imported || 1}</div>`;
        } else {
          progressEl.innerHTML = `<div class="legaldesk-error">${result.error || 'Import failed'}</div>`;
        }
      }

      if (scrapedData.type === 'search_results') {
        // Get selected cases
        const checkboxes = resultsEl.querySelectorAll('.legaldesk-case-check:checked');
        const selectedIndices = Array.from(checkboxes).map((cb) => parseInt(cb.dataset.index));
        const selectedCases = selectedIndices.map((i) => scrapedData.data[i]);

        if (selectedCases.length === 0) {
          progressEl.innerHTML = '<div class="legaldesk-error">No cases selected</div>';
          sendBtn.disabled = false;
          return;
        }

        const res = await fetch(`${serverUrl}/api/ecourts/extension-import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: 'search_results',
            cases: selectedCases,
          }),
        });
        const result = await res.json();
        if (res.ok) {
          progressEl.innerHTML = `
            <div class="legaldesk-success">
              Import complete!<br/>
              ${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed
            </div>`;
        } else {
          progressEl.innerHTML = `<div class="legaldesk-error">${result.error || 'Import failed'}</div>`;
        }
      }
    } catch (err) {
      progressEl.innerHTML = `<div class="legaldesk-error">Connection failed. Make sure LegalDesk is running at ${serverUrl}</div>`;
    }

    sendBtn.disabled = false;
  });

  // Re-scan when page content changes (eCourts loads results via AJAX)
  const observer = new MutationObserver(() => {
    if (panel.style.display !== 'none') {
      // Debounce
      clearTimeout(window.__legalDeskScanTimeout);
      window.__legalDeskScanTimeout = setTimeout(scanPage, 500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
