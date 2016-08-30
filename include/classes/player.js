import Mathf from './mathf';

const FLIGHT_SPEED = 60;
const HEIGHT = 400;
const MAX_BANK = 0.6;
const BANK_SPEED = 0.5;
const MAX_BANK_VEL = 1;

class Player extends THREE.Mesh {
  constructor( geometry, material ) {
    super( geometry, material );
    this.velocity = new THREE.Vector3();
    this.bankVelocity = 0.0;
    this.gridPos = {
      x: 0,
      y: 0
    };
  }

  update() {
    let dt = window.flight.deltaTime;
    let input = window.flight.input;
    this.position.z += Math.cos( this.rotation.y ) * dt * FLIGHT_SPEED;
    this.position.x += Math.sin( this.rotation.y ) * dt * FLIGHT_SPEED;
    this.position.y = HEIGHT;
    this.bankVelocity += BANK_SPEED * dt * input.x;
    this.bankVelocity = Mathf.clamp( this.bankVelocity, -MAX_BANK_VEL, MAX_BANK_VEL );
    this.rotation.z += this.bankVelocity * dt;
    this.rotation.y -= this.rotation.z * dt;
    this.rotation.z = Mathf.clamp( this.rotation.z, -MAX_BANK, MAX_BANK );
    if ( input.x === 0 ) {
      this.bankVelocity = Mathf.moveTowards( this.bankVelocity, 0.0, 0.5 * dt * Math.abs( this.bankVelocity ) );
      this.rotation.z = Mathf.moveTowards( this.rotation.z, 0.0, dt * Math.abs( this.rotation.z ) );
    }
  }
}

export default Player;
