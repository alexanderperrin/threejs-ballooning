require( './node_modules\/three\/src\/loaders\/ObjectLoader' );

import ImprovedNoise from './include/ImprovedNoise';

( function () {

  const SHADOW_MAP_WIDTH = 1024;
  const SHADOW_MAP_HEIGHT = 1024;
  const SHADOW_CAM_SIZE = 512;
  const NUM_TREES = 10000;
  const TREE_SPREAD = 500;

  const FOG_MOD_SPEED = 0.1;

  let camera,
    renderer,
    scene,
    objectLoader,
    shadowCam,
    cameraAnchor,
    clock;

  let meshes = [];

  let startPosCam;
  let startPosLight;

  // Terrain stuff
  let noise = new ImprovedNoise();

  // Directional light
  let sun;
  let shadowAnchor;

  let groundMaterial = new THREE.MeshPhongMaterial( { color: 0x2E3A00 } );

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

    // Fog modulation based on camera pos for fake cloud effect
    let fog = noise.noise( Math.abs( cameraAnchor.position.x / 50 ),
      Math.abs( cameraAnchor.position.y / 50 ),
      Math.abs( cameraAnchor.position.z / 50 ) );
    scene.fog.density = ( fog + 0.5 ) * 0.001 + 0.00025;

    cameraAnchor.position.x += dt * 15;
    shadowAnchor.position.x = Math.round( cameraAnchor.position.x );

    requestAnimationFrame( idle );
    render();
  };

  let spawnTrees = function () {
    for ( let i = 0; i < NUM_TREES; ++i ) {
      let mesh = meshes[ 0 ].clone();
      let angle = getRandomArbitrary( 0, 2 * Math.PI );
      let dist = Math.sqrt( getRandomArbitrary( 0, 1 ) ) * TREE_SPREAD;
      let width = getRandomArbitrary( 0.25, 0.5 );
      let posX = Math.sin( angle ) * dist;
      let posY = Math.cos( angle ) * dist;
      mesh.position.x = posX;
      mesh.position.z = posY;
      let noiseScale = noise.noise( posX / 100 + TREE_SPREAD * 2, posY / 100 + TREE_SPREAD * 2, 0 ) + 0.5;
      mesh.scale.set( width, noiseScale + 0.5, width );
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

    // Loading managers
    objectLoader = new THREE.ObjectLoader();

    // Grid helper
    let gridHelper = new THREE.GridHelper( 16, 1, 0x303030, 0x303030 );
    scene.add( gridHelper );

    // Origin
    let axisHelper = new THREE.AxisHelper( 3 );
    scene.add( axisHelper );

    // Camera
    camera = new THREE.PerspectiveCamera( 15.0, window.innerWidth / window.innerHeight, 1, 1000 );
    camera.position.set( -250, 500, 500 );
    camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );
    cameraAnchor = new THREE.Object3D();
    cameraAnchor.add( camera );
    scene.add( cameraAnchor );

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
    sun.shadow.camera.top = sCamSize;
    sun.shadow.camera.bottom = -sCamSize;
    sun.shadow.camera.far = 512;
    sun.shadow.camera.near = -512;
    sun.shadow.bias = -0.0005;
    scene.add( new THREE.CameraHelper( sun.shadow.camera ) );
    shadowCam = sun.shadow.camera;

    // Terrain
    let landscapeMaterial = new THREE.ShaderMaterial( {
      vertexShader: require( './include/shaders/landscape_vert.glsl' ),
      fragmentShader: require( './include/shaders/landscape_frag.glsl' ),
      defines: {
        FOO: 15,
        BAR: true
      }
    } );
    let groundPlane = new THREE.Mesh( new THREE.PlaneGeometry( 1000, 1000, 1, 1 ), landscapeMaterial );
    groundPlane.receiveShadow = true;
    groundPlane.rotation.x = -Math.PI / 2;
    scene.add( groundPlane );
    console.log( landscapeMaterial );

    scene.add( new THREE.AmbientLight( 0xeeeeFF, 0.5 ) );
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
