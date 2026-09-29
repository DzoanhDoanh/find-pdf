const form = document.querySelector('#scanForm');
const urlInput = document.querySelector('#urlInput');
const scanButton = document.querySelector('#scanButton');
const statusBox = document.querySelector('#status');
const resultsCard = document.querySelector('#resultsCard');
const resultsEl = document.querySelector('#results');
const resultTitle = document.querySelector('#resultTitle');
const copyAllButton = document.querySelector('#copyAllButton');
const downloadButton = document.querySelector('#downloadButton');

let currentLinks = [];

function showStatus(message, type = 'info') {
  statusBox.textContent = message;
  statusBox.className = `status ${type}`;
}

function hideStatus() {
  statusBox.className = 'status hidden';
  statusBox.textContent = '';
}

function setLoading(isLoading) {
  scanButton.disabled = isLoading;
  urlInput.disabled = isLoading;
  scanButton.textContent = isLoading ? 'Đang scan...' : 'Scan';
}

function renderResults(links) {
  currentLinks = links;
  resultTitle.textContent = `${links.length} link PDF`;
  resultsCard.classList.remove('hidden');
  resultsEl.innerHTML = '';

  if (!links.length) {
    resultsEl.innerHTML = '<p class="empty">Không tìm thấy link/API PDF nào trên trang này.</p>';
    return;
  }

  for (const [index, item] of links.entries()) {
    const row = document.createElement('article');
    row.className = 'resultItem';

    const meta = [
      item.source,
      item.status ? `status ${item.status}` : null,
      item.contentType || null,
      item.method || null
    ].filter(Boolean).join(' · ');

    row.innerHTML = `
      <div class="resultIndex">${index + 1}</div>
      <div class="resultBody">
        <a href="${item.url}" target="_blank" rel="noreferrer">${item.url}</a>
        <p>${meta}</p>
      </div>
      <button type="button" class="copyButton">Copy</button>
    `;

    row.querySelector('.copyButton').addEventListener('click', async () => {
      await navigator.clipboard.writeText(item.url);
      showStatus('Đã copy link.', 'success');
    });

    resultsEl.appendChild(row);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideStatus();
  resultsCard.classList.add('hidden');
  setLoading(true);
  showStatus('Đang mở website và bắt network request. Có thể mất vài giây...', 'info');

  try {
    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: urlInput.value.trim() })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Scan thất bại.');
    }

    renderResults(data.links);
    showStatus(`Scan xong: tìm thấy ${data.total} link/API PDF.`, 'success');
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    setLoading(false);
  }
});

copyAllButton.addEventListener('click', async () => {
  const text = currentLinks.map((item) => item.url).join('\n');
  await navigator.clipboard.writeText(text);
  showStatus('Đã copy tất cả link.', 'success');
});

downloadButton.addEventListener('click', () => {
  const text = currentLinks.map((item) => item.url).join('\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'pdf-links.txt';
  link.click();
  URL.revokeObjectURL(url);
});
