import { dirname, resolve } from "path";
import { TsconfigPathsPlugin } from "tsconfig-paths-webpack-plugin";
import { fileURLToPath } from "url";

export default {
  entry: "./src/index.ts",
  target: "node16",
  module: {
    rules: [
      {
        test: /\.ts$/u,
        use: "ts-loader",
        include: [resolve(dirname(fileURLToPath(import.meta.url)), "src/app")],
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
    libraryTarget: "commonjs",
    path: resolve(dirname(fileURLToPath(import.meta.url)), "dist"),
    clean: true,
  },
};
