const SEGS_X = 32;
const SEGS_Y = 32;

class TerrainPatch extends THREE.Mesh {
  constructor( opts ) {
    super();
    this.objects = [];
    this.width = opts.hasOwnProperty( 'width' ) ? opts.width : 0;
    this.height = opts.hasOwnProperty( 'height' ) ? opts.height : 0;
    this.xIndex = opts.hasOwnProperty( 'xIndex' ) ? opts.xIndex : 0;
    this.yIndex = opts.hasOwnProperty( 'yIndex' ) ? opts.yIndex : 0;
    this.heightmap = opts.hasOwnProperty( 'heightmap' ) ? opts.heightmap : undefined;
    let position = opts.hasOwnProperty( 'position' ) ? opts.position : new THREE.Vector3();
    this.position.set( position.x, position.y, position.z );
    this.material = opts.hasOwnProperty( 'material' ) ? opts.material : undefined;
    this.geometry = this.createGeometry();
  }

  createGeometry() {
    let geo = new THREE.BufferGeometry();
    let vertsX = SEGS_X + 1;
    let vertsY = SEGS_Y + 1;

    let verts = new Float32Array( vertsX * vertsY * 3 );
    let v = 0;
    let stepX = this.width / SEGS_X;
    let stepY = this.height / SEGS_Y;
    for ( let j = 0; j < vertsY; ++j ) {
      for ( let i = 0; i < vertsX; ++i, v += 3 ) {
        let pos = {
          x: i * stepX,
          y: 0,
          z: j * stepY
        };
        let noise = this.heightmap.getHeight(
          pos.x + this.position.x,
          pos.z + this.position.z
        );
        pos.y = noise;
        verts[ v ] = pos.x;
        verts[ v + 1 ] = pos.y;
        verts[ v + 2 ] = pos.z;
      }
    }

    let indices = new Uint32Array( SEGS_X * SEGS_Y * 6 );

    for ( let i = 0, t = 0, j = 0, v = 0; i < SEGS_Y; ++i, v = i * vertsX ) {
      for ( j = 0; j < SEGS_X; ++j, t += 6, v++ ) {
        indices[ t ] = v;
        indices[ t + 1 ] = v + vertsX;
        indices[ t + 2 ] = v + vertsX + 1;
        indices[ t + 3 ] = v;
        indices[ t + 4 ] = v + vertsX + 1;
        indices[ t + 5 ] = v + 1;
      }
    }

    geo.addAttribute( 'position', new THREE.BufferAttribute( verts, 3 ) );
    geo.setIndex( new THREE.BufferAttribute( indices, 1 ) );
    geo.computeVertexNormals();

    return geo;
  }
}

export default TerrainPatch;
