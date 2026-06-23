import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the file-tracing root to this project. Next 15 infers the workspace
  // root from lockfiles and can pick a parent directory when a stray
  // package-lock.json exists higher up; pinning it avoids that mis-detection.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
