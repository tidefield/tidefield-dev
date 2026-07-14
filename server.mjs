import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { createServer } from "node:http";

const root = resolve("dist");
const port = Number(process.env.PORT || 8080);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
]);

function resolvePath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  const safePath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  return join(root, safePath);
}

async function findFile(urlPath) {
  const requested = resolvePath(urlPath);
  const candidates = [requested, join(requested, "index.html"), join(root, "index.html")];

  for (const candidate of candidates) {
    if (!candidate.startsWith(root) || !existsSync(candidate)) {
      continue;
    }

    const details = await stat(candidate);
    if (details.isFile()) {
      return candidate;
    }
  }

  return null;
}

createServer(async (request, response) => {
  try {
    const file = await findFile(request.url || "/");
    if (!file) {
      response.writeHead(404).end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes.get(extname(file)) || "application/octet-stream",
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(500).end("Internal server error");
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`Serving dist on port ${port}`);
});
