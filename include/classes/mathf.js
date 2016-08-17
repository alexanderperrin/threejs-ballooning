class Mathf {
  static clamp( num, min, max ) {
    return num < min ? min : num > max ? max : num;
  }

  static lerp( from, to, t ) {
    return from + t * ( to - from );
  }

  static inverseLerp (from, to, t) {
    let v = from;
    if (t <= from) {
      v = from;
    } else if (t >= to) {
      v = to;
    }
    v = (t - from) / (to - from);
    return v;
  }

  static randRange( min, max ) {
    return Math.random() * ( max - min ) + min;
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
