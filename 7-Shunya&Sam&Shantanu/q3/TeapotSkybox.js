"use strict";

// global variables
var gl, canvas, program, grid, cube, teapot_model, cubemap;

var camera; 		// camera object
var trackball; 	// virtual trackball 
var Locations;  // object containing location ids of shader variables 

window.onload = function init() {
	// Set up WebGL
	canvas = document.getElementById("gl-canvas");
	gl = WebGLUtils.setupWebGL( canvas );
	if(!gl){alert("WebGL setup failed!");}

	// set clear color 
	gl.clearColor(0.0, 0.0, 0.0, 1.0);

	//Enable depth test
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL); // since WebGL uses left handed
	gl.clearDepth(1.0); 	 // coordinate system

	// Load shaders and initialize attribute buffers
	program = initShaders( gl, "vertex-shader", "fragment-shader" );
	gl.useProgram( program );

	// Get Locations of attributes and Locations
	var Attributes = [];
	var Uniforms = ["VP", "VIP", "TB", "TBN", "cameraPosition", "cameraProjection", "Ia", "Id", "Is", "lightPosition", "cube", "teapot"];

	Locations = getLocations(Attributes, Uniforms); // defined in Utils.js
 
	// set up virtual trackball
	trackball = Trackball(canvas);

	// set up Camera
	camera = Camera();
	var eye = vec3(0,0,0);
	var at = vec3(0,0,-100);
	var up = vec3(0,1,0);
	camera.lookAt(eye,at,up);
	camera.setPerspective(90,1,0.1,10);


	// set light source
	var Light = {
		position: vec3(0.1,0,0),
		Ia: vec3(0.3, 0.3, 0.3),
		Id: vec3(1,1,1),
		Is: vec3(1,1,1)
	};

	gl.uniform3fv( Locations.lightPosition, flatten(Light.position) );
	gl.uniform3fv( Locations.Ia, flatten(Light.Ia) );
	gl.uniform3fv( Locations.Id, flatten(Light.Id) );
	gl.uniform3fv( Locations.Is, flatten(Light.Is) );

	// set up scene	
	cubemap = Cube();
	cubemap.diffuseMap = "cubemap.jpg";
	objInit(cubemap);
	cubemap.setModelMatrix(rotateX(90));

	// configure the cube map for the teapot
	var numVertices  = 36;
	var texSize = 4;
	var numChecks = 2;

	var flag = true;

	var red = new Uint8Array([255, 0, 0, 255]);
	var green = new Uint8Array([0, 255, 0, 255]);
	var blue = new Uint8Array([0, 0, 255, 255]);
	var cyan = new Uint8Array([0, 255, 255, 255]);
	var magenta = new Uint8Array([255, 0, 255, 255]);
	var yellow = new Uint8Array([255, 255, 0, 255]);

	var cubeMap = gl.createTexture();


	gl.activeTexture( gl.TEXTURE3 );
	gl.uniform1i(gl.getUniformLocation(program, "texMap"), 3);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);

  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X , 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, red);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X , 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, green);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y , 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, blue);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y , 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, cyan);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z , 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, yellow);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z , 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, magenta);

  gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MIN_FILTER,gl.NEAREST);

	// set up the teapot
	teapot.diffuseMap = "cubemap.jpg";
	teapot.material = {
		Ka: vec3(0.6, 0.1, 0.5),
		Kd: vec3(0.7, 0.1, 0.6),
		Ks: vec3(0.8, 0.7, 0.8),
		shininess: 500
	};
	objInit(teapot);
	var m = mult(scalem(0.003,0.003,0.003),rotateX(0));
	m = mult(translate(0,-0.2,-1), m);
	teapot.setModelMatrix(m);

	requestAnimationFrame(render);
};

