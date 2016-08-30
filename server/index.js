var app = require( 'express' )();
var http = require( 'http' ).Server( app );
var io = require( 'socket.io' )( http );

var connections = {};

io.on( 'connection', function ( socket ) {
  console.log( 'user ' + socket.id + ' connected' );
  connections[ socket.id ] = socket;
  io.emit( 'connected' );
  socket.on( 'disconnect', function () {
    // Tell all users that user disconnected
    delete connections[ socket.id ];
    console.log( 'user ' + socket.id + ' disconnected:' );
  } );
  socket.on( 'camera-change', function () {
    console.log( 'camera change event' );
    socket.broadcast.emit( 'camera-change' );
  } );
} );

app.get( '/', function ( req, res ) {
  res.send( 'users: ' + JSON.stringify( Object.keys( connections ) ) );
} );

http.listen( 3000, function () {
  console.log( 'listening on *:3000' );
} );;
