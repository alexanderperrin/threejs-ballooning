import Mathf from './mathf';

const SEGS_X = 8;
const SEGS_Y = 8;
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
    this.verts3 = [];
    this.normals = [];
    this.geometry = this.createGeometry();
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
    this.scatters = [];
  }

  /**
   * @description Rebuilds the terrain heightmap and scatter geometry.
   */
  rebuild( scene ) {
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
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
    this.geometry.computeVertexNormals();

    // Regenerate scatter
    this.scatters.forEach( ( v ) => {
      scene.remove( v.scatterMesh );
      v.scatterMesh.geometry.dispose();
      v.scatterMesh = this.createScatterGeometry( v.opts );
      window.flight.scene.add( v.scatterMesh );
    } );
  }

  /**
   * Returns normal and position data as nice object array.
   */
  getNiceHeightmapData() {
    let vertsX = SEGS_X + 1;
    let vertsY = SEGS_Y + 1;
    let v = 0;
    let points = [];
    let norms = this.geometry.attributes.normal.array;
    for ( let i = 0; i < vertsY; ++i ) {
      for ( let j = 0; j < vertsX; ++j, v += 3 ) {
        points.push( {
          position: new THREE.Vector3(
            this.verts[ v ] + this.position.x,
            this.verts[ v + 1 ] + this.position.y,
            this.verts[ v + 2 ] + this.position.z
          ),
          normal: new THREE.Vector3(
            norms[ v ],
            norms[ v + 1 ],
            norms[ v + 2 ]
          )
        } );
      }
    }
    return points;
  }

  /**
   * @description Adds a mesh to scatter on to the terrain.
   */
  addScatterObject( opts ) {

    let scatterMesh = this.createScatterGeometry( opts );

    // Store data for terrain to be able to rebuild scatter when regenerated
    this.scatters.push( {
      scatterMesh: scatterMesh, // The batched scatter mesh
      opts: opts
    } );

    window.flight.scene.add( scatterMesh );
  }

  /**
   * @description Creates the scatter geometry mesh.
   */
  createScatterGeometry( opts ) {

    let mesh = opts.hasOwnProperty( 'mesh' ) ? opts.mesh : null;
    let count = opts.hasOwnProperty( 'count' ) ? opts.count : 0;
    let minSize = opts.hasOwnProperty( 'minSize' ) ? opts.minSize : null;
    let maxSize = opts.hasOwnProperty( 'maxSize' ) ? opts.maxSize : null;
    let minHeight = opts.hasOwnProperty( 'minHeight' ) ? opts.minHeight : 0;
    let maxHeight = opts.hasOwnProperty( 'maxHeight' ) ? opts.maxHeight : 128;
    let lockXZScale = opts.hasOwnProperty( 'lockXZScale' ) ? opts.lockXZScale : false;
    let maxSlope = opts.hasOwnProperty( 'maxSlope' ) ? opts.maxSlope : 0;

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

    let size;
    let sway = 0.05;

    // Create individual objects for the scatter
    for ( let i = 0; i < count; ++i ) {

      let coord = {
        x: Mathf.randRange( this.position.x, this.position.x + this.width ),
        y: 0,
        z: Mathf.randRange( this.position.z, this.position.z + this.height )
      };

      let pos = this.getPosition( coord );
      let normal = this.getNormal( coord );

      // Min height for spawn
      if ( pos.y < minHeight || pos.y > maxHeight || normal.y < maxSlope ) {
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

      let pScale = Mathf.lerp( 0.5, 1.0,
        this.heightmap.perlinNoise( pos.x + this.position.x, pos.z + this.position.z, 3 )
      );

      let xScale = Mathf.randRange( minSize.x, maxSize.x );
      size = {
        x: xScale,
        y: Mathf.randRange( minSize.y, maxSize.y ),
        z: lockXZScale ? xScale : Mathf.randRange( minSize.z, maxSize.z )
      };

      scale.set( size.x * pScale, size.y * pScale, size.z * pScale );
      matrix.compose( position, rotation, scale );
      meshGeo.applyMatrix( matrix );
      geometry.merge( meshGeo, i * vertCount );
      meshGeo.applyMatrix( matrix.getInverse( matrix ) );
    }

    let scatterMesh = new THREE.Mesh( geometry, mesh.material );
    scatterMesh.castShadow = true; // mesh.castShadow;
    return scatterMesh;
  }

  /**
   * @description Gets an object space position on the landscape based on normalized XZ coordinates.
   * @returns {Vector3} The position.
   */
  getPosition( coord ) {

    let localCoord = {
      x: ( coord.x - this.position.x ) / this.width,
      y: ( coord.z - this.position.z ) / this.height
    };

    // Base vertex index
    let ix1 = Math.floor( localCoord.x * SEGS_X );
    let iy1 = Math.floor( localCoord.y * SEGS_Y );

    let i1 = ( VERTS_X * iy1 + ix1 ) * 3; // Bottom right
    let i2 = i1 + 3; // Bottom left
    let i3 = i1 + VERTS_X * 3; // Top right
    let i4 = i3 + 3; // Top left

    // Grid index interpolant time values collected from remainder
    let rx1 = localCoord.x * SEGS_X - ix1;
    let ry1 = localCoord.y * SEGS_Y - iy1;

    let h1, h2, h;

    // Interpolate heights of each vert using bilinear interpolation
    h1 = Mathf.lerp( this.verts[ i1 + 1 ], this.verts[ i2 + 1 ], rx1 ); // Bottom left to bottom right
    h2 = Mathf.lerp( this.verts[ i3 + 1 ], this.verts[ i4 + 1 ], rx1 ); // Top left to top right
    h = Mathf.lerp( h1, h2, ry1 );

    return new THREE.Vector3( coord.x, h, coord.z );
  }

  /**
   * Gets the normal of the terrain at the given normalized XY coordinates.
   * @return {Vector3} The normal.
   */
  getNormal( coord ) {

    let localCoord = {
      x: ( coord.x - this.position.x ) / this.width,
      y: ( coord.z - this.position.z ) / this.height
    };

    // Base vertex index
    let ix1 = Math.floor( localCoord.x * SEGS_X );
    let iy1 = Math.floor( localCoord.y * SEGS_Y );

    let i1 = ( VERTS_X * iy1 + ix1 ) * 3; // Bottom right
    let i2 = i1 + 3; // Bottom left
    let i3 = i1 + VERTS_X * 3; // Top right
    let i4 = i3 + 3; // Top left

    // Grid index interpolant time values collected from remainder
    let rx1 = localCoord.x * SEGS_X - ix1;
    let ry1 = localCoord.y * SEGS_Y - iy1;

    let norms = this.geometry.attributes.normal.array;

    // Interpolate heights of each vert using bilinear interpolation
    let v1 = new THREE.Vector3();
    v1.lerpVectors(
      new THREE.Vector3( norms[ i1 ], norms[ i1 + 1 ], norms[ i1 + 2 ] ),
      new THREE.Vector3( norms[ i2 ], norms[ i2 + 1 ], norms[ i2 + 2 ] ),
      rx1
    );
    let v2 = new THREE.Vector3();
    v2.lerpVectors(
      new THREE.Vector3( norms[ i3 ], norms[ i3 + 1 ], norms[ i3 + 2 ] ),
      new THREE.Vector3( norms[ i4 ], norms[ i4 + 1 ], norms[ i4 + 2 ] ),
      rx1
    );
    let n = new THREE.Vector3();
    n.lerpVectors( v1, v2, ry1 );
    return n;
  }

  /**
   * Creates terrain geometry data and heightmap.
   */
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
        if ( pos.y < -15 ) {
          // let helper = new THREE.AxisHelper( 10 );
          // helper.position.set( pos.x + this.position.x, -15, pos.z + this.position.z );
          // window.flight.scene.add( helper );
        }
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

export default TerrainPatch;;
