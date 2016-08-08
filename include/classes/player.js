const FLIGHT_SPEED = 96;
const HEIGHT = 96;

class Player extends THREE.Mesh {
  constructor( geometry, material ) {
    super( geometry, material );
    this.velocity = new THREE.Vector3();
  }

  update() {
    let dt = window.flight.deltaTime;
    this.position.z += dt * FLIGHT_SPEED;
    this.position.y = HEIGHT;
  }
}

export default Player;
