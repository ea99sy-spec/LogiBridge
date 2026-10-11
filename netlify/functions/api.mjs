import serverless from "serverless-http";
import { setEnvironmentContext } from "@netlify/blobs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.LOGIBRIDGE_STORAGE = "netlify";
process.env.LOGIBRIDGE_SERVERLESS = "true";
process.env.COOKIE_SECURE = "true";
process.env.DATA_DIR = join(tmpdir(), "logibridge");
let loaded,
  initialized,
  queue = Promise.resolve();
export function handler(event, context) {
  const operation = queue.then(async () => {
    const blobs = JSON.parse(Buffer.from(event.blobs, "base64").toString("utf8"));
    setEnvironmentContext({
      siteID: event.headers["x-nf-site-id"],
      deployID: event.headers["x-nf-deploy-id"],
      token: blobs.token,
      edgeURL: blobs.url,
      uncachedEdgeURL: blobs.url_uncached,
    });
    loaded ||= import("../../server/index.js");
    const { createApp } = await loaded;
    initialized ||= createApp();
    const app = await initialized;
    const { refreshState } = await import("../../server/store.js");
    await refreshState();
    // Retain the logical API path whether Netlify passed the original or rewritten URL.
    event.path = event.path.replace(/^\/\.netlify\/functions\/api/, "");
    event.headers["x-forwarded-proto"] = "https";
    if (!event.path.startsWith("/api/") && !event.path.startsWith("/driver-api/"))
      event.path = "/api" + event.path;
    context.callbackWaitsForEmptyEventLoop = false;
    return serverless(app)(event, context);
  });
  queue = operation.catch(() => {});
  return operation;
}
