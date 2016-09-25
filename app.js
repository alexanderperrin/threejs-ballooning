require( './node_modules\/three\/src\/loaders\/ObjectLoader' );
require( './node_modules\/three\/examples\/js\/controls\/OrbitControls' );

import ImprovedNoise from './include/ImprovedNoise';
import Player from './include/classes/player';
import TerrainPatch from './include/classes/terrain-patch';
import Heightmap from './include/classes/heightmap';

( function () {

  // Rendering
  const SHADOW_MAP_WIDTH = 512;
  const SHADOW_MAP_HEIGHT = 512;
  const SHADOW_CAM_SIZE = 512;

  // Trees
  const TREE_PATCH_SIZE = 64;
  const TREE_PATCH_COUNT = 128;
  const TREES_PER_PATCH = 128;
  const TREE_NOISE_SIZE = 64;
  const TREE_SCALE = 0.7;

  // Terrain patches
  const TERRAIN_PATCH_WIDTH = 128;
  const TERRAIN_PATCH_HEIGHT = 128;
  const TERRAIN_PATCHES_X = 10;
  const TERRAIN_PATCHES_Z = 12
  const TERRAIN_OFFSET_X = -( TERRAIN_PATCH_WIDTH * ( TERRAIN_PATCHES_X ) ) * 0.5;
  const TERRAIN_OFFSET_Z = 0;
  const TERRAIN_INDEX_OFFSET_Z = 0;

  // Data file locations
  const IMAGE_PATH = 'static/images/';
  const MESH_PATH = 'static/meshes/';

  // Meshes to load
  let meshFiles = [
    'plane.json',
    'tree.json',
    'balloon.json',
  ];

  // Image files to load
  let imageFiles = [];

  let meshes = {};
  let textures = {};

  let renderer,
    scene,
    cameraControls,
    shadowCam,
    cameraAnchor,
    clock;

  let objectLoader = new THREE.ObjectLoader();

  let player;

  // Terrain stuff
  let noise = new ImprovedNoise();

  let heightmap = new Heightmap( {
    noise: noise,
    noiseOffset: {
      x: -TERRAIN_OFFSET_X,
      y: -TERRAIN_OFFSET_Z
    },
    height: 50,
    scale: 100
  } );

  // Used for tracking terrain regeneration requirement
  let terrainGridIndex = {
    x: 0,
    y: 0
  };

  let waterPlane;

  let treePatches = [];

  // Directional light
  let sun;
  let shadowAnchor;

  // Cameras
  let gameCamera, renderCamera, editorCamera;

  let terrainPatches = [];

  // Key input
  let input = {
    x: 0,
    y: 0
  };

  /**
   * Gets the device pixel ratio.
   * @return float the ratio
   */
  let getDevicePixelRatio = function () {
    return window.devicePixelRatio || 1;
  };

  let getRandomArbitrary = function ( min, max ) {
    return Math.random() * ( max - min ) + min;
  };

  let addEvent = function ( object, type, callback ) {
    if ( object === null || typeof ( object ) === 'undefined' ) return;
    if ( object.addEventListener ) {
      object.addEventListener( type, callback, false );
    } else if ( object.attachEvent ) {
      object.attachEvent( 'on' + type, callback );
    } else {
      object[ 'on' + type ] = callback;
    }
  };

  let updateRenderCamera = function () {
    let width = window.innerWidth;
    let height = window.innerHeight;
    renderCamera.aspect = width / height;
    renderCamera.updateProjectionMatrix();
  };

  /**
   * Resize function
   * @param  double width
   * @param  double height
   */
  let resize = function () {
    let width = window.innerWidth;
    let height = window.innerHeight;
    let devicePixelRatio = getDevicePixelRatio();
    renderer.setSize( width * devicePixelRatio, height * devicePixelRatio );

    // Update canvas
    let canvas = renderer.domElement;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    updateRenderCamera();
  };

  let shiftTerrain = function ( x, y ) {
    // Shift forward
    for ( let i = 0; i < y; ++i ) {
      for ( let j = 0; j < TERRAIN_PATCHES_X; ++j ) {
        let tp = terrainPatches[ terrainGridIndex.y % TERRAIN_PATCHES_Z ][ j ];
        tp.position.z += TERRAIN_PATCH_HEIGHT * TERRAIN_PATCHES_Z;
        tp.rebuild();
      }
    }
    // Shift right
    for ( let i = 0; i < x; ++i ) {
      for ( let j = 0; j < TERRAIN_PATCHES_Z; ++j ) {
        let tp = terrainPatches[ j ][ terrainGridIndex.x % TERRAIN_PATCHES_X ];
        tp.position.x += TERRAIN_PATCH_WIDTH * TERRAIN_PATCHES_X;
        tp.rebuild();
      }
    }
    // Shift trees
    for ( let i = 0; i < treePatches.length; ++i ) {
      let tp = treePatches[ i ];
      if ( terrainGridIndex.y > tp.gridPos.y ) {
        tp.gridPos = worldToTerrainGrid( tp.mesh.position );
      }
    }
    terrainGridIndex.x += x;
    terrainGridIndex.y += y;
    waterPlane.position.z += TERRAIN_PATCH_HEIGHT * y;
  };

  let terrainGridToWorld = function ( x, y ) {
    return {
      x: x * TERRAIN_PATCH_WIDTH,
      y: 0,
      z: y * TERRAIN_PATCH_HEIGHT
    };
  };

  let worldToTerrainGrid = function ( pos ) {
    return {
      x: Math.round( pos.x / TERRAIN_PATCH_WIDTH ),
      y: Math.round( pos.z / TERRAIN_PATCH_HEIGHT )
    };
  };

  let getRandomPositionOnLandscape = function () {
    return {
      x: getRandomArbitrary( 0, TERRAIN_PATCHES_X * TERRAIN_PATCH_WIDTH ) + TERRAIN_OFFSET_X,
      y: 0,
      z: getRandomArbitrary( 0, TERRAIN_PATCHES_Z * TERRAIN_PATCH_HEIGHT ) + TERRAIN_OFFSET_Z
    };
  };

  let render = function () {
    renderer.render( scene, renderCamera );
  };

  let idle = function () {

    let dt = clock.getDelta();
    window.flight.deltaTime = dt;
    window.flight.input = input;
    window.flight.time = clock.getElapsedTime();

    if ( player ) {
      player.gridPos = worldToTerrainGrid( player.position );

      while ( player.gridPos.y + TERRAIN_INDEX_OFFSET_Z > terrainGridIndex.y ) {
        // Shift forward
        shiftTerrain( 0, 1 );
      }

      let pos = terrainGridToWorld( player.gridPos.x, player.gridPos.y );

      cameraAnchor.position.set( player.position.x,
        0,
        player.position.z );
    }

    let t = window.flight.time / 10;
    player.position.set( 0, 100, t * 256 );

    shadowAnchor.position.z = player.position.z;

    requestAnimationFrame( idle );
    render();
  };

  let spawnTreePatch = function ( patchPos ) {

    let mesh = meshes[ 'tree' ];
    let meshGeo = mesh.geometry;
    let vertCount = meshGeo.attributes.position.count;

    let matrix = new THREE.Matrix4();
    let rotation = new THREE.Quaternion();
    let position = new THREE.Vector3();
    let scale = new THREE.Vector3();

    // Tree patch geometry
    let treePatchGeo = new THREE.BufferGeometry();
    // Vertex positions
    let posAttrib = new THREE.Float32Attribute(
      new Float32Array( vertCount * meshGeo.attributes.position.itemSize * TREES_PER_PATCH ),
      meshGeo.attributes.position.itemSize
    );
    // Vertex normals
    let normAttrib = new THREE.Float32Attribute(
      new Float32Array( vertCount * meshGeo.attributes.position.itemSize * TREES_PER_PATCH ),
      meshGeo.attributes.position.itemSize
    );
    // Vertex colours
    let colorAttrib = new THREE.Float32Attribute(
      new Float32Array( vertCount * meshGeo.attributes.color.itemSize * TREES_PER_PATCH ),
      meshGeo.attributes.color.itemSize
    );
    treePatchGeo.addAttribute( 'position', posAttrib );
    treePatchGeo.addAttribute( 'normal', normAttrib );
    treePatchGeo.addAttribute( 'color', colorAttrib );

    // Create individual trees for the patch
    let angle, dist, width, posX, posZ, posY, noiseTimeX, noiseTimeZ, noiseScale, sway;
    for ( let i = 0; i < TREES_PER_PATCH; ++i ) {
      angle = getRandomArbitrary( 0, 2 * Math.PI );

      // Distance from center of tree patch
      dist = Math.sqrt( getRandomArbitrary( 0, 1 ) ) * TREE_PATCH_SIZE;
      width = getRandomArbitrary( 0.5, 1 );
      posX = Math.sin( angle ) * dist;
      posZ = Math.cos( angle ) * dist;

      // Perlin noise for scale modulation
      noiseScale = noise.noise(
        patchPos.x + posX / TREE_NOISE_SIZE - TERRAIN_OFFSET_X,
        0,
        patchPos.z + posX / TREE_NOISE_SIZE - TERRAIN_OFFSET_Z
      ) + 0.5;
      sway = 0.05;
      posY = heightmap.getHeight( posX + patchPos.x, posZ + patchPos.z );
      position.set( posX, posY, posZ );
      rotation.setFromEuler(
        new THREE.Euler(
          getRandomArbitrary( -sway, sway ),
          getRandomArbitrary( 0, Math.PI * 2 ),
          getRandomArbitrary( -sway, sway ),
          THREE.Euler.DefaultOrder
        )
      );
      scale.set( width * TREE_SCALE, ( noiseScale ) * TREE_SCALE, width * TREE_SCALE );
      matrix.compose( position, rotation, scale );
      meshGeo.applyMatrix( matrix );
      treePatchGeo.merge( meshGeo, i * vertCount );
      meshGeo.applyMatrix( matrix.getInverse( matrix ) );
    }

    let treePatch = new THREE.Mesh( treePatchGeo, mesh.material );
    treePatch.position.set( patchPos.x, patchPos.y, patchPos.z );
    treePatch.castShadow = true;

    return treePatch;
  };

  let spawnTrees = function () {
    // Spawn tree patches
    for ( let j = 0; j < TREE_PATCH_COUNT; ++j ) {
      let treePatch = spawnTreePatch( getRandomPositionOnLandscape() );
      let patchData = {
        mesh: treePatch,
        gridPos: worldToTerrainGrid( treePatch.position )
      };
      treePatches.push( patchData );
      console.log( patchData );
      scene.add( treePatch );
    }
  };

  let getShader = function ( shaderStr ) {
    return shaderStr.replace( /#include\s+(\S+)/gi, function ( match, p1 ) {
      p1 = p1.substr( 1, p1.length - 2 );
      var chunk = THREE.ShaderChunk[ p1 ];
      return chunk ? chunk : "";
    } );
  };

  let loadMeshes = function () {
    return new Promise( function ( resolve ) {
      let numFiles = meshFiles.length;
      if ( numFiles === 0 ) {
        resolve();
      }
      meshFiles.forEach( v => {
        objectLoader.load( MESH_PATH + v, ( obj ) => {
          let name = obj.name;
          meshes[ name ] = obj;
          numFiles--;
          if ( numFiles === 0 ) {
            resolve();
          }
        } );
      } );
    } );
  };

  let loadTextures = function () {
    return new Promise( function ( resolve ) {
      let numFiles = imageFiles.length;
      if ( numFiles === 0 ) {
        resolve();
      }
      imageFiles.forEach( v => {
        let texture = new THREE.Texture();
        let image = new Image();
        image.onload = function () {
          texture.image = image;
          texture.needsUpdate = true;
          texture.name = v;
          textures[ v ] = texture;
          numFiles--;
          if ( numFiles === 0 ) {
            resolve();
          }
        };
        image.src = IMAGE_PATH + v;
      } );
    } );
  };

  let initRenderer = function () {
    renderer = new THREE.WebGLRenderer( {
      antialias: false
    } );
    renderer.setClearColor( 0xF9FFE5, 1 );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById( 'container' ).appendChild( renderer.domElement );
  };

  let initScene = function () {

    scene = new THREE.Scene();

    let axisHelper = new THREE.AxisHelper( TERRAIN_PATCH_WIDTH );
    scene.add( axisHelper );

    // Game camera
    gameCamera = new THREE.PerspectiveCamera( 15.0, window.innerWidth / window.innerHeight, 100, 10000 );
    cameraAnchor = new THREE.Object3D();
    cameraAnchor.position.set( ( TERRAIN_PATCHES_X * TERRAIN_PATCH_WIDTH ) / 2, 0, ( TERRAIN_PATCHES_Z * TERRAIN_PATCH_HEIGHT ) / 2 );
    cameraAnchor.updateMatrix();
    cameraAnchor.add( gameCamera );
    gameCamera.position.set( 100, 250, -300 );
    gameCamera.lookAt( new THREE.Vector3( 0, 100, 0 ) );
    scene.add( cameraAnchor );

    // Editor camera
    editorCamera = gameCamera.clone();
    cameraControls = new THREE.OrbitControls( editorCamera, renderer.domElement );
    cameraControls.target.set( 0, 0, TERRAIN_PATCHES_Z * TERRAIN_PATCH_HEIGHT / 2 );
    editorCamera.position.set( -250, 350, -250 );
    cameraControls.update();

    renderCamera = gameCamera;

    // Lights
    sun = new THREE.DirectionalLight( 0xffffff, 1.5 );
    sun.position.set( -15, 10, 15 );
    shadowAnchor = new THREE.Object3D();
    shadowAnchor.add( sun.shadow.camera );
    scene.add( shadowAnchor );
    scene.add( new THREE.AmbientLight( 0xeeeeFF, 0.5 ) );
    scene.add( sun );
    scene.fog = new THREE.Fog( 0xfeFFe5, 350, 1650 );
    let hemiLight = new THREE.HemisphereLight( 0xFFFFFF, 0xFFED00, 0.25 );
    hemiLight.position.set( 0, 500, 0 );
    scene.add( hemiLight );

    // Shadows
    sun.castShadow = false;
    sun.shadow.mapSize.width = SHADOW_MAP_WIDTH;
    sun.shadow.mapSize.height = SHADOW_MAP_HEIGHT;
    let sCamSize = SHADOW_CAM_SIZE;
    sun.shadow.camera.right = -sCamSize;
    sun.shadow.camera.left = sCamSize;
    sun.shadow.camera.top = sCamSize - sCamSize / 2;
    sun.shadow.camera.bottom = -sCamSize - sCamSize / 2;
    sun.shadow.camera.far = 512;
    sun.shadow.camera.near = -512;
    sun.shadow.bias = -0.001;
    shadowCam = sun.shadow.camera;
  };

  let initTerrain = function () {

    // Shader uniforms
    let uniforms = {
      cliffColor: {
        type: 'c',
        value: new THREE.Color( 0x353535 )
      },
      grassColor: {
        type: 'c',
        value: new THREE.Color( 0x475905 )
      },
      steps: {
        type: 'f',
        value: 1.0
      },
      threshold: {
        type: 'f',
        value: 0.25
      }
    };

    // Materials
    let landscapeMaterial = new THREE.ShaderMaterial( {
      lights: true,
      uniforms: THREE.UniformsUtils.merge( [
        THREE.ShaderLib.phong.uniforms,
        uniforms
      ] ),
      shading: THREE.FlatShading,
      fog: true,
      vertexShader: getShader( require( './include/shaders/landscape_vert.glsl' ) ),
      fragmentShader: getShader( require( './include/shaders/landscape_frag.glsl' ) )
    } );

    // Terrain patches
    for ( let i = 0; i < TERRAIN_PATCHES_Z; ++i ) {
      terrainPatches[ i ] = [];
      for ( let j = 0; j < TERRAIN_PATCHES_X; ++j ) {
        let tp = new TerrainPatch( {
          width: TERRAIN_PATCH_WIDTH,
          height: TERRAIN_PATCH_HEIGHT,
          position: new THREE.Vector3(
            TERRAIN_PATCH_WIDTH * j + TERRAIN_OFFSET_X,
            0,
            TERRAIN_PATCH_HEIGHT * i + TERRAIN_OFFSET_Z
          ),
          heightmap: heightmap,
          material: landscapeMaterial
        } );
        tp.receiveShadow = true;
        tp.castShadow = true;
        terrainPatches[ i ][ j ] = tp;
        scene.add( terrainPatches[ i ][ j ] );
      }
    }

    // River plane
    let riverMaterial = new THREE.MeshPhongMaterial( {
      color: 0x2f5d63
    } );
    let size = TERRAIN_PATCHES_X * TERRAIN_PATCH_WIDTH;
    let riverMesh = new THREE.PlaneGeometry( size, size, 1, 1 );
    waterPlane = new THREE.Mesh( riverMesh, riverMaterial );
    waterPlane.position.y = -15;
    waterPlane.rotation.x = -Math.PI / 2.0;
    waterPlane.position.z = -TERRAIN_OFFSET_X;
    scene.add( waterPlane );
  };

  let initPlayer = function () {
    let obj = meshes[ 'balloon' ];
    player = new Player();
    player.add( obj );
    scene.add( player );
  };

  let init = function () {

    window.flight = {};
    clock = new THREE.Clock( true );
    window.flight.clock = clock;

    initRenderer();
    initScene();
    initTerrain();
    initPlayer();

    // Events
    addEvent( window, 'resize', resize );
    addEvent( window, 'keydown', function ( e ) {
      // Inputs
      if ( e.keyCode === 39 ) {
        input.x = 1.0;
      } else if ( e.keyCode === 37 ) {
        input.x = -1.0;
      } else if ( e.keyCode === 32 ) {
        // Camera switching
        if ( renderCamera === editorCamera ) {
          renderCamera = gameCamera;
        } else {
          renderCamera = editorCamera;
        }
      }
    } );
    addEvent( window, 'keyup', function ( e ) {
      // Inputs
      if ( e.keyCode === 39 ) {
        input.x = 0;
      } else if ( e.keyCode === 37 ) {
        input.x = 0;
      }
    } );

    resize();
  };

  loadTextures()
    .then( loadMeshes )
    .then( init )
    .then( idle );

} )();
