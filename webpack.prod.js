const merge = require("webpack-merge");
const common = require("./webpack.common.js");
const MinifyPlugin = require("babel-minify-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = merge(common, {
  mode: "production",
  plugins: [
    new MinifyPlugin(),
    new CopyWebpackPlugin([{ from: "public", ignore: ["index.html"] }]),
  ],
});
