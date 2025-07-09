const path = require("path");
const Dotenv = require('dotenv-webpack');

module.exports = {
  webpack: {
    plugins: [
      new Dotenv()
    ],
    configure: (webpackConfig) => {
      webpackConfig.entry = {
        main: path.resolve(__dirname, "src/index.js"),
        content: path.resolve(__dirname, "src/content.js"),
        background: path.resolve(__dirname, "src/background.js"),
      };

      webpackConfig.output.filename = "static/js/[name].js";
      webpackConfig.output.chunkFilename = "static/js/[name].js";

      // Disable chunk splitting completely for content script
      webpackConfig.optimization.splitChunks = {
        cacheGroups: {
          default: {
            chunks: (chunk) => chunk.name !== "content",
          },
          vendors: {
            chunks: (chunk) => chunk.name !== "content",
          },
        },
      };

      webpackConfig.optimization.runtimeChunk = false;

      return webpackConfig;
    },
  },
};