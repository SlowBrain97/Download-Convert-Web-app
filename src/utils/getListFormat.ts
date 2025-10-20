import { spawn } from "node:child_process";
import { logger } from "../utils/logger.js";

export default async function  getAvailableFormats(
  url: string,
  cookiesPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      "--list-formats",
      "--no-warnings",
      "--cookies", cookiesPath,
      "--extractor-args", "youtube:player_client=android,ios",
      "--user-agent", "com.google.android.youtube/17.36.4 (Linux; U; Android 12; GB) gzip",
      url,
    ];

    logger.info(`📋 Checking available formats for: ${url}`);

    const subprocess = spawn("/usr/local/bin/yt-dlp", args);

    let output = "";
    let errorOutput = "";

    subprocess.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    subprocess.stderr.on("data", (chunk: Buffer) => {
      errorOutput += chunk.toString();
    });

    subprocess.on("error", (err) => {
      logger.error("❌ yt-dlp format check failed", err);
      reject(err);
    });

    subprocess.on("close", (code) => {
      if (code === 0) {
        logger.info("✅ Format list retrieved successfully");
        resolve(output);
      } else {
        logger.error(`⚠️ yt-dlp returned code ${code}: ${errorOutput}`);
        reject(new Error(errorOutput || "Failed to get formats"));
      }
    });
  });
}
