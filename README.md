# PDF API Finder

Web tool dùng Node.js, Express và Playwright để mở website, bắt network request/response và tìm link/API liên quan đến PDF.

## Chạy local

```powershell
npm install
npx playwright install chromium
npm start
```

Mở:

```text
http://localhost:3000
```

## Deploy bằng Docker

```powershell
docker build -t pdf-api-finder .
docker run -p 3000:3000 pdf-api-finder
```

## Deploy lên Render/Railway

- Chọn deploy bằng Dockerfile.
- Port app: `3000` hoặc dùng biến môi trường `PORT` do nền tảng cung cấp.
- Start command đã có trong Dockerfile: `npm start`.

## API

```http
POST /api/scan
Content-Type: application/json

{
  "url": "https://example.com"
}
```

Response:

```json
{
  "success": true,
  "total": 1,
  "links": [
    {
      "url": "https://example.com/file.pdf",
      "source": "network_response_url",
      "method": null,
      "status": 200,
      "contentType": "application/pdf"
    }
  ]
}
```
