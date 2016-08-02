var path = require( 'path' );
var webpack = require( 'webpack' );

module.exports = {
  entry: './app.js',
  output: {
    filename: 'bundle.js'
  },
  plugins: [
    new webpack.ProvidePlugin( {
      THREE: 'three'
    } )
  ],
  module: {
    preLoaders: [
      {
        test: /\.js$/,
        exclude: [
          /node_modules/,
          /vendor/
        ],
        loader: 'jshint-loader'
      }
    ],
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: [ 'es2015' ],
          plugins: [ 'transform-class-properties' ]
        }
      },
      {
        test: /\.glsl$/,
        loader: 'webpack-glsl'
      },
      {
        test: /\.css$/,
        loader: "style-loader!css-loader"
      }
    ]
  },
  resolve: {
    extensions: [ '', '.js' ]
  }
}
