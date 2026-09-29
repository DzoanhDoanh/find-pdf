import { chromium } from 'playwright';

const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_WAIT_MS = 5000;

function isPdfUrl(url) {
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('.pdf') || lowerUrl.includes('%2fpdf') || lowerUrl.includes('pdf=');
}

function isPdfContentType(contentType = '') {
  return contentType.toLowerCase().includes('application/pdf');
}

function makeKey(url, source) {
  return `${source}:${url}`;
}

function addResult(resultsMap, data) {
  const key = makeKey(data.url, data.source);

  if (!resultsMap.has(key)) {
    resultsMap.set(key, {
      url: data.url,
      source: data.source,
      method: data.method || null,
      status: data.status || null,
      contentType: data.contentType || null
    });
    return;
  }

  const current = resultsMap.get(key);
  resultsMap.set(key, {
    ...current,
    ...Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined && value !== null)
    )
  });
}

export async function scanPdfLinks(url, options = {}) {
  const waitMs = Math.min(Math.max(options.waitMs || DEFAULT_WAIT_MS, 1000), 20000);
  const resultsMap = new Map();

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true
    });

    const page = await context.newPage();

    page.on('request', (request) => {
      const requestUrl = request.url();
      if (isPdfUrl(requestUrl)) {
        addResult(resultsMap, {
          url: requestUrl,
          source: 'network_request_url',
          method: request.method()
        });
      }
    });

    page.on('response', async (response) => {
      const responseUrl = response.url();
      const headers = response.headers();
      const contentType = headers['content-type'] || '';

      if (isPdfUrl(responseUrl) || isPdfContentType(contentType)) {
        addResult(resultsMap, {
          url: responseUrl,
          source: isPdfContentType(contentType) ? 'response_content_type_pdf' : 'network_response_url',
          status: response.status(),
          contentType
        });
      }
    });

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: DEFAULT_TIMEOUT_MS
    });

    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(waitMs);

    const htmlLinks = await page.evaluate(() => {
      const attrs = ['href', 'src', 'data', 'data-url', 'data-href', 'content'];
      const found = [];

      for (const element of document.querySelectorAll('*')) {
        for (const attr of attrs) {
          const value = element.getAttribute(attr);
          if (value && value.toLowerCase().includes('.pdf')) {
            found.push(value);
          }
        }
      }

      const htmlMatches = document.documentElement.innerHTML.match(/(?:https?:)?\/\/[^\s'"<>]+?\.pdf(?:\?[^\s'"<>]*)?|\/[^\s'"<>]+?\.pdf(?:\?[^\s'"<>]*)?/gi) || [];
      found.push(...htmlMatches);

      return [...new Set(found)];
    });

    for (const link of htmlLinks) {
      const absoluteUrl = new URL(link, url).toString();
      addResult(resultsMap, {
        url: absoluteUrl,
        source: 'html_or_inline_script'
      });
    }

    const links = [...resultsMap.values()].sort((a, b) => a.url.localeCompare(b.url));
    await context.close();

    return { links };
  } finally {
    await browser.close();
  }
}
