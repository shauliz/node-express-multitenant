const path = require("path");
const { TsconfigPathsPlugin } = require("tsconfig-paths-webpack-plugin");

module.exports = {
  entry: "./src/index.ts",
  target: "node16",
  module: {
    rules: [
      {
        test: /\.ts$/u,
        use: "ts-loader",
        include: path.resolve(__dirname, "src/app"),
        exclude: /node_modules/u,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
    plugins: [new TsconfigPathsPlugin()],
  },
  watchOptions: {
    ignored: /node_modules/u,
  },
  node: {
    global: false,
    __filename: false,
    __dirname: false,
  },
  output: {
    filename: "[name].bundle.js",
    library: { type: "commonjs" },
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
};
