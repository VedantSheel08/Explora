const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.PORT, 10) || 3131;
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function serveFile(res, filePath) {
  const ext = path.extname(filePath);
  const mime = MIME[ext] || "application/octet-stream";
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });image.png
}

function proxyGemini(req, body, res) {
  const key = (body && body.key) || GEMINI_KEY;
  if (!key) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: "Missing API key. Set GEMINI_API_KEY or send key in request body." } }));
    return;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${encodeURIComponent(key)}`;
  const payload = JSON.stringify({
    contents: body.contents,
    generationConfig: body.generationConfig || { maxOutputTokens: 256, temperature: 0.8 },
  });
  const opts = {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
  };
  const proxyReq = require("https").request(url, opts, (proxyRes) => {
    let data = "";
    proxyRes.on("data", (ch) => { data += ch; });
    proxyRes.on("end", () => {
      res.writeHead(proxyRes.statusCode, { "Content-Type": "application/json" });
      res.end(data);
    });
  });
  proxyReq.on("error", () => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: "Proxy request failed" } }));
  });
  proxyReq.write(payload);
  proxyReq.end();
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && (req.url === "/api/gemini" || req.url === "/api/gemini/")) {
    let body = "";
    req.on("data", (ch) => { body += ch; });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        proxyGemini(req, parsed, res);
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "Invalid JSON body" } }));
      }
    });
    return;
  }

  let filePath = req.url === "/" ? "/index.html" : req.url;
  filePath = path.join(__dirname, filePath.replace(/^\//, ""));
  serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log("Explora server: http://localhost:" + PORT);
});
