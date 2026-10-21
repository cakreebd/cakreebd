import { spawnSync } from "node:child_process";
import { join } from "node:path";

if (process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production") {
  const prismaCli = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