function render(now){
	requestAnimationFrame(render);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	var TB = trackballWorldMatrix(trackball, camera);
	gl.uniformMatrix4fv(Locations.TB, gl.FALSE, flatten(TB));

	var TBN = normalTransformationMatrix(TB); 
	gl.uniformMatrix3fv(Locations.TBN, gl.FALSE, flatten(TBN));
	
	var VP = camera.getMatrix(); 
	gl.uniformMatrix4fv(Locations.VP, gl.FALSE, flatten(VP));	

	var VIP = inverse(VP);
	gl.uniformMatrix4fv(Locations.VIP, gl.FALSE, flatten(VIP));	

	var cameraProjection = camera.getProjectionMatrix();
	gl.uniformMatrix4fv(Locations.cameraProjection, gl.FALSE, flatten(cameraProjection));

	var cameraPosition = camera.getFrame().e;
	gl.uniform3fv(Locations.cameraPosition, flatten(cameraPosition));

	gl.depthMask(false);
	cubemap.setModelMatrix(mult(translate(cameraPosition), rotateX(90)));
	gl.uniform1f(Locations.cube, 1.0);
	cubemap.draw();
	gl.depthMask(true);
	

	

	var normalMatrix = teapot.getModelMatrix();

	gl.uniform1f(Locations.teapot, 1.0);
	// if the depth mask is disabled, the teapot becomes transparent as the depth buffer is overwritten
	// gl.depthMask(false);
	teapot.draw();
	gl.uniform1f(Locations.teapot, 0.0);
}




function Cube(){
// create sphere with texture coordinates
	var l = 5;
	var a = vec3(-l,-l,-l);
	var b = vec3( l,-l,-l);
	var c = vec3( l, l,-l);
	var d = vec3(-l, l,-l);
	var e = vec3(-l,-l, l);
	var f = vec3( l,-l, l);
	var g = vec3( l, l, l);
	var h = vec3(-l, l, l);

	var n_top = vec3(0,-1,0);
	var n_bottom = vec3(0,1,0);
	var n_left = vec3(1,0,0);
	var n_right = vec3(-1,0,0);
	var n_front = vec3(0,0,-1);
	var n_back = vec3(0,0,1);
	
	var ta = vec2(0,0);
	var tb = vec2(1,0);
	var tc = vec2(1,1);
	var td = vec2(0,1);

	var S = {
		positions: [a,a,a,b,b,b,c,c,c,d,d,d,e,e,e,f,f,f,g,g,g,h,h,h],
  	texCoords: [
  		vec2(0.25, 0.00),  vec2(0.00, 0.33),  vec2(1.00, 0.33),  vec2(0.50, 0.00),
			vec2(0.75, 0.33),  vec2(0.75, 0.33),  vec2(0.50, 0.33),  vec2(0.50, 0.33),
			vec2(0.50, 0.33),  vec2(0.25, 0.33),  vec2(0.25, 0.33),  vec2(0.25, 0.33),
			vec2(0.25, 1.00),  vec2(0.00, 0.66),  vec2(1.00, 0.66),  vec2(0.50, 1.00),
			vec2(0.75, 0.66),  vec2(0.75, 0.66),  vec2(0.50, 0.66),  vec2(0.50, 0.66),
			vec2(0.50, 0.66),  vec2(0.25, 0.66),  vec2(0.25, 0.66),  vec2(0.25, 0.66)
		], 
  	triangles: [
  		[ 0, 3, 6], [ 0, 6, 9],	// bottom
			[18,15,12], [12,21,18],	// top
			[13, 1,10], [13,10,22],	// left
			[ 4,16,19], [ 4,19, 7],	// right
			[11, 8,20], [11,20,23], // back
			[14,17, 5], [14, 5, 2]	// front
		],
  	material: {	
			Ka: vec3(0.9, 0.6, 0.7),
			Kd: vec3(0.7, 1.0, 0.5),
			Ks: vec3(0.9, 0.9, 0.9),
  		shininess: 10
  	}
	};
	return S;
}

