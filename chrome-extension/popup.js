const serverUrlInput = document.getElementById('server-url');
const saveBtn = document.getElementById('save-btn');
const statusEl = document.getElementById('status');

// Load saved URL
chrome.storage.local.get('legalDeskServerUrl', (data) => {
  if (data.legalDeskServerUrl) {
    serverUrlInput.value = data.legalDeskServerUrl;
  }
});

saveBtn.addEventListener('click', () => {
  const url = serverUrlInput.value.trim().replace(/\/$/, '');
  if (!url) {
    statusEl.className = 'status error';
    statusEl.textContent = 'Please enter a URL';
    return;
  }

  chrome.storage.local.set({ legalDeskServerUrl: url }, () => {
    statusEl.className = 'status success';
    statusEl.textContent = 'Settings saved!';
    setTimeout(() => {
      statusEl.className = 'status';
    }, 2000);
  });
});
