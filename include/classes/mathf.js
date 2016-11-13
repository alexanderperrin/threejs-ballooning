import SeedRandom from 'seedrandom';

let rnd = new SeedRandom( 'gh3jf023ja84' );
let rnd2 = new SeedRandom( 'aowjdiao8q2u' );
let count = 0;

class Mathf {
  static clamp( num, min, max ) {
    return num < min ? min : num > max ? max : num;
  }

  static getCount() {
    return count;
  }

  static lerp( from, to, t ) {
    return from + t * ( to - from );
  }

  static inverseLerp( from, to, t ) {
    let v = from;
    if ( t <= from ) {
      v = from;
    } else if ( t >= to ) {
      v = to;
    }
    v = ( t - from ) / ( to - from );
    return v;
  }

  static randRange( min, max ) {
    return rnd.quick() * ( max - min ) + min;
  }

  static randRange2( min, max ) {
    return rnd2.quick() * ( max - min ) + min;
  }

  static moveTowards( current, target, maxDelta ) {
    let delta = target - current;
    if ( Math.abs( delta ) > maxDelta ) {
      delta = maxDelta * Math.sign( delta );
    }
    return current + delta;
  }
}

export default Mathf;
