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

const server = http.createServer((req, res) => {
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

    const apiUrl = `https://diemthi.vnexpress.net/index/detail/sbd/${sbd}/year/2026`;
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html'
      }
    };

    https.get(apiUrl, options, (apiRes) => {
      let data = '';
      
      apiRes.on('data', (chunk) => {
        data += chunk;
      });

      apiRes.on('end', () => {
        try {
          if (apiRes.statusCode !== 200) {
             throw new Error('API Response not 200');
          }
          
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
          const regex = /<span class="sub-name">([^<]+)<\/span>\s*<strong class="sub-score">([^<]+)<\/strong>/gi;
          let match;
          
          while ((match = regex.exec(data)) !== null) {
            const subjectName = match[1].trim().toLowerCase();
            const scoreVal = match[2].trim().replace(',', '.'); // Convert VnExpress comma decimal to period
            
            let key = null;
            if (subjectName.includes('toán')) key = 'TOAN';
            else if (subjectName.includes('văn')) key = 'VA';
            else if (subjectName.includes('lý')) key = 'LI';
            else if (subjectName.includes('hóa')) key = 'HO';
            else if (subjectName.includes('sinh')) key = 'SI';
            else if (subjectName.includes('sử')) key = 'SU';
            else if (subjectName.includes('địa')) key = 'DI';
            else if (subjectName.includes('pháp luật') || subjectName.includes('gdcd')) key = 'KTPL';
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
          console.error(`Error parsing VnExpress HTML: ${err.message}`);
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Lỗi phân tích dữ liệu điểm thi từ VnExpress' }));
        }
      });
    }).on('error', (err) => {
      console.error(`Error forwarding request: ${err.message}`);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Lỗi kết nối tới máy chủ VnExpress' }));
    });
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
