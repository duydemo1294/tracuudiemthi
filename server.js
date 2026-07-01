const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Mime types mapping for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 1. API Endpoint: CORS Proxy for score lookup
  if (pathname === '/api/tra-diem') {
    const sbd = parsedUrl.query.sbd;
    if (!sbd || sbd.trim() === '') {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Thiếu số báo danh' }));
      return;
    }

    try {
      const apiUrl = `https://vietnamnet.vn/giao-duc/diem-thi/tra-cuu-diem-thi-tot-nghiep-thpt/2026/${sbd}.html`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html'
        }
      });

      if (!response.ok) {
        throw new Error(`API Response not OK: ${response.status}`);
      }

      const data = await response.text();
      
      const record = {
        "STT": null,
        "SOBAODANH": sbd,
        "TOAN": "",
        "VA": "",
        "LI": "",
        "HO": "",
        "SI": "",
        "SU": "",
        "DI": "",
        "KTPL": "",
        "TI": "",
        "CNCN": "",
        "CNNN": "",
        "NN": "",
        "MON_NN": ""
      };
      
      let foundAny = false;
      // Vietnamnet score table format: <td>To&#xE1;n</td> <td>8.5</td>
      const regex = /<td>(.*?)<\/td>\s*<td>(.*?)<\/td>/gi;
      let match;
      
      function decodeHtml(html) {
          return html.replace(/&#x([0-9A-Fa-f]+);/ig, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
      }
      
      while ((match = regex.exec(data)) !== null) {
        const subjectName = decodeHtml(match[1]).trim().toLowerCase();
        const scoreVal = match[2].trim(); // Already standard period format on Vietnamnet
        
        let key = null;
        if (subjectName.includes('toán')) key = 'TOAN';
        else if (subjectName.includes('văn')) key = 'VA';
        else if (subjectName.includes('lý')) key = 'LI';
        else if (subjectName.includes('hóa')) key = 'HO';
        else if (subjectName.includes('sinh')) key = 'SI';
        else if (subjectName.includes('sử')) key = 'SU';
        else if (subjectName.includes('địa')) key = 'DI';
        else if (subjectName.includes('pháp luật') || subjectName.includes('gdcd') || subjectName.includes('giáo dục')) key = 'KTPL';
        else if (subjectName.includes('ngoại ngữ')) key = 'NN';
        
        if (key) {
          record[key] = scoreVal;
          foundAny = true;
          if (key === 'NN' && !record.MON_NN) record.MON_NN = 'N1'; // Default NN language code to N1 (English)
        }
      }
      
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      
      if (foundAny) {
        res.end(JSON.stringify([record]));
      } else {
        res.end(JSON.stringify([])); // Empty array implies candidate not found
      }
      
    } catch (err) {
      console.error(`Error parsing Vietnamnet HTML: ${err.message}`);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Lỗi phân tích dữ liệu điểm thi từ VietNamNet' }));
    }
    return;
  }

  // 2. Serve Static Files
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  
  // Prevent directory traversal attack (security best practice)
  const relative = path.relative(PUBLIC_DIR, filePath);
  const isSafe = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  
  if (!isSafe && pathname !== '/') {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Not Found</h1><p>Trang hoặc tài nguyên không tồn tại.</p>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`📡 CORS Proxy sẵn sàng tại: http://localhost:${PORT}/api/tra-diem`);
  console.log(`==================================================`);
});
