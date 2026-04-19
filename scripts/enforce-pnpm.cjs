const fs = require("fs");
const path = require("path");

for (const filename of ["package-lock.json", "yarn.lock"]) {
  const filePath = path.join(process.cwd(), filename);
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }
}

const userAgent = process.env.npm_config_user_agent || "";

if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}
