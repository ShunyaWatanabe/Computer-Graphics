"use strict";
var gl, canvas, camera, trackball, indices, program, image, nimage, texCoords; // global variable

window.onload = function init(){
	//Set  up WebGL
    canvas = document.getElementById( "gl-canvas" );
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) {alert( "WebGL isn't available" );}
    
    // Set viewport and clear canvas
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL); // since WebGL uses left handed
	gl.clearDepth(1.0); 	 // coordinate system

    // Load shaders and initialize attribute buffers
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    // Set up buffers and attributes
	var num = 10;
	var vertices = [];
	indices = [];
	texCoords = [];
	for (var i=0; i<num; i++){
		var x = i;
		for (var j=0; j<num; j++){
			var z = j;
			var p1 = vec3(x-1, -0.5,   z);
			var p2 = vec3(x-1, -0.5, z-1);
			var p3 = vec3(  x, -0.5, z-1);
			var p4 = vec3(  x, -0.5,   z);
			vertices.push(p1, p2, p3, p4);
			var i0 = i*num*4 + j*4 + 0;
			var i1 = i*num*4 + j*4 + 1;
			var i2 = i*num*4 + j*4 + 2;
			var i3 = i*num*4 + j*4 + 3;
			indices.push(i0, i1, i2, i0, i2, i3);
			var t1 = vec2(0, 1);
			var t2 = vec2(0, 0);
			var t3 = vec2(1, 0);
			var t4 = vec2(1, 1);
			texCoords.push(t1, t2, t3, t4);
		}
	}

	var buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
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
	
	// set up index buffer
	var ibuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);

	// set up camera
	camera = Camera();
	var eye = vec3(0, 0, 3);
	var at =  vec3(0, 0, 0);
	var up =  vec3(0, 1, 1);
	camera.lookAt(eye,at,up);
	camera.setPerspective(90, 1, 0.1, 10); //fovy, aspect, near, far
	//camera.setOrthographic(1, -1, 1, -1, 1, -1); //r,l,t,b,n,f
	camera.allowMovement();

	var shininess = 0.1;
	gl.uniform1f(gl.getUniformLocation(program, "shininess"), shininess);

	trackball = Trackball(canvas);

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

	//Draw
	//requestAnimationFrame(render);
	//gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);
	useTexture();
}; 


function render(now){

	requestAnimationFrame(render);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  	gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);

  	var cameraPosition = camera.getFrame().e;
	gl.uniform3fv(gl.getUniformLocation(program, "cameraPosition"), flatten(cameraPosition));
	
	var VP = camera.getMatrix(); 
	var vp = gl.getUniformLocation(program, "VP");
	gl.uniformMatrix4fv(vp, gl.FALSE, flatten(VP));	

	var TB = trackballWorldMatrix(trackball, camera);
	var tb = gl.getUniformLocation(program, "TB");
	gl.uniformMatrix4fv(tb, gl.FALSE, flatten(TB));

	var TBN = normalTransformationMatrix(TB);
	var tbn = gl.getUniformLocation(program, "TBN");
	gl.uniformMatrix3fv(tbn, gl.FALSE, flatten(TBN));

}


function useTexture(){

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
}