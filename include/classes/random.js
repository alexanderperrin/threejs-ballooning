import SeedRandom from 'seedrandom';

class Random {
  constructor( seed ) {
    this.seed = seed;
    this.generator = new SeedRandom( seed );
  }

  range( min, max ) {
    return this.generator.quick() * ( max - min ) + min;
  }
}

export default Random;
