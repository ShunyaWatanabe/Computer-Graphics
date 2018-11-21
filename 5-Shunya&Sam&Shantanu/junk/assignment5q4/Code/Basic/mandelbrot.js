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
	gl.clearColor(1.0, 1.0, 1.0, 1.0);

	// Load shaders and initialize attribute buffers
	program = initShaders( gl, "vertex-shader", "fragment-shader" );
	gl.useProgram( program );

	// Load data into a buffer
	var a = vec3(-1,1,0);
	var b = vec3(-1,-1,0);
	var c = vec3(1,-1,0);
	var d = vec3(1,1,0);
	var vertices = [a, b, c, a, c, d];
	var vBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

	// Do shader plumbing
	var vPosition = gl.getAttribLocation(program, "vPosition");
	gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);

	//Draw a triangle
	gl.drawArrays(gl.TRIANGLES,0,vertices.length); // note that the last argument is 3, not 1 

};