import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanPdfLinks } from './scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/scan', async (req, res) => {
  const { url, waitMs = 5000 } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Vui lòng nhập URL website cần quét.'
    });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({
      success: false,
      error: 'URL không hợp lệ.'
    });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).json({
      success: false,
      error: 'URL phải bắt đầu bằng http:// hoặc https://.'
    });
  }

  try {
    const result = await scanPdfLinks(parsedUrl.toString(), {
      waitMs: Number(waitMs) || 5000
    });

    return res.json({
      success: true,
      inputUrl: parsedUrl.toString(),
      total: result.links.length,
      links: result.links,
      scannedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Scan failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Không thể quét website này.'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`PDF API Finder is running at http://localhost:${port}`);
});
