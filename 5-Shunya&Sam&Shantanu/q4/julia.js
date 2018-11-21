"use strict";
var gl;

var ut; //used for animating
// global variables
var program;
var vertices, vBuffer, vPosition;
var colors, cBuffer;
var camera, trackball;
var Locations;
window.onload = function init() {
	var canvas = document.getElementById("gl-canvas");
	gl = WebGLUtils.setupWebGL( canvas );
    if(!gl){alert("WebGL setup failed!");}
    
    // Clear canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Load shaders and initialize attribute buffers
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    var Attributes = [];
    var Uniforms = ["VP", "TB", "TBN", "cameraPosition", "Ia", "Id", "Is", "lightPosition"];
    Locations = getLocations(Attributes, Uniforms);

    trackball = Trackball(canvas);

    // set up Camera
    camera = Camera();          // defined in Camera.js
    var eye = vec3(0,0, 10);
    var at = vec3(0, 0 ,-5);
    var up = vec3(0,1,0);
    camera.lookAt(eye,at,up);
    //camera.setPerspective(45,1,1,10);
    camera.setOrthographic(1, -1, 1, -1, 1, -1);

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

    requestAnimationFrame(render);
    //gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 0);
};

function render(now){
    requestAnimationFrame(render);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var TB = trackballWorldMatrix(trackball, camera);
    gl.uniformMatrix4fv(Locations.TB, gl.FALSE, flatten(TB));

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 0);
}