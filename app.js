require( './node_modules\/three\/src\/loaders\/ObjectLoader' );

import ImprovedNoise from './include/ImprovedNoise';

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

  const FOG_MOD_SPEED = 0.1;

  let camera,
    renderer,
    scene,
    objectLoader,
    shadowCam,
    cameraAnchor,
    clock;

  let indexAxis = new THREE.AxisHelper( LANDSCAPE_HEIGHT );

  let meshStore = {};

  let startPosCam;
  let startPosLight;

  let plane;

  // Terrain stuff
  let noise = new ImprovedNoise();

  // Directional light
  let sun;
  let shadowAnchor;

  let groundPlane;
  let groundMaterial = new THREE.MeshPhongMaterial( { color: 0x2E3A00 } );

  // Terrain step index
  let index = 0;

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

    let index = Math.round( cameraAnchor.position.x / LANDSCAPE_HEIGHT * 2 );
    indexAxis.position.x = index * LANDSCAPE_HEIGHT / 2;

    if ( plane ) {
      plane.position.set( cameraAnchor.position.x - 256, cameraAnchor.position.y + 250, cameraAnchor.position.z + 256 );
    }

    groundPlane.position.x = index * LANDSCAPE_HEIGHT / 2;

    cameraAnchor.position.x += dt * 64;
    shadowAnchor.position.x = Math.round( cameraAnchor.position.x / 256 ) * 256;

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

      for ( let i = 0; i < TREES_PER_PATCH; ++i ) {

        let angle = getRandomArbitrary( 0, 2 * Math.PI );
        let dist = Math.sqrt( getRandomArbitrary( 0, 1 ) ) * TREE_PATCH_SIZE;
        let width = getRandomArbitrary( 0.5, 1 );
        let posX = Math.sin( angle ) * dist;
        let posY = Math.cos( angle ) * dist;
        let noiseScale = noise.noise( posX / 100 + TREE_PATCH_SIZE * 2 + patchPos.x, posY / 100 + TREE_PATCH_SIZE * 2 + patchPos.z, 0 ) + 0.5;
        let sway = 0.05;
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
      spawnTrees();
    } );

    objectLoader.load( '/static/meshes/plane.json', ( obj ) => {
      plane = obj;
      scene.add( plane );
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
    let gridHelper = new THREE.GridHelper( 16, 1, 0x303030, 0x303030 );
    scene.add( gridHelper );

    // Origin
    let axisHelper = new THREE.AxisHelper( 3 );
    scene.add( axisHelper );

    // Camera
    camera = new THREE.PerspectiveCamera( 15.0, window.innerWidth / window.innerHeight, 100, 10000 );
    cameraAnchor = new THREE.Object3D();
    cameraAnchor.position.set( LANDSCAPE_WIDTH / 2, 0, LANDSCAPE_HEIGHT / 2 );
    cameraAnchor.updateMatrix();
    cameraAnchor.add( camera );
    camera.position.set( -750, 750, 750 );
    camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );
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
  };

  init();
  loadAssets();
  idle();

} )();
