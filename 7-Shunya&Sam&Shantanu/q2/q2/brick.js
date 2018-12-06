"use strict";
var gl; // global variable
var image, nimage;
var trackball, camera;
var program;

window.onload = function init(){
	//Set  up WebGL
    var canvas = document.getElementById( "gl-canvas" );
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) {alert( "WebGL isn't available" );}

    // Set viewport and clear canvas
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // Load shaders and initialize attribute buffers
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Set up buffers and attributes
	var s = 1.0;
	var vertices =  [-s,-s,0,  s,-s,0,  s,s,0,  -s,s,0, 0,0,1];
	var texCoords = [ 0,0,   4,0,  4,4,    0,4];
	var indices =   [0,1,2,  0,2,3, 2,3,4, 0,1,4, 1,2,4];

	var vbuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
	var vPosition = gl.getAttribLocation(program, "vPosition");
	gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);

	var tbuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, tbuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);
	var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
	gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vTexCoord);

	var ibuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(flatten(indices)), gl.STATIC_DRAW);


	var texture = gl.createTexture();
	var mySampler = gl.getUniformLocation(program, "mySampler");

	image = new Image();
	image.onload = function(){handler(texture);};
	image.src = "textures/moss-diffuse.jpg";

	function handler(texture){
		gl.activeTexture(gl.TEXTURE0); 			 // enable texture unit 0
 		gl.bindTexture(gl.TEXTURE_2D, texture);  // bind texture object to target
 		gl.uniform1i(mySampler, 0); 		 // connect sampler to texture unit 0

		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // flip image's y axis
 		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
 		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

		gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_BYTE,0);
	}

	var tnbuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, tnbuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);

	var ntexture = gl.createTexture();
	var nSampler = gl.getUniformLocation(program, "nSampler");

	nimage = new Image();
	nimage.onload = function(){nhandler(ntexture);};
	nimage.src = "textures/moss-normal.jpg";

	function nhandler(texture){
		gl.activeTexture(gl.TEXTURE1); 			 // enable texture unit 1
 		gl.bindTexture(gl.TEXTURE_2D, texture);  // bind texture object to target
 		gl.uniform1i(nSampler, 1); 		 // connect sampler to texture unit 1

		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // flip image's y axis
 		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, nimage);
 		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

		requestAnimationFrame(render);
	}

    // set light source
	var Light = {
		position: vec3(0,2,0),
		Ia: vec3(0.4,0.4,0.4),
		Id: vec3(0.3,0.3,0.3),
		Is: vec3(1.8,0.8,0.8)
	};

    var lightPosition = gl.getUniformLocation(program, "lightPosition");
	var Ia = gl.getUniformLocation(program, "Ia");
    var Id = gl.getUniformLocation(program, "Id");
    var Is = gl.getUniformLocation(program, "Is");
    gl.uniform3fv( lightPosition, flatten(Light.position) );
	gl.uniform3fv( Ia, flatten(Light.Ia) );
	gl.uniform3fv( Id, flatten(Light.Id) );
	gl.uniform3fv( Is, flatten(Light.Is) );

	// set materials
	var Material = {
		Ka: vec3(0.2,0.2,0.2),
		Kd: vec3(0.5,0.5,0.5),
		Ks: vec3(1,1,1)
	};

	var Ka = gl.getUniformLocation(program, "Ka");
    var Kd = gl.getUniformLocation(program, "Kd");
	var Ks = gl.getUniformLocation(program, "Ks");
    gl.uniform3fv( Ka, flatten(Material.Ka) );
	gl.uniform3fv( Kd, flatten(Material.Kd) );
	gl.uniform3fv( Ks, flatten(Material.Ks) );


	var camera = vec3(0,0,5);
	var cameraPosition = gl.getUniformLocation(program, "cameraPosition");
	gl.uniform3fv( cameraPosition, flatten(camera) );

	var shininess = 0.1;
	gl.uniform1f(gl.getUniformLocation(program, "shininess"), shininess);

	trackball = Trackball(canvas);

  var TB = mat3(
    vec3(Math.cos(3.14/2), 0, Math.sin(3.14/2)),
    vec3(0, 1, 0),
    vec3(-Math.sin(1.14/2), 0, Math.cos(3.14/2))
  );

  console.log(TB);

	var TBN = normalTransformationMatrix(TB);
	var tbn = gl.getUniformLocation(program, "TBN");
	gl.uniformMatrix3fv(tbn, gl.FALSE, flatten(TBN));

};


function render(now){

	requestAnimationFrame(render);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  	gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_BYTE,0);
/*
  var TB = mat3(
    vec3(Math.cos(3.14/2), 0, Math.sin(3.14/2)),
    vec3(0, 1, 0),
    vec3(-Math.sin(3.14/2), 0, Math.cos(3.14/2))
  );

  console.log(TB);


	var TBN = normalTransformationMatrix(TB);
	var tbn = gl.getUniformLocation(program, "TBN");
	gl.uniformMatrix3fv(tbn, gl.FALSE, flatten(TBN));
  */



	var TB = trackballWorldMatrix(trackball, camera);
	var tb = gl.getUniformLocation(program, "TB");
	gl.uniformMatrix4fv(tb, gl.FALSE, flatten(TB));

	var TBN = normalTransformationMatrix(TB);
	var tbn = gl.getUniformLocation(program, "TBN");
	gl.uniformMatrix3fv(tbn, gl.FALSE, flatten(TBN));




}

function getMcam(){
	var eye = vec3(0,0,5);
	var at = vec3(0,0,0);
	var up = vec3(0,1,0);

	var v = normalize(subtract(at, eye));
	var n = normalize(cross(v, up));
	var u = normalize(cross(n, v));

	v = negate(v);

	var	MCam = mat4(
		vec4(n, -dot(n, eye)),
		vec4(u, -dot(u, eye)),
		vec4(v, -dot(v, eye)),
		vec4()
	);

	return MCam;
}

function trackballWorldMatrix(trackball){
	var TB = trackball.getMatrix();
	var Mcam = getMcam();
	var T = translate(-Mcam[0][3], -Mcam[1][3], -Mcam[2][3]);
	var M = mult(T,Mcam);
	var I = transpose(M);
	TB = mult(I, mult(TB,M));
	return TB;
}

function normalTransformationMatrix(m){
return inverse3(mat3( m[0][0], m[1][0], m[2][0],
					  m[0][1], m[1][1], m[2][1],
					  m[0][2], m[1][2], m[2][2] ));
}




main();
function main() {

};
