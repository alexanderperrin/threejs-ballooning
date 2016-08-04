import ImprovedNoise from '../ImprovedNoise';

class Heightmap {
  constructor( opts ) {
    console.log( opts );
    this.noise = opts.hasOwnProperty( 'noise' ) ? opts.noise : new ImprovedNoise();
    this.scale = opts.hasOwnProperty( 'scale' ) ? opts.scale : 100;
    this.height = opts.hasOwnProperty( 'height' ) ? opts.height : 0;
    this.noiseOffset = opts.hasOwnProperty( 'noiseOffset' ) ? opts.noiseOffset : 0;
    this.rScale = 1 / this.scale;
  }

  getHeight( x, y ) {
    let nx = x + this.noiseOffset.x;
    let ny = y + this.noiseOffset.y;
    nx = nx < 0 ? 0 : nx;
    ny = ny < 0 ? 0 : ny;
    let noise = ( this.noise.noise( nx * this.rScale, 0, ny * this.rScale ) + 0.5 );
    noise *= this.height;
    return noise;
  }
}

export default Heightmap;;
