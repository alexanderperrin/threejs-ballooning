import Mathf from './mathf';

const FLIGHT_SPEED = 16;
const HEIGHT = 400;
const MAX_BANK = 0.6;
const BANK_SPEED = 0.5;
const MAX_BANK_VEL = 1;
const SPIN_SPEED = 1;
const SIDEWAYS_SPEED = 5;

class Player extends THREE.Object3D {
  constructor() {
    super();
    this.angularVelocity = new THREE.Vector3();
    this.bankVelocity = 0.0;
    this.velocity = new THREE.Vector3();
    this.bankVelocity = 0.0;
    this.rotation.set( 0, 0, 0, 'ZXY' );
    this.gridPos = {
      x: 0,
      y: 0
    };
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

    // this.rotation.y = Math.sin( window.flight.time * 0.2 );
    // this.rotation.z += dt * 10;
  }
}

export default Player;
