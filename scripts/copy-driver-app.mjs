// Copies the driver app (mobile/www) into the website build so it opens at /driver-app/ in any browser.
import { cp, mkdir } from "node:fs/promises";
await mkdir("dist/driver-app", { recursive: true });
await cp("mobile/www", "dist/driver-app", { recursive: true });
console.log("driver app copied to dist/driver-app");
