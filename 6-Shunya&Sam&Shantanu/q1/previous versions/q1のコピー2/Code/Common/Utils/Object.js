
function objInit(Obj){
	
	/* Initialization Code. 
	(declare and initialize variables, 
	create buffers and transfer data to buffers,
	get locations of attributes and uniforms, etc) */
	// ...

	// for vertices
	var vBuffer;
	var nBuffer;
	// for texCoords
	var tbuffer;
	var tnbuffer;

	var Attributes = ["vPosition", "vNormal", "vTexCoord"];
    var Uniforms = ["M", "N", "Ka", "Kd", "Ks"];
	var Locations = getLocations(Attributes, Uniforms);
	Locations.enableAttributes();

	if (Obj.triangles != undefined){
		// set up index buffer
		var ibuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(Obj.triangles), gl.STATIC_DRAW);
	} 
	else {
		var positions = [];
		var normals = [];
		for (var i=0; i<Obj.dummies.length;i++){
			positions.push(Obj.positions[Obj.dummies[i]]);
			normals.push(Obj.normals[Obj.dummies[i]]);
		}
		Obj.positions = positions;
		Obj.normals = normals;	
	}

	vBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(Obj.positions), gl.STATIC_DRAW);	
	gl.vertexAttribPointer(Locations.vPosition, 3, gl.FLOAT, false, 0, 0);

	nBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(Obj.normals), gl.STATIC_DRAW);	
	gl.vertexAttribPointer(Locations.vNormal, 3, gl.FLOAT, false, 0, 0);


	var K = {
		Ka: vec3(0.5, 0.2, 0.2),
		Kd: vec3(0.1,1,1),
		Ks: vec3(0.1,0.8,0.8)
	};

	gl.uniform3fv( Locations.Ka, flatten(K.Ka) );
	gl.uniform3fv( Locations.Kd, flatten(K.Kd) );
	gl.uniform3fv( Locations.Ks, flatten(K.Ks) );

	var shininess = 3.0;
	gl.uniform1f(gl.getUniformLocation(program, "shininess"), shininess);

	// Assignment 6
	console.log("%c Obj.texCoords ↓", "color: green");
	console.log(Obj.texCoords);
	tbuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, tbuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(Obj.texCoords), gl.STATIC_DRAW);
	gl.vertexAttribPointer(Locations.vTexCoord, 2, gl.FLOAT, false, 0, 0);	
	var width = 2048;
	var height = 1024;
	gl.uniform1i(gl.getUniformLocation(program, "texMap"), 0);
	var texture = newTexture(Obj.diffuseMap, width, height);

	tnbuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, tnbuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(Obj.texCoords), gl.STATIC_DRAW);
	gl.vertexAttribPointer(Locations.vTexCoord, 2, gl.FLOAT, false, 0, 0);	
	var width = 1024;
	var height = 1024;
	gl.uniform1i(gl.getUniformLocation(program, "texMapNormal"), 0);
	var texture = newTexture(Obj.normalMap, width, height);
	
	/*----- Attach functions to Obj -----*/

	Obj.setModelMatrix = function(m){ 
		// use m as the modeling matrix
		// ...
		
		gl.uniformMatrix4fv(Locations.M, false, flatten(m));

		var N = normalTransformationMatrix(m);

		gl.uniformMatrix3fv(Locations.N, false, flatten(N));

	}

	Obj.draw = function(){
		// draw the object
		// ...

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		if (Obj.triangles != undefined){
			gl.drawElements(gl.TRIANGLES, Obj.triangles.length, gl.UNSIGNED_SHORT, 0);
		} else{
			gl.drawArrays(gl.TRIANGLES, 0, Obj.positions.length);	
		}
	}	
}



