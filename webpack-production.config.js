const path = require('path');
var WebpackStripLoader = require( 'strip-loader' );
var devConfig = require( './webpack.config.js' );

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

module.exports = devConfig;
