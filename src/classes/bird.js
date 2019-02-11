// Copyright (c) 2019 Alexander Perrin contact@alexperrin.com

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const FLIGHT_SPEED = 30;
const FLOCK_DIST = 16;
const PLAYER_SEP_DIST = 80;
const SEPARATION_FORCE = 100;

class Bird extends THREE.Mesh {
  constructor() {
    let geometry = new THREE.Geometry();
    geometry.vertices.push(
      new THREE.Vector3(0, 0, 0.5),
      new THREE.Vector3(1.2, 0, 0),
      new THREE.Vector3(0, 0, -0.5),
      new THREE.Vector3(0, 0, -0.5),
      new THREE.Vector3(-1.2, 0, 0),
      new THREE.Vector3(0, 0, 0.5),
    );
    geometry.faces.push(new THREE.Face3(0, 1, 2));
    geometry.faces.push(new THREE.Face3(3, 4, 5));
    geometry.computeBoundingSphere();
    super(
      geometry,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
      }),
    );
    this.velocity = new THREE.Vector3(0, 0, FLIGHT_SPEED);
  }

  update(dt, center, player) {
    this.velocity.z = FLIGHT_SPEED;
    // Add veloctity
    this.position.add(this.velocity.clone().multiplyScalar(dt));

    let balloonPos = player.position.clone();
    balloonPos.y += 16;

    // Difference between player and this position
    let pv = balloonPos.sub(this.position);
    let pDist = pv.lengthSq();
    let pvN = pv.clone().normalize();
    // this.position.x += dt * Math.sin( this.position.z / 10 ) * 2;
    if (Math.sqrt(pDist) < PLAYER_SEP_DIST) {
      // Separate from player
      let force = 1.0 / (pDist * 0.02);
      // window.flight.debug.drawRay( this.position, pvN.multiplyScalar( -force ), new THREE.Color( 0x00ff00 ) );
      let separation = pvN.multiplyScalar(-force * SEPARATION_FORCE * dt);
      this.position.add(new THREE.Vector3(separation.x, separation.y, 0));
    } else {
      // Difference between center and this position
      let v = center.clone().sub(this.position);
      // Distance to center
      let dist = v.length();
      let vN = v.clone().normalize();
      if (dist > FLOCK_DIST) {
        this.position.add(vN.multiplyScalar(dt));
      }
    }
    // Do some flappin
    let geo = this.geometry;
    geo.vertices[1].y = Math.sin(this.position.z * 0.65);
    geo.vertices[4].y = Math.sin(this.position.z * 0.65);
    geo.verticesNeedUpdate = true;
  }
}

export default Bird;
