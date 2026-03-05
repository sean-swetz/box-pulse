const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo so Metro can resolve hoisted packages
config.watchFolders = [monorepoRoot];

// Resolve modules from local node_modules first, then hoisted root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Expo sets unstable_serverRoot to the monorepo root (for web monorepo support).
// This means Metro resolves the entry point from the monorepo root, not apps/mobile.
// Expo's built-in rewriteRequestUrl only handles /.expo/.virtual-metro-entry.bundle?...
// but Expo Go on iOS simulators may send /index.bundle instead.
// Chain our handler first so /index.bundle gets redirected to the virtual entry,
// then Expo's handler rewrites that to the real expo-router/entry path.
const originalRewriteUrl = config.server.rewriteRequestUrl;
config.server.rewriteRequestUrl = (url) => {
  if (url.includes("/index.bundle?") && !url.includes("virtual-metro-entry")) {
    const virtualUrl = url.replace(
      "/index.bundle?",
      "/.expo/.virtual-metro-entry.bundle?"
    );
    return originalRewriteUrl ? originalRewriteUrl(virtualUrl) : virtualUrl;
  }
  return originalRewriteUrl ? originalRewriteUrl(url) : url;
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "axios" || moduleName.startsWith("axios/")) {
    const axiosRoot = path.resolve(monorepoRoot, "node_modules/axios");
    const browserCjs = path.join(axiosRoot, "dist/browser/axios.cjs");
    return { filePath: browserCjs, type: "sourceFile" };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
