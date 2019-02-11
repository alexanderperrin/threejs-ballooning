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

import ImprovedNoise from '../ImprovedNoise';

const VALLEY_01_SCALE = 0.025;
const VALLEY_02_SCALE = 0.01;
const VALLEY_01_MULT = 1.0;
const VALLEY_02_MULT = 0.5;
const HEIGHT_MULT = 10.0;
const RIVER_WIDTH = 100.0;

class Heightmap {

  constructor( opts ) {
    this.noise = new ImprovedNoise();
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
    let n2 = this.perlinNoise( x, y, 2 );
    let height = n1 + n2;
    height *= this.clamp( Math.pow( height + 0.5, 5 ), 0, 1 );
    height = this.lerp( height, this.step( height, 5 ), this.perlinNoise( x, 0.2, 1 ) );
    height *= 0.3;
    height *= Math.pow( Math.abs( VALLEY_01_SCALE * x ), 2 ) * VALLEY_01_MULT + 0.5;
    height += Math.pow( Math.abs( VALLEY_02_SCALE * x ), 2 ) * VALLEY_02_MULT;

    // River
    let river = RIVER_WIDTH / Math.abs( x - ( this.perlinNoise( x, y, 0.5 ) - 0.5 ) * 200 );
    height -= 0.5 * this.clamp( river, 0, 5 );

    return height * HEIGHT_MULT;
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
}

export default Heightmap;
