require( './node_modules\/three\/src\/loaders\/ObjectLoader' );
require( './node_modules\/three\/examples\/js\/controls\/OrbitControls' );

import Player from './include/classes/player';
import TerrainPatch from './include/classes/terrain-patch';
import Heightmap from './include/classes/heightmap';

( function () {

  // Rendering
  const SHADOW_MAP_WIDTH = 512;
  const SHADOW_MAP_HEIGHT = 512;
  const SHADOW_CAM_SIZE = 512;

  // File
  const IMAGE_PATH = 'static/images/';
  const MESH_PATH = 'static/meshes/';

  let meshFiles = [
    'tree.json',
    'balloon.json',
  ];
  let imageFiles = [];

  let objectLoader = new THREE.ObjectLoader();

  // Data storage
  let meshes = {};
  let textures = {};

  // Lights, camera and helpers
  let renderer,
    scene,
    cameraControls,
    sun, // Directional light
    cameraAnchor, // Camera base rotator
    gameCamera, // Game view camera
    renderCamera, // Currently rendering camera
    editorCamera, // Utility view camera
    lightAnchor, // Used for containing sun object and target in more managable unit
    lightPosIndex, // Used for tracking movment of light
    lightShadowOffset, // Used for offsetting shadow camera matrix
    clock,
    player;


  // Terrain
  const TERRAIN_PATCH_WIDTH = 64;
  const TERRAIN_PATCH_HEIGHT = 64;
  const TERRAIN_PATCHES_X = 5;
  const TERRAIN_PATCHES_Z = 12;
  const TERRAIN_OFFSET_X = -( TERRAIN_PATCH_WIDTH * ( TERRAIN_PATCHES_X ) ) * 0.5;
  const TERRAIN_OFFSET_Z = -64;
  const TREES_PER_TERRAIN = 150;
  const WATER_HEIGHT = -15.0;
  let heightmap = new Heightmap( {
    noiseOffset: {
      x: -TERRAIN_OFFSET_X,
      y: -TERRAIN_OFFSET_Z
    },
    height: 50,
    scale: 100
  } );
  let terrainPatches = [];
  let waterPlane;
  // Used for tracking terrain regeneration requirement
  let terrainGridIndex = {
    x: 0,
    y: 0
  };

  // Input
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

  /**
   * Adds an event to the object
   * @param {object}   object   object to add event to
   * @param {string}   type     event type
   * @param {Function} callback event handler
   */
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

  /**
   * Shifts the terrain by given units
   * @param  {[type]} x terrain units to shift in x
   * @param  {[type]} y terrain units to shift in y
   */
  let shiftTerrain = function ( x, y ) {
    // Shift forward
    for ( let i = 0; i < y; ++i ) {
      for ( let j = 0; j < TERRAIN_PATCHES_X; ++j ) {
        let tp = terrainPatches[ terrainGridIndex.y % TERRAIN_PATCHES_Z ][ j ];
        tp.position.z += TERRAIN_PATCH_HEIGHT * TERRAIN_PATCHES_Z;
        tp.rebuild( scene );
      }
    }
    // Shift right
    for ( let i = 0; i < x; ++i ) {
      for ( let j = 0; j < TERRAIN_PATCHES_Z; ++j ) {
        let tp = terrainPatches[ j ][ terrainGridIndex.x % TERRAIN_PATCHES_X ];
        tp.position.x += TERRAIN_PATCH_WIDTH * TERRAIN_PATCHES_X;
        tp.rebuild( scene );
      }
    }
    terrainGridIndex.x += x;
    terrainGridIndex.y += y;
    waterPlane.position.z += TERRAIN_PATCH_HEIGHT * y;
  };

  /**
   * Terrain grid index to world position transformation
   * @param  {int} x terrain index x
   * @param  {int} y terrain index y
   * @return {vec3}   world position
   */
  let terrainGridToWorld = function ( x, y ) {
    return {
      x: x * TERRAIN_PATCH_WIDTH,
      y: 0,
      z: y * TERRAIN_PATCH_HEIGHT
    };
  };

  /**
   * World position to terrain grid index transformation
   * @param  {vec3} pos world position
   * @return {vec2}     terrain index
   */
  let worldToTerrainGrid = function ( pos ) {
    return {
      x: Math.round( pos.x / TERRAIN_PATCH_WIDTH ),
      y: Math.round( pos.z / TERRAIN_PATCH_HEIGHT )
    };
  };

  /// Gets a random position on the entire landscape
  let getRandomPositionOnLandscape = function () {
    return {
      x: getRandomArbitrary( 0, TERRAIN_PATCHES_X * TERRAIN_PATCH_WIDTH ) + TERRAIN_OFFSET_X,
      y: 0,
      z: getRandomArbitrary( 0, TERRAIN_PATCHES_Z * TERRAIN_PATCH_HEIGHT ) + TERRAIN_OFFSET_Z
    };
  };

  /// Redraw the view
  let render = function () {
    renderer.render( scene, renderCamera );
  };

  /**
   * Parses a shader from the THREE shader chunk library
   * @param  {[type]} shaderStr [description]
   * @return {[type]}           [description]
   */
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

  /**
   * Loads the textures specified in the textures URL array.
   */
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

  /**
   * Initialises the THREE WebGL renderer and appends to DOM.
   * @return {[type]} [description]
   */
  let initRenderer = function () {
    renderer = new THREE.WebGLRenderer( {
      antialias: false
    } );
    renderer.setClearColor( 0x000000, 1 );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById( 'container' ).appendChild( renderer.domElement );
  };

  /**
   * Initialises the base scene objects and helpers.
   */
  let initScene = function () {

    scene = new THREE.Scene();

    lightShadowOffset = new THREE.Object3D();

    // Used for storing sun camera and target
    lightAnchor = new THREE.Object3D();
    scene.add( lightAnchor );
    lightAnchor.add( lightShadowOffset );

    // Used for transforming light and shadow cameras
    let lightMatrix = new THREE.Matrix4();
    let rotation = new THREE.Quaternion();
    rotation.setFromEuler( new THREE.Euler(
      THREE.Math.degToRad( 45 ),
      THREE.Math.degToRad( -135 ),
      0, 'YXZ' ) );
    lightMatrix.compose( new THREE.Vector3( 0, 128, 0 ), rotation, new THREE.Vector3( 1, 1, 1 ) );

    // Lights
    sun = new THREE.DirectionalLight( 0xffffff, 1.5 );
    sun.position.set( 0, 0, 0 );
    sun.target.position.set( 0, 0, 128 );
    scene.add( new THREE.AmbientLight( 0xeeeeFF, 0.5 ) );
    // scene.fog = new THREE.Fog( 0xdaf0fb, 350, 950 );
    let hemiLight = new THREE.HemisphereLight( 0xFFFFFF, 0xFFED00, 0.25 );
    hemiLight.position.set( 0, 500, 0 );
    scene.add( hemiLight );

    // Shadows
    sun.castShadow = true;
    sun.shadow.mapSize.width = SHADOW_MAP_WIDTH;
    sun.shadow.mapSize.height = SHADOW_MAP_HEIGHT;
    let sCamSize = SHADOW_CAM_SIZE;
    sun.shadow.camera.right = -sCamSize / 2;
    sun.shadow.camera.left = sCamSize / 2;
    sun.shadow.camera.top = sCamSize / 2;
    sun.shadow.camera.bottom = -sCamSize / 2;
    sun.shadow.camera.far = 512;
    sun.shadow.camera.near = 0;
    sun.shadow.bias = -0.0025;

    lightShadowOffset.add( sun );
    lightShadowOffset.add( sun.target );
    lightAnchor.applyMatrix( lightMatrix );
    scene.add( new THREE.CameraHelper( sun.shadow.camera ) );

    window.flight.scene = scene;
  };

  let initTerrain = function () {

    // Shader uniforms
    let uniforms = {
      cliffColor: {
        type: 'c',
        value: new THREE.Color( 0x555555 )
      },
      grassColor: {
        type: 'c',
        value: new THREE.Color( 0x475905 )
      },
      sandColor: {
        type: 'c',
        value: new THREE.Color( 0x886633 )
      },
      steps: {
        type: 'f',
        value: 1.0
      },
      waterHeight: {
        type: 'f',
        value: WATER_HEIGHT + 0.5
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
        tp.addScatterObject( meshes[ 'tree' ], TREES_PER_TERRAIN );
        terrainPatches[ i ][ j ] = tp;
        scene.add( terrainPatches[ i ][ j ] );
      }
    }

    // River plane
    let riverMaterial = new THREE.MeshPhongMaterial( {
      color: 0x2f5d63
    } );
    let riverMesh = new THREE.PlaneGeometry( TERRAIN_PATCHES_X * TERRAIN_PATCH_WIDTH,
      TERRAIN_PATCHES_Z * TERRAIN_PATCH_HEIGHT,
      1, 1 );
    waterPlane = new THREE.Mesh( riverMesh, riverMaterial );
    waterPlane.position.y = -15;
    waterPlane.rotation.x = -Math.PI / 2.0;
    waterPlane.position.z = -TERRAIN_OFFSET_X;
    scene.add( waterPlane );
  };

  let initPlayer = function () {
    let obj = meshes[ 'balloon' ];
    player = new Player();
    player.position.set( 0, 100, 0 );
    player.add( obj );
    scene.add( player );
  };

  let initCameras = function () {
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
  };

  let init = function () {

    window.flight = {};
    clock = new THREE.Clock( true );
    window.flight.clock = clock;
    window.flight.input = 0;

    initRenderer();
    initScene();
    initPlayer();
    initCameras();
    initTerrain();

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

  let idle = function () {

    let dt = clock.getDelta();
    window.flight.deltaTime = dt;
    window.flight.input = input;
    window.flight.time = clock.getElapsedTime();

    lightAnchor.position.z += TERRAIN_PATCH_HEIGHT;
    lightAnchor.updateMatrixWorld();
    // Snap the shadow camera matrix to the nearest texel to prevent shadow swimming
    let lPos = new THREE.Vector3( 0, 0, 0 ); // Real shadow cam position
    let lPos2 = new THREE.Vector3( 0, 0, 0 ); // Texel snapped cam position
    lightAnchor.worldToLocal( lPos );
    lPos2.set( lPos.x, lPos.y, lPos.z );
    let tSize = SHADOW_CAM_SIZE / SHADOW_MAP_WIDTH;
    lPos2.x = Math.round( lPos2.x / tSize ) * tSize;
    lPos2.y = Math.round( lPos2.y / tSize ) * tSize;
    lightShadowOffset.position.set( lPos.x - lPos2.x, lPos.y - lPos2.y, 0 );
    renderer.shadowMap.needsUpdate = true;

    if ( player ) {
      player.update();
      player.gridPos = worldToTerrainGrid( player.position );
      // Check for terrain shift
      while ( player.gridPos.y > terrainGridIndex.y ) {
        shiftTerrain( 0, 1 );
      }
      cameraAnchor.position.set( player.position.x, 0, player.position.z );
    }

    requestAnimationFrame( idle );
    render();
  };

  loadTextures()
    .then( loadMeshes )
    .then( init )
    .then( idle );

} )();
