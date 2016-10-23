import Mathf from './mathf';

const FLIGHT_SPEED = 16;
const BANK_SPEED = 0.5;
const SPIN_SPEED = 1;
const SIDEWAYS_SPEED = 5;
const FLAG_ADJUST_SPEED = 15;

class Player extends THREE.Object3D {
  constructor() {
    super();
    this.angularVelocity = new THREE.Vector3();
    this.bankVelocity = 0.0;
    this.velocity = new THREE.Vector3();
    this.bankVelocity = 0.0;
    this.rotation.set( 0, 0, 0, 'ZXY' );
    this.scarf = null;
    this.gridPos = {
      x: 0,
      y: 0
    };
    this.initScarf();
  }

  initScarf() {
    let material = new THREE.LineBasicMaterial( {
      color: 0x994400
    } );
    let geometry = new THREE.Geometry();
    for ( let i = 0; i < 20; ++i ) {
      geometry.vertices.push( new THREE.Vector3( this.position.x, this.position.y, this.position.z + i * -5 ) );
    }
    this.scarf = {
      renderer: new THREE.Line( geometry, material ),
      points: geometry.vertices
    };
    window.flight.scene.add( this.scarf.renderer );
  }

  update() {
    let dt = window.flight.deltaTime;
    let input = window.flight.input;

    // Twist
    this.angularVelocity.y += dt * input.x * SPIN_SPEED;
    this.rotation.y += this.angularVelocity.y * dt;
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

    for ( let i = 0; i < this.scarf.points.length; ++i ) {
      let points = this.scarf.points;
      if ( i === 0 ) {
        // Position first scarf point at balloon position
        points[ i ].set( this.position.x, this.position.y - 3, this.position.z );
        this.scarf.renderer.geometry.verticesNeedUpdate = true;
      } else {
        let p1 = points[ i ];
        let p2 = points[ i - 1 ];
        p1.x = Mathf.moveTowards( p1.x, p2.x, FLAG_ADJUST_SPEED * dt * Math.abs( p1.x - p2.x ) );
        p1.y = Mathf.moveTowards( p1.y, p2.y, FLAG_ADJUST_SPEED * dt * Math.abs( p1.y - p2.y ) );
        p1.z = Mathf.moveTowards( p1.z, p2.z, FLAG_ADJUST_SPEED * dt * Math.abs( p1.z - p2.z ) );
        p1.x += Math.sin( p1.z * 0.2 ) * 0.1 / ( i + 1 );
      }
    }
    this.scarf.renderer.geometry.computeBoundingBox();
    this.scarf.renderer.geometry.computeBoundingSphere();
  }
}

export default Player;;
