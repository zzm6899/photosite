const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const contentPath = path.join(root, "site-content.json");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const legacyPage = url.pathname.match(/^\/(?:pages\/)?(portfolio|events|testimonials|contact)\.html$/);
  if (legacyPage && (req.method === "GET" || req.method === "HEAD")) {
    res.writeHead(301, { Location: `/${legacyPage[1]}/${url.search}` });
    res.end();
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/content") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) {
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body || "{}");
        fs.writeFileSync(contentPath, JSON.stringify(parsed, null, 2));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false }));
      }
    });
    return;
  }

  let filePath = path.join(root, decodeURIComponent(url.pathname));

  if (url.pathname === "/" || url.pathname.endsWith("/")) {
    filePath = path.join(root, "index.html");
  }

  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      filePath = path.join(root, "index.html");
    }

    fs.readFile(filePath, (readError, content) => {
      if (readError) {
        res.writeHead(500);
        res.end("Unable to read file.");
        return;
      }

      res.writeHead(200, {
        "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
        "Cache-Control": "no-store"
      });
      res.end(content);
    });
  });
});

server.listen(port, () => {
  console.log(`Zac Morgan Photography mock running at http://localhost:${port}`);
});
