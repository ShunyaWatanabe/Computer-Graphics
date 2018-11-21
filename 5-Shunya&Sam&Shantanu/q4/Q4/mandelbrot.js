"use strict";
var gl;

var ut; //used for animating
// global variables
var vertices, vBuffer, vPosition;
var colors, cBuffer;
window.onload = function init() {
	var canvas = document.getElementById("gl-canvas");
	gl = WebGLUtils.setupWebGL( canvas );
    if(!gl){alert("WebGL setup failed!");}
    
    // Clear canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Load shaders and initialize attribute buffers
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );


	var vertices = [-1, -1, -1, 1, 1, 1, 1, -1];
	var indices = [0,1,2,0,2,3];
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);


    // Do shader plumbing
    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    //Draw the square that we're going to be modifying
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer); //set appropriate buffer as current
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0); // uses currently bound buffer
        

 	// index buffer
	var ibuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);

	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 0);
};