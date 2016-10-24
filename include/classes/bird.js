import Mathf from './mathf';

const FLIGHT_SPEED = 30;
const FLOCK_DIST = 32;
const PLAYER_SEP_DIST = 80;

class Bird extends THREE.Object3D {
  constructor() {
    super();
    this.add( new THREE.AxisHelper( 5 ) );
    this.velocity = new THREE.Vector3( 0, 0, FLIGHT_SPEED );
  }

  update( dt, center, player ) {
    this.velocity.z = FLIGHT_SPEED;
    // Add veloctity
    this.position.add( this.velocity.clone().multiplyScalar( dt ) );
    // Drag velocity
    this.velocity.sub( this.velocity.clone().multiplyScalar( dt ) );
    let centerDist = this.position.distanceTo( center );
    let v = center.clone().sub( this.position );
    let sqDist = v.lengthSq();
    let vN = v.clone().normalize();
    window.flight.debug.drawRay( this.position, v, new THREE.Color( 0x00fffff ) );
  }
}

export default Bird;;
