"use strict";

// global variables
var gl, canvas, program;
var camera; 	// camera object
var trackball; 	// virtual trackball 
var sphere; 
var Locations;  // object containing location ids of shader variables 

window.onload = function init() {
	// Set up WebGL
	canvas = document.getElementById("gl-canvas");
	gl = WebGLUtils.setupWebGL( canvas );
	if(!gl){alert("WebGL setup failed!");}

	gl.viewport( 0, 0, canvas.width, canvas.height );

	// set clear color 
	gl.clearColor(0.8, 0.8, 0.8, 1.0);

	//Enable depth test
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.clearDepth(1.0);

	// Load shaders and initialize attribute buffers
	program = initShaders( gl, "vertex-shader", "fragment-shader" );
	gl.useProgram( program );

	var Attributes = [];
	var Uniforms = ["VP", "TB", "TBN", "cameraPosition", "Ia", "Id", "Is", "lightPosition"];
	Locations = getLocations(Attributes, Uniforms);

	// set up virtual trackball
	trackball = Trackball(canvas);

	// set up Camera
	camera = Camera(); 			// defined in Camera.js
	var eye = vec3(0,0, 3);
	var at = vec3(0, 0 ,0);
	var up = vec3(0,1,0);
	camera.lookAt(eye,at,up);
	camera.setPerspective(90,1,0.1,10);
/*
	// set up Camera
	camera = Camera(); 			// defined in Camera.js
	var eye = vec3(0,0, -5);
	var at = vec3(0, 0 ,5);
	var up = vec3(0,1,0);
	camera.lookAt(eye,at,up);
	//camera.setPerspective(45,1,1,10);
	camera.setOrthographic(1, -1, 1, -1, 1, -1);
*/
	sphere = Sphere(20.0);

	objInit(sphere);// defined in Object.js
	sphere.setModelMatrix(scalem(2,1,2));

	// set light source
	var Light = {
		position: vec3(-5,10,20),
		Ia: vec3(0.2, 0.2, 0.2),
		Id: vec3(1,1,1),
		Is: vec3(0.8,0.8,0.8)
	};

	gl.uniform3fv( Locations.lightPosition, flatten(Light.position) );
	gl.uniform3fv( Locations.Ia, flatten(Light.Ia) );
	gl.uniform3fv( Locations.Id, flatten(Light.Id) );
	gl.uniform3fv( Locations.Is, flatten(Light.Is) );

	var shading = 3.0; // flat: 1.0, Gouraud: 2.0, Phong: 3.0
	gl.uniform1f(gl.getUniformLocation(program, "shading"), shading);

	console.log("%c　triangles ↓", "color: green");
	console.log(sphere.triangles);

	requestAnimationFrame(render);
};

function render(now){
	
	requestAnimationFrame(render);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	var TB = trackballWorldMatrix(trackball, camera);
	gl.uniformMatrix4fv(Locations.TB, gl.FALSE, flatten(TB));

	//console.log(TB);

	var TBN = normalTransformationMatrix(TB); 
	gl.uniformMatrix3fv(Locations.TBN, gl.FALSE, flatten(TBN));
	
	//console.log(TBN);

	var VP = camera.getMatrix(); 
	gl.uniformMatrix4fv(Locations.VP, gl.FALSE, flatten(VP));	

	//console.log(VP);

	var cameraPosition = camera.getFrame().e;
	gl.uniform3fv(Locations.cameraPosition, flatten(cameraPosition));

	console.log(cameraPosition);

	sphere.draw();
}


//-------------------------- CREATE SPHERE ----------------------------------- 

function Sphere(n){

	var S = { 	positions: [],
		 	  	normals: [], 
		 	  	triangles: [],
		 	  	dummies: [],
		 	  	texCoords: [],
		 	  	tangents: [],
		 	  	bitangents: [],
		 	  	diffuseMap: "earth-diffuse.jpg",
		 	  	normalMap: "earth-normal.jpg",
		 	};

	positions();
	triangles();
	texCoords();
	tangents();
	bitangents();

	if (S.triangles != undefined){
		S.triangles = S.dummies;	
	}
	
	function texCoords(){
		for (var i=0; i<S.positions.length; i++){
			var x = S.positions[i][0];
			var y = S.positions[i][1];
			var z = S.positions[i][2];
			var theta = Math.atan2(Math.sqrt(x*x+y*y), z);
			var phi = Math.atan2(y, x);
			if (phi < 0){
				phi += 2*Math.PI;
			}
			var s = phi/(2*Math.PI);
			var t = 1 - theta/Math.PI;
			S.texCoords.push(vec2(s, t))
		}
	}

	function tangents(){
		for (var i=0; i<S.positions.length; i++){
			var x = S.positions[i][0];
			var z = S.positions[i][2];
			var p = vec3(z, -x, 0);
			S.tangents.push(p);
		}
	}

	function bitangents(){
		for (var i=0; i<S.positions.length; i++){
			var v = cross(S.tangents[i], S.normals[i]);
			S.bitangents.push(v);
		}
	}

	function positions(){
		// top
		var p = vec3(0,1,0); 
		push(p);

		// middle
		for (var i=0; i<n*2-1; i++){
			p = multiply(rotateAroundZ(), p);
			push(p);

			for (var j=0; j<n*4;j++){
				p = multiply(rotateAroundY(), p);
				push(p);
			}
		}

		// bottom
		p = vec3(0, -1, 0);
		push(p);
	}

	function triangles(){
		var counter = 0;
		for (var i=0; i<n*2;i++){
			for (var j=0; j<n*4; j++){
				// top
				if (i==0){
					S.dummies.push(0, j+1, j+2);	
				}
				// bottom
				else if (i==n*2-1){
					var c = counter+1; //constant
					var a = c-n*4+j;
					var b = a+1;
					S.dummies.push(a, b, c);
				}
				// middle
				else{
					var b = counter+1+j;
					var a = b-n*4;
					var c = b+1;
					var d = a+1;
					// a, b, c
					S.dummies.push(a,b,c);
					// a, c, d
					S.dummies.push(a,c,d);
				}
			}
			counter += n*4;
		}
	}

	// add positions and normals
	function push(p){
		var n = normalize(p);
		S.positions.push(p);
		S.normals.push(n);	
	}
	
	function rotateAroundZ(){
		var angle = 180.0/(2*n);
		var axis = vec3(0,0,1);
		return rotate(angle, axis);
	}

	function rotateAroundY(){
		var angle = 360.0/(4*n);
		var axis = vec3(0,1,0);
		return rotate(angle, axis);
	}

	function multiply(mat, vec){
		return vec3(
			mat[0][0]*vec[0]+mat[0][1]*vec[1]+mat[0][2]*vec[2],
			mat[1][0]*vec[0]+mat[1][1]*vec[1]+mat[1][2]*vec[2],
			mat[2][0]*vec[0]+mat[2][1]*vec[1]+mat[2][2]*vec[2]
		);
	}

	return S;
	
}
