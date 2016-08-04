require( './node_modules\/three\/src\/loaders\/ObjectLoader' );
require( './node_modules\/three\/examples\/js\/controls\/OrbitControls' );

import ImprovedNoise from './include/ImprovedNoise';
import Player from './include/classes/player';

( function () {

  const SHADOW_MAP_WIDTH = 1024;
  const SHADOW_MAP_HEIGHT = 1024;
  const SHADOW_CAM_SIZE = 256;
  const NUM_TREES = 256;
  const TREE_PATCH_SIZE = 64;
  const TREE_PATCH_COUNT = 16;
  const TREES_PER_PATCH = 32;
  const LANDSCAPE_WIDTH = 512;
  const LANDSCAPE_HEIGHT = 512;
  const STEPS = 2;
  const FLIGHT_SPEED = 64;

  let camera,
    renderer,
    scene,
    cameraControls,
    objectLoader,
    shadowCam,
    cameraAnchor,
    clock;

  let indexAxis = new THREE.AxisHelper( LANDSCAPE_HEIGHT );

  let meshStore = {};

  let startPosLight;

  let player;

  // Terrain stuff
  let noise = new ImprovedNoise();
  let groundPlane;
  let groundMaterial = new THREE.MeshPhongMaterial( { color: 0x2E3A00 } );

  // Directional light
  let sun;
  let shadowAnchor;

  let editorCamera;
  let mainCamera;

  // Terrain step index
  let index = 0;

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

    // Update camera projection
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  let getRandomPositionOnLandscape = function () {
    return {
      x: getRandomArbitrary( 0, LANDSCAPE_WIDTH ),
      y: 0,
      z: getRandomArbitrary( 0, LANDSCAPE_HEIGHT )
    };
  };

  let render = function () {
    renderer.render( scene, mainCamera );
  };

  let idle = function () {

    let dt = clock.getDelta();

    // Fog modulation based on camera pos for fake cloud effect
    let fog = noise.noise( Math.abs( cameraAnchor.position.x / 50 ),
      Math.abs( cameraAnchor.position.y / 50 ),
      Math.abs( cameraAnchor.position.z / 50 ) );
    scene.fog.density = ( fog + 0.5 ) * 0.001 + 0.00025;

    index = Math.round( cameraAnchor.position.x / LANDSCAPE_HEIGHT * STEPS );

    cameraAnchor.position.x += dt * FLIGHT_SPEED;

    requestAnimationFrame( idle );
    render();
  };

  let spawnTrees = function () {

    let mesh = meshStore[ 'Tree' ].clone();
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
        new Float32Array( vertCount * meshGeo.attributes.color.itemSize * NUM_TREES ),
        meshGeo.attributes.color.itemSize
      );
      let posAttrib = new THREE.Float32Attribute(
        new Float32Array( vertCount * meshGeo.attributes.position.itemSize * NUM_TREES ),
        meshGeo.attributes.position.itemSize
      );
      let normAttrib = new THREE.Float32Attribute(
        new Float32Array( vertCount * meshGeo.attributes.position.itemSize * NUM_TREES ),
        meshGeo.attributes.position.itemSize
      );
      treePatchGeo.addAttribute( 'color', colorAttrib );
      treePatchGeo.addAttribute( 'position', posAttrib );
      treePatchGeo.addAttribute( 'normal', normAttrib );

      let angle, dist, width, posX, posY, noiseScale, sway;
      for ( let i = 0; i < TREES_PER_PATCH; ++i ) {

        angle = getRandomArbitrary( 0, 2 * Math.PI );
        dist = Math.sqrt( getRandomArbitrary( 0, 1 ) ) * TREE_PATCH_SIZE;
        width = getRandomArbitrary( 0.5, 1 );
        posX = Math.sin( angle ) * dist;
        posY = Math.cos( angle ) * dist;
        noiseScale = noise.noise( posX / 100 + TREE_PATCH_SIZE * 2 + patchPos.x, posY / 100 + TREE_PATCH_SIZE * 2 + patchPos.z, 0 ) + 0.5;
        sway = 0.05;
        p.set( posX, 0, posY );
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
      scene.add( treePatch );
    }
  };

  let loadMeshes = function () {

    objectLoader.load( '/static/meshes/tree.json', ( obj ) => {
      let name = obj.name;
      meshStore[ name ] = obj;
      // spawnTrees();
    } );

    objectLoader.load( '/static/meshes/plane.json', ( obj ) => {
      player = new Player( obj.geometry, obj.material );
      scene.add( player );
    } );

  };

  let loadAssets = function () {
    loadMeshes();
  };

  let init = function () {

    // Renderer
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setClearColor( 0xF9FFE5, 1 );
    renderer.shadowMap.enabled = true;
    renderer.shadowMapType = THREE.PCFSoftShadowMap;
    document.getElementById( 'container' ).appendChild( renderer.domElement );

    // Clock
    clock = new THREE.Clock( true );

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2( 0xE9EEFF, 0.0025 );
    scene.add( indexAxis );

    // Loading managers
    objectLoader = new THREE.ObjectLoader();

    // Grid helper
    let gridHelper = new THREE.GridHelper( LANDSCAPE_WIDTH, LANDSCAPE_WIDTH / STEPS, 0x303030, 0x303030 );
    scene.add( gridHelper );

    // Origin
    let axisHelper = new THREE.AxisHelper( 3 );
    scene.add( axisHelper );

    // Game camera
    camera = new THREE.PerspectiveCamera( 35.0, window.innerWidth / window.innerHeight, 100, 10000 );
    cameraAnchor = new THREE.Object3D();
    cameraAnchor.position.set( LANDSCAPE_WIDTH / 2, 0, LANDSCAPE_HEIGHT / 2 );
    cameraAnchor.updateMatrix();
    cameraAnchor.add( camera );
    camera.position.set( -200, 350, 200 );
    camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );
    scene.add( cameraAnchor );

    // Editor camera
    editorCamera = camera.clone();
    cameraControls = new THREE.OrbitControls( editorCamera, renderer.domElement );
    cameraControls.target.set( 0, 0, 0 );
    editorCamera.position.set( 200, 350, 200 );
    cameraControls.update();

    mainCamera = editorCamera;

    // Lights
    sun = new THREE.DirectionalLight( 0xffffff, 1.5 );
    startPosLight = new THREE.Vector3( 0, 30, 30 );
    sun.position.set( startPosLight.x, startPosLight.y, startPosLight.z );
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
    sun.shadow.bias = -0.0005;
    scene.add( new THREE.CameraHelper( sun.shadow.camera ) );
    shadowCam = sun.shadow.camera;

    // Terrain
    groundPlane = new THREE.Mesh( new THREE.PlaneGeometry( LANDSCAPE_WIDTH, LANDSCAPE_HEIGHT, 1, 1 ), groundMaterial );
    groundPlane.position.set( LANDSCAPE_WIDTH / 2, 0, LANDSCAPE_HEIGHT / 2 );
    groundPlane.receiveShadow = true;
    groundPlane.rotation.x = -Math.PI / 2;
    scene.add( groundPlane );

    scene.add( new THREE.AmbientLight( 0xeeeeFF, 0.5 ) );
    scene.add( sun );

    // Hemi light
    let hemiLight = new THREE.HemisphereLight( 0xFFFFFF, 0xFFED00, 0.25 );
    hemiLight.position.set( 0, 500, 0 );
    scene.add( hemiLight );

    resize();

    // Events
    addEvent( window, 'resize', resize );

    addEvent( window, 'keydown', function ( e ) {
      if ( e.keyCode === 39 ) {
        input.x = 1.0;
      } else if ( e.keyCode === 37 ) {
        input.x = -1.0;
      } else if ( e.keyCode === 32 ) {
        if ( mainCamera === editorCamera ) {
          mainCamera = camera;
          console.log( 'Using game camera.' );
        } else {
          mainCamera = editorCamera;
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
  };

  init();
  loadAssets();
  idle();

} )();
