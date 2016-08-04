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

  lerp( from, to, t ) {
    return ( 1 - t ) * from + t * to;
  }

  clamp( val, min, max ) {
    let t = val < min ? min : val;
    return t > max ? max : t;
  }

  getHeight( x, y ) {
    let n1 = this.clamp( this.perlinNoise( x, y, 0.5 ) + 0.2, 0, 1 );
    let n2 = this.perlinNoise( x, y, 2 ) + 0.2;
    let n3 = this.perlinNoise( x, y, 5 );
    let height = this.lerp( n1, n2, 0.2 );
    height *= this.clamp( Math.pow( height + 0.5, 5 ), 0, 1 );
    height = this.lerp( height, this.step( height, 6 ), this.perlinNoise( x, 0.2, 10 ) );
    height *= 0.3;
    height *= Math.pow( Math.abs( 0.03 * x ), 2 ) + 0.5;
    height += Math.pow( Math.abs( 0.02 * x ), 2 ) * 0.1;
    return height * 10;
  }

  perlinNoise( x, y, frequency ) {
    x += this.noiseOffset.x;
    y += this.noiseOffset.y;
    x = x < 0 ? 0 : x;
    y = y < 0 ? 0 : y;
    return this.noise.noise( x * this.rScale * frequency, 0, y * this.rScale * frequency ) + 0.5;
  }

  step( height, steps ) {
    return Math.floor( height * steps ) / steps;
  }

  // public static float Noise (float x, float y, float density)
  // {
  // 	float height = perlin.Noise(0.75f * x * density, y * density) + 0.5f;
  // 	float height2 = perlin.Noise(0.1f * x * density, 2f * y * density) + 0.5f;
  // 	float height3 = perlin.Noise(5f * x * density, 5f * y * density) + 0.5f;
  // 	height = Mathf.Lerp(height2, height, 0.6f);
  // 	height *= Mathf.Clamp01(Mathf.Pow(height + 0.5f, 5f));
  // 	height = Mathf.Lerp(height, StepHeight(height, 6), perlin.Noise(x * density / 5f, 0.6f));
  // 	height += height3 * 0.05f;
  // 	height *= 0.3f;
  // 	height *= Mathf.Pow(Mathf.Abs(0.03f * y), 2) + 0.5f;
  // 	return height;
  // }
}

export default Heightmap;;
