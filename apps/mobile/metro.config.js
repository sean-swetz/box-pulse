const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  axios: path.resolve(__dirname, "../../node_modules/axios"),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "axios" || moduleName.startsWith("axios/")) {
    const axisRoot = path.resolve(__dirname, "../../node_modules/axios");
    const browserCjs = path.join(axisRoot, "dist/browser/axios.cjs");
    return { filePath: browserCjs, type: "sourceFile" };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
