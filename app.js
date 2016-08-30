require( './node_modules\/three\/src\/loaders\/ObjectLoader' );
require( './node_modules\/three\/examples\/js\/controls\/OrbitControls' );

import ImprovedNoise from './include/ImprovedNoise';
import Player from './include/classes/player';
import TerrainPatch from './include/classes/terrain-patch';
import Heightmap from './include/classes/heightmap';
import Mathf from './include/classes/mathf';

( function () {

  // Rendering
  const SHADOW_MAP_WIDTH = 2048;
  const SHADOW_MAP_HEIGHT = 2048;
  const SHADOW_CAM_SIZE = 1024;

  // Trees
  const TREE_PATCH_SIZE = 96;
  const TREE_PATCH_COUNT = 64;
  const TREES_PER_PATCH = 64;
  const TREE_NOISE_SIZE = 100;

  // Terrain patches
  const TERRAIN_PATCH_WIDTH = 128;
  const TERRAIN_PATCH_HEIGHT = 128;
  const TERRAIN_PATCHES_X = 8;
  const TERRAIN_PATCHES_Z = 8;
  const TERRAIN_OFFSET_X = -( TERRAIN_PATCH_WIDTH * ( TERRAIN_PATCHES_X ) ) * 0.5;
  const TERRAIN_OFFSET_Z = 0;
  const TERRAIN_INDEX_OFFSET_Z = -3

  // Data file locations
  const IMAGE_PATH = 'static/images/';
  const MESH_PATH = 'static/meshes/';

  // Player
  const FLIGHT_SPEED = 64;

  // Meshes to load
  let meshFiles = [
    'plane.json',
    'tree.json',
  ];

  // Image files to load
  let imageFiles = [
    'paper.png',
    'grass.jpg',
  ];

  let meshes = {};
  let textures = {};

  let renderer,
    scene,
    cameraControls,
    shadowCam,
    cameraAnchor,
    clock;

  let objectLoader = new THREE.ObjectLoader();

  let meshStore = {};

  let player;
  let gridAxisHelper = new THREE.AxisHelper( TERRAIN_PATCH_WIDTH );

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
    for ( let i = 0; i < y; ++i ) {
      for ( let j = 0; j < TERRAIN_PATCHES_X; ++j ) {
        let tp = terrainPatches[ terrainGridIndex.y % TERRAIN_PATCHES_Z ][ j ];
        tp.position.z += TERRAIN_PATCH_HEIGHT * TERRAIN_PATCHES_Z;
        tp.rebuild();
      }
    }
    for ( let i = 0; i < x; ++i ) {
      for ( let j = 0; j < TERRAIN_PATCHES_Z; ++j ) {
        let tp = terrainPatches[ j ][ terrainGridIndex.x % TERRAIN_PATCHES_X ];
        tp.position.x += TERRAIN_PATCH_WIDTH * TERRAIN_PATCHES_X;
        tp.rebuild();
      }
    }
    terrainGridIndex.x += x;
    terrainGridIndex.y += y;
    waterPlane.position.z += TERRAIN_PATCH_HEIGHT * y;
    shadowAnchor.position.z += TERRAIN_PATCH_HEIGHT * y;
  };

  let gridToWorld = function ( x, y ) {
    return {
      x: x * TERRAIN_PATCH_WIDTH,
      y: 0,
      z: y * TERRAIN_PATCH_HEIGHT
    };
  };

  let worldToGrid = function ( pos ) {
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

    // Fog modulation based on camera pos for fake cloud effect
    let fog = noise.noise( Math.abs( cameraAnchor.position.x / 50 ),
      Math.abs( cameraAnchor.position.y / 50 ),
      Math.abs( cameraAnchor.position.z / 50 ) );
    scene.fog.density = 0.0005; //( fog + 0.5 ) * 0.001 + 0.00025;

    if ( player ) {
      player.update();
      player.gridPos = worldToGrid( player.position );

      while ( player.gridPos.y + TERRAIN_INDEX_OFFSET_Z > terrainGridIndex.y ) {
        // Shift forward
        shiftTerrain( 0, 1 );
      }

      let pos = gridToWorld( player.gridPos.x, player.gridPos.y );
      gridAxisHelper.position.set( pos.x, pos.y, pos.z );

      cameraAnchor.position.set( player.position.x + 100,
        0,
        player.position.z + 100 );
    }

    requestAnimationFrame( idle );
    render();
  };

  let spawnTrees = function () {

    let mesh = meshes[ 'Tree' ].clone();
    let meshGeo = mesh.geometry;
    let vertCount = meshGeo.attributes.position.count;

    let m = new THREE.Matrix4();
    let q = new THREE.Quaternion();
    let p = new THREE.Vector3();
    let s = new THREE.Vector3();

    for ( let j = 0; j < TREE_PATCH_COUNT; ++j ) {

      let patchPos = getRandomPositionOnLandscape();

      // Tree patch geometry
      let treePatchGeo = new THREE.BufferGeometry();
      // Geometry attributes
      let colorAttrib = new THREE.Float32Attribute(
        new Float32Array( vertCount * meshGeo.attributes.color.itemSize * TREES_PER_PATCH ),
        meshGeo.attributes.color.itemSize
      );
      let posAttrib = new THREE.Float32Attribute(
        new Float32Array( vertCount * meshGeo.attributes.position.itemSize * TREES_PER_PATCH ),
        meshGeo.attributes.position.itemSize
      );
      let normAttrib = new THREE.Float32Attribute(
        new Float32Array( vertCount * meshGeo.attributes.position.itemSize * TREES_PER_PATCH ),
        meshGeo.attributes.position.itemSize
      );
      treePatchGeo.addAttribute( 'color', colorAttrib );
      treePatchGeo.addAttribute( 'position', posAttrib );
      treePatchGeo.addAttribute( 'normal', normAttrib );

      let angle, dist, width, posX, posZ, noiseScale, sway;
      for ( let i = 0; i < TREES_PER_PATCH; ++i ) {

        angle = getRandomArbitrary( 0, 2 * Math.PI );
        dist = Math.sqrt( getRandomArbitrary( 0, 1 ) ) * TREE_PATCH_SIZE;
        width = getRandomArbitrary( 0.5, 1 );
        posX = Math.sin( angle ) * dist;
        posZ = Math.cos( angle ) * dist;
        let tx = patchPos.x + posX / TREE_NOISE_SIZE - TERRAIN_OFFSET_X;
        let tz = patchPos.z + posX / TREE_NOISE_SIZE - TERRAIN_OFFSET_Z;
        noiseScale = noise.noise( tx, 0, tz ) + 0.5;
        sway = 0.05;
        let posY = heightmap.getHeight( posX + patchPos.x, posZ + patchPos.z );
        p.set( posX, posY, posZ );
        q.setFromEuler(
          new THREE.Euler(
            getRandomArbitrary( -sway, sway ),
            getRandomArbitrary( 0, Math.PI * 2 ),
            getRandomArbitrary( -sway, sway ),
            THREE.Euler.DefaultOrder
          )
        );
        s.set( width, noiseScale + 0.5, width );
        m.compose( p, q, s );
        meshGeo.applyMatrix( m );
        treePatchGeo.merge( meshGeo, i * vertCount );
        meshGeo.applyMatrix( m.getInverse( m ) );
      }

      let treePatch = new THREE.Mesh( treePatchGeo, mesh.material );
      treePatch.position.set( patchPos.x, patchPos.y, patchPos.z );
      treePatch.castShadow = true;
      treePatches.push( {
        mesh: treePatch,
        gridPos: worldToGrid( treePatch.position )
      } );
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

  let init = function () {

    // Window vars (globals)
    window.flight = {};

    // Renderer
    renderer = new THREE.WebGLRenderer( {
      antialias: false
    } );
    renderer.setClearColor( 0xF9FFE5, 1 );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById( 'container' ).appendChild( renderer.domElement );

    // Clock
    clock = new THREE.Clock( true );
    window.flight.clock = clock;

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2( 0xF9FFE5, 0.001 );

    // Grid helper
    let gridHelper = new THREE.GridHelper( TERRAIN_PATCHES_X * TERRAIN_PATCH_WIDTH, TERRAIN_PATCH_WIDTH, 0x303030, 0x303030 );
    scene.add( gridHelper );

    // Origin
    let axisHelper = new THREE.AxisHelper( 3 );
    scene.add( axisHelper );

    // Game camera
    gameCamera = new THREE.PerspectiveCamera( 20.0, window.innerWidth / window.innerHeight, 100, 10000 );
    cameraAnchor = new THREE.Object3D();
    cameraAnchor.position.set( ( TERRAIN_PATCHES_X * TERRAIN_PATCH_WIDTH ) / 2, 0, ( TERRAIN_PATCHES_Z * TERRAIN_PATCH_HEIGHT ) / 2 );
    cameraAnchor.updateMatrix();
    cameraAnchor.add( gameCamera );
    gameCamera.position.set( -400, 1000, -400 );
    gameCamera.lookAt( new THREE.Vector3( 0, 0, 0 ) );
    scene.add( cameraAnchor );

    // Editor camera
    editorCamera = gameCamera.clone();
    cameraControls = new THREE.OrbitControls( editorCamera, renderer.domElement );
    cameraControls.target.set( 0, 0, TERRAIN_PATCHES_Z * TERRAIN_PATCH_HEIGHT / 2 );
    editorCamera.position.set( -250, 350, -250 );
    cameraControls.update();

    // Main camera is the camera currently being rendered
    renderCamera = editorCamera;

    // Lights
    sun = new THREE.DirectionalLight( 0xffffff, 1.5 );
    sun.position.set( -15, 10, 15 );
    shadowAnchor = new THREE.Object3D();
    shadowAnchor.add( sun.shadow.camera );
    scene.add( shadowAnchor );

    // Shadow
    sun.castShadow = true;
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
    scene.add( new THREE.CameraHelper( sun.shadow.camera ) );
    shadowCam = sun.shadow.camera;

    // Terrain
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

    let t = textures[ 'grass.jpg' ];
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.needsUpdate = true;

    let landscapeMaterial = new THREE.MeshPhongMaterial( {
      color: 0x475905,
      map: t,
      fog: true,
      // shading: THREE.FlatShading,
    } );
    // = new THREE.ShaderMaterial( {
    //   lights: true,
    //   uniforms: THREE.UniformsUtils.merge( [
    //     THREE.ShaderLib.phong.uniforms,
    //     uniforms
    //   ] ),
    //   shading: THREE.FlatShading,
    //   fog: true,
    //   vertexShader: getShader( require( './include/shaders/landscape_vert.glsl' ) ),
    //   fragmentShader: getShader( require( './include/shaders/landscape_frag.glsl' ) )
    // } );

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

    scene.add( new THREE.AmbientLight( 0xeeeeFF, 0.5 ) );
    scene.add( sun );

    // Hemi light
    let hemiLight = new THREE.HemisphereLight( 0xFFFFFF, 0xFFED00, 0.25 );
    hemiLight.position.set( 0, 500, 0 );
    scene.add( hemiLight );

    // Player
    let obj = meshes[ 'plane' ];
    player = new Player( obj.geometry, obj.material );
    scene.add( player );
    scene.add( gridAxisHelper );
    player.castShadow = true;

    spawnTrees();

    // Events
    addEvent( window, 'resize', resize );

    addEvent( window, 'keydown', function ( e ) {
      if ( e.keyCode === 39 ) {
        input.x = 1.0;
      } else if ( e.keyCode === 37 ) {
        input.x = -1.0;
      } else if ( e.keyCode === 32 ) {
        if ( renderCamera === editorCamera ) {
          renderCamera = gameCamera;
          console.log( 'Using game camera.' );
        } else {
          renderCamera = editorCamera;
          console.log( 'Using editor camera.' );
        }
      }
    } );

    addEvent( window, 'keyup', function ( e ) {
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
