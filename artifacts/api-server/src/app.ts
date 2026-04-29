import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.set("trust proxy", 1);
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.resolve(__dirname, "../../clienthunter-crm/dist/public");
const indexPath = path.resolve(publicPath, "index.html");

if (existsSync(indexPath)) {
  logger.info({ publicPath }, "Serving static frontend files");
  app.use(express.static(publicPath));

  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(indexPath);
  });
} else if (process.env.NODE_ENV === "production") {
  logger.warn(
    { publicPath, indexPath },
    "Frontend build not found; only API routes will be served",
  );
}

export default app;
