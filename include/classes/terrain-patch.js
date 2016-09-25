import Mathf from './mathf';

const SEGS_X = 16;
const SEGS_Y = 16;
const VERTS_X = SEGS_X + 1;

class TerrainPatch extends THREE.Mesh {

  constructor( opts ) {
    super();
    this.objects = [];
    this.width = opts.hasOwnProperty( 'width' ) ? opts.width : 0;
    this.height = opts.hasOwnProperty( 'height' ) ? opts.height : 0;
    this.heightmap = opts.hasOwnProperty( 'heightmap' ) ? opts.heightmap : undefined;
    let position = opts.hasOwnProperty( 'position' ) ? opts.position : new THREE.Vector3();
    this.position.set( position.x, position.y, position.z );
    this.material = opts.hasOwnProperty( 'material' ) ? opts.material : undefined;
    this.verts = null;
    this.geometry = this.createGeometry();
    this.scatters = {};
  }

  /// Rebuild terrain heightmap
  rebuild() {
    let vertsX = SEGS_X + 1;
    let vertsY = SEGS_Y + 1;
    let v = 0;
    for ( let i = 0; i < vertsY; ++i ) {
      for ( let j = 0; j < vertsX; ++j, v += 3 ) {
        this.verts[ v + 1 ] = 0.0;
        let noise = this.heightmap.getHeight(
          this.verts[ v ] + this.position.x,
          this.verts[ v + 2 ] + this.position.z
        );
        this.verts[ v + 1 ] = noise;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  addScatterObject( mesh, count ) {

    let meshGeo = mesh.geometry;
    let vertCount = meshGeo.attributes.position.count;

    let matrix = new THREE.Matrix4();
    let rotation = new THREE.Quaternion();
    let position = new THREE.Vector3();
    let scale = new THREE.Vector3();

    // Scatter geometry
    let geometry = new THREE.BufferGeometry();

    // Vertex positions
    let posAttrib = new THREE.Float32Attribute(
      new Float32Array( vertCount * meshGeo.attributes.position.itemSize * count ),
      meshGeo.attributes.position.itemSize
    );

    // Vertex normals
    let normAttrib = new THREE.Float32Attribute(
      new Float32Array( vertCount * meshGeo.attributes.position.itemSize * count ),
      meshGeo.attributes.position.itemSize
    );

    // Vertex colours
    let colorAttrib = new THREE.Float32Attribute(
      new Float32Array( vertCount * meshGeo.attributes.color.itemSize * count ),
      meshGeo.attributes.color.itemSize
    );

    geometry.addAttribute( 'position', posAttrib );
    geometry.addAttribute( 'normal', normAttrib );
    geometry.addAttribute( 'color', colorAttrib );

    let width;
    let sway = 0.05;

    // Create individual objects for the scatter
    for ( let i = 0; i < count; ++i ) {

      let coord = {
        x: Mathf.randRange( 0, 1 ),
        y: Mathf.randRange( 0, 1 )
      };

      let pos = this.getPosition( coord );

      // Min height for spawn
      if ( pos.y < -10 ) {
        continue;
      }

      position.set( pos.x, pos.y, pos.z );

      rotation.setFromEuler(
        new THREE.Euler(
          Mathf.randRange( -sway, sway ),
          Mathf.randRange( 0, Math.PI * 2 ),
          Mathf.randRange( -sway, sway ),
          THREE.Euler.DefaultOrder
        )
      );

      width = Mathf.randRange( 0.25, 0.5 );
      scale.set( width, 0.5, width );
      matrix.compose( position, rotation, scale );
      meshGeo.applyMatrix( matrix );
      geometry.merge( meshGeo, i * vertCount );
      meshGeo.applyMatrix( matrix.getInverse( matrix ) );
    }

    let scatterMesh = new THREE.Mesh( geometry, mesh.material );
    scatterMesh.castShadow = mesh.castShadow;
    scatterMesh.add( new THREE.BoxHelper( scatterMesh ) );

    this.scatters[ mesh.uuid ] = scatterMesh;
    this.add( scatterMesh );
  }

  /// Get world position on terrain based off normalized XZ coordinates
  getPosition( coord ) {

    // Clamp coordinates
    coord.x = coord.x > 1.0 ? 1.0 : coord.x < 0.0 ? 0.0 : coord.x;
    coord.y = coord.y > 1.0 ? 1.0 : coord.y < 0.0 ? 0.0 : coord.y;

    // Base vertex index
    let ix1 = Math.floor( coord.x * SEGS_X );
    let iy1 = Math.floor( coord.y * SEGS_Y );

    let i1 = VERTS_X * iy1 + ix1; // Bottom left
    let i2 = i1 + 1; // Bottom right
    let i3 = i1 + VERTS_X; // Top left
    let i4 = i3 + 1; // Top right

    // Grid index interpolant time values collected from remainder
    let rx1 = coord.x * SEGS_X - ix1;
    let ry1 = coord.y * SEGS_Y - iy1;

    let h1, h2, h;

    // Interpolate heights of each vert using bilinear interpolation
    h1 = Mathf.lerp( this.verts[ i1 * 3 + 1 ], this.verts[ i2 * 3 + 1 ], rx1 ); // Bottom left to bottom right
    h2 = Mathf.lerp( this.verts[ i3 * 3 + 1 ], this.verts[ i4 * 3 + 1 ], rx1 ); // Top left to top right
    h = Mathf.lerp( h1, h2, ry1 );

    return {
      x: coord.x * this.width,
      y: h,
      z: coord.y * this.height
    };
  }

  /// Create terrain geometry structure
  createGeometry() {
    let geo = new THREE.BufferGeometry();
    let vertsX = SEGS_X + 1;
    let vertsY = SEGS_Y + 1;

    this.verts = new Float32Array( vertsX * vertsY * 3 );
    this.uvs = new Float32Array( vertsX * vertsY * 2 );
    let v = 0;
    let uv = 0;
    let stepX = this.width / SEGS_X;
    let stepY = this.height / SEGS_Y;
    for ( let j = 0; j < vertsY; ++j ) {
      for ( let i = 0; i < vertsX; ++i, v += 3, uv += 2 ) {
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
        this.verts[ v ] = pos.x;
        this.verts[ v + 1 ] = pos.y;
        this.verts[ v + 2 ] = pos.z;
        this.uvs[ uv ] = i / ( vertsX - 1 );
        this.uvs[ uv + 1 ] = j / ( vertsY - 1 );
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

    geo.addAttribute( 'position', new THREE.BufferAttribute( this.verts, 3 ) );
    geo.addAttribute( 'uv', new THREE.BufferAttribute( this.uvs, 2 ) );
    geo.setIndex( new THREE.BufferAttribute( indices, 1 ) );
    geo.computeVertexNormals();
    return geo;
  }
}

export default TerrainPatch;
