import Mathf from './mathf';

const FLIGHT_SPEED = 16;
const BANK_SPEED = 0.5;
const SPIN_SPEED = 1;
const SIDEWAYS_SPEED = 5;
const FLAG_ADJUST_SPEED = 55;
const SCARF_SEG_DIST = 0.3;

class Player extends THREE.Object3D {
  constructor() {
    super();
    this.angularVelocity = new THREE.Vector3();
    this.bankVelocity = 0.0;
    this.velocity = new THREE.Vector3();
    this.bankVelocity = 0.0;
    this.rotation.set( 0, 0, 0, 'ZXY' );
    this.scarf = null;
    this.spin = 0.0;
    this.gridPos = {
      x: 0,
      y: 0
    };
    this.initScarf();
  }

  initScarf() {
    let geometry = new THREE.Geometry();
    for ( let i = 0; i < 20; ++i ) {
      geometry.vertices.push( new THREE.Vector3( this.position.x, this.position.y, this.position.z + i * SCARF_SEG_DIST ) );
    }
    let line = new THREE.MeshLine();
    let material = new THREE.MeshLineMaterial( {
      color: new THREE.Color( 0x663322 )
    } );
    line.setGeometry( geometry, function ( v ) {
      return 0.3;
    } );
    let mesh = new THREE.Mesh( line.geometry, material ); // this syntax could definitely be improved!
    this.scarf = line;
    console.log( this.scarf );
    window.flight.scene.add( mesh );
  }

  update() {
    let dt = window.flight.deltaTime;
    let input = window.flight.input;

    // Twist
    this.angularVelocity.y += dt * input.x * SPIN_SPEED;
    this.rotation.y += this.angularVelocity.y * dt;
    this.rotation.y += dt * 0.1;
    this.angularVelocity.y -= this.angularVelocity.y * dt;

    // Move left and right
    this.velocity.x += dt * -input.x * SIDEWAYS_SPEED;
    this.position.add( this.velocity.clone().multiplyScalar( dt ) );
    this.velocity.x -= this.velocity.x * dt * 0.3;

    // Move forward
    this.position.z += dt * FLIGHT_SPEED;

    // Bank
    this.bankVelocity += input.x * BANK_SPEED * dt;
    this.bankVelocity -= this.bankVelocity * dt;
    this.rotation.z += this.bankVelocity * dt;
    this.rotation.z -= Math.sign( this.rotation.z ) * Math.pow( this.rotation.z, 2 ) * dt * 5;

    // Positions array is interleved vector3
    let positions = this.scarf.positions;
    let numPoints = positions.length;
    for ( let i = 0; i < numPoints; i += 3 ) {
      if ( i === 0 ) {
        // Position first scarf point at balloon position
        positions[ i ] = this.position.x;
        positions[ i + 1 ] = this.position.y - 3;
        positions[ i + 2 ] = this.position.z;
      } else {
        // i - 3 for previous point
        positions[ i ] = Mathf.moveTowards( positions[ i ], positions[ i - 3 ],
          FLAG_ADJUST_SPEED / numPoints * Math.abs( positions[ i ] - positions[ i - 3 ] ) );
        positions[ i + 1 ] = positions[ i - 2 ];
        if ( Math.abs( positions[ i + 2 ] - positions[ i - 1 ] ) > SCARF_SEG_DIST ) {
          positions[ i + 2 ] += positions[ i - 1 ] - positions[ i + 2 ] - SCARF_SEG_DIST;
        }
        positions[ i ] += Math.sin( positions[ i + 2 ] * 0.2 ) * 0.3 / ( i + 1 );
      }
    }
    this.scarf.process();
    this.scarf.geometry.computeBoundingBox();
    this.scarf.geometry.computeBoundingSphere();
  }
}

export default Player;
