require( './node_modules\/three\/examples\/js\/controls\/OrbitControls' );
require( './node_modules\/three\/src\/loaders\/ObjectLoader' );

import ImprovedNoise from './include/ImprovedNoise';

( function () {

  const SHADOW_MAP_WIDTH = 512;
  const SHADOW_MAP_HEIGHT = 512;
  const SHADOW_CAM_SIZE = 256;
  const NUM_TREES = 10000;

  let camera,
    renderer,
    cameraControls,
    scene,
    objectLoader,
    shadowCam,
    clock;

  let meshes = [];

  let startPosCam;
  let startPosLight;

  // Directional light
  let sun;
  let shadowAnchor;

  let groundMaterial = new THREE.MeshPhongMaterial( { color: 0x1E2A00 } );

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

  let render = function () {
    renderer.render( scene, camera );
  };

  let idle = function () {

    let dt = clock.getDelta();

    let time = clock.getElapsedTime();

    requestAnimationFrame( idle );
    render();
  };

  let spawnTrees = function () {
    for ( let i = 0; i < NUM_TREES; ++i ) {
      let mesh = meshes[ 0 ].clone();
      let angle = getRandomArbitrary( 0, 2 * Math.PI );
      let dist = Math.sqrt( getRandomArbitrary( 0, 1 ) ) * 500;
      let width = getRandomArbitrary( 0.5, 0.8 );
      mesh.position.x = Math.sin( angle ) * dist;
      mesh.position.z = Math.cos( angle ) * dist;
      mesh.scale.set( width, getRandomArbitrary( 0.85, 1 ), width );
      let sway = 0.05;
      mesh.rotation.set(
        getRandomArbitrary( -sway, sway ),
        getRandomArbitrary( 0, Math.PI * 2 ),
        getRandomArbitrary( -sway, sway )
      );
      scene.add( mesh );
    }
  };

  let loadMeshes = function () {

    objectLoader.load( '/static/meshes/tree.json', ( obj ) => {
      meshes.push( obj );
      spawnTrees();
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

    // Camera
    camera = new THREE.PerspectiveCamera( 40.0, window.innerWidth / window.innerHeight, 1, 1000 );
    scene.add( camera );

    // Loading managers
    objectLoader = new THREE.ObjectLoader();

    // Grid helper
    let gridHelper = new THREE.GridHelper( 16, 1, 0x303030, 0x303030 );
    scene.add( gridHelper );

    // Origin
    let axisHelper = new THREE.AxisHelper( 3 );
    scene.add( axisHelper );

    // Camera controls
    cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
    cameraControls.target.set( 0, 0, 0 );
    startPosCam = new THREE.Vector3( 0, 100, 100 );
    camera.position.set( startPosCam.x, startPosCam.y, startPosCam.z );
    cameraControls.update();

    // Lights
    sun = new THREE.DirectionalLight( 0xffffff, 1.25 );
    startPosLight = new THREE.Vector3( 0, 50, 50 );
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
    sun.shadow.camera.top = sCamSize;
    sun.shadow.camera.bottom = -sCamSize;
    sun.shadow.camera.far = 250;
    sun.shadow.bias = -0.005;
    scene.add( new THREE.CameraHelper( sun.shadow.camera ) );
    shadowCam = sun.shadow.camera;

    let groundPlane = new THREE.Mesh( new THREE.PlaneGeometry( 1000, 1000, 1, 1 ), groundMaterial );
    groundPlane.receiveShadow = true;
    groundPlane.rotation.x = -Math.PI / 2;
    scene.add( groundPlane );

    scene.add( new THREE.AmbientLight( 0xeeeeFF, 0.75 ) );
    scene.add( sun );

    // Hemi light
    let hemiLight = new THREE.HemisphereLight( 0xFFFFFF, 0xFFED00, 0.25 );
    hemiLight.position.set( 0, 500, 0 );
    scene.add( hemiLight );

    resize();

    // Events
    addEvent( window, 'resize', resize );
  };

  init();
  loadAssets();
  idle();

} )();
