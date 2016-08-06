const path = require('path');
var WebpackStripLoader = require( 'strip-loader' );
var devConfig = require( './webpack.config.js' );
var CopyWebpackPlugin = require('copy-webpack-plugin');

var stripLoader = {
  test: [ /\.js$/ ],
  exclude: /node_modules/,
  loader: WebpackStripLoader.loader( 'console.log', 'addAxisHelper' )
};

devConfig.output = {
  path: path.join(__dirname, 'dist'),
  filename: 'app.js'
};

devConfig.module.loaders.push( stripLoader );
devConfig.plugins.push(
  new CopyWebpackPlugin([
    { from: 'static', to: 'static' }
  ], { copyUnmodified: true }
));

module.exports = devConfig;
