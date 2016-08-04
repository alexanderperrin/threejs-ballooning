class Player extends THREE.Mesh {
  constructor( geometry, material ) {
    super(geometry, material);
    this.velocity = new THREE.Vector3();
  }
}

export default Player;
