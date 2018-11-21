/* Note: ObjInit uses functions from Utils.js and Texture.js */

function objInit(Obj){
	
	var modelMatrix  = mat4(); // modelling matrix
	var normalMatrix = mat3(); // normal transformation matrix

	var vBuffer = gl.createBuffer(); // buffer for vertex positions
	var iBuffer = gl.createBuffer(); // buffer for indices

	var nBuffer, tBuffer, tanBuffer, bitanBuffer; // these buffers are created as required
	var diffuseMapTexture, normalMapTexture; // texture objects
	
	// Set boolean flags for later use
	var	trianglesPresent  = (Obj.triangles != undefined);		
	var	normalsPresent    = (Obj.normals   != undefined);
	var	tansPresent 	  = (Obj.tangents  != undefined);
	var	bitansPresent 	  = (Obj.bitangents!= undefined);
	var	texCoordsPresent  = (Obj.texCoords != undefined);
	var diffuseMapPresent = (Obj.diffuseMap!= undefined);
	var normalMapPresent  = (Obj.normalMap != undefined);

	/* Not all attributes and uniforms defined below need to be defined in the shaders.*/
	var Attributes = ["vPosition", "vNormal", "vTexCoord", "vTangent", "vBitangent"];
	var Uniforms   = ["M", "N", "usingDiffuseMap", "usingNormalMap", "diffuseSampler", 
					  "normalSampler", "Ka", "Kd", "Ks", "shininess"];
	
	var programInfo = {}; // stores data specific to a program  

	// Create necessary buffers 
	if(normalsPresent)   { nBuffer = gl.createBuffer(); 	}
	if(tansPresent)      { tanBuffer = gl.createBuffer();	}
	if(bitansPresent)    { bitanBuffer = gl.createBuffer(); }
	if(texCoordsPresent) { tBuffer = gl.createBuffer();	    }

	if(!trianglesPresent) createTriangles();

	sendBufferData(); // Send data to buffers. 

	createTextures(); // Create necessary texture objects. 


	
/*----- Attach data and functions to Obj -----*/

	if(Obj.material == undefined){ 
		// Set default material
		Obj.material = {	
			Ka: vec3(1.0, 1.0, 1.0),
			Kd: vec3(Math.random(), Math.random(), Math.random()),
			Ks: vec3(0.4, 0.4, 0.4),
			shininess: 500*Math.random() 
		};
	}
	 
	Obj.setModelMatrix = function(m){ 
		modelMatrix = m; 
		normalMatrix = normalTransformationMatrix(m);
	}

	Obj.getModelMatrix = function(){return modelMatrix;}

	Obj.getNormalTransformationMatrix = function(){return normalMatrix;}

	Obj.draw = function(){

		var program = gl.getParameter(gl.CURRENT_PROGRAM);
		
		var I = programInfo[program.id]; 

		if(I == undefined) I = setProgramInfo(program);

		var Loc = I.Locations;
		
		Loc.enableAttributes(); // enable attributes 

		// set attribute pointers
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.vertexAttribPointer(Loc.vPosition, 3, gl.FLOAT, false, 0, 0);
		
		if(I.useNormals){
			gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
			gl.vertexAttribPointer(Loc.vNormal, 3, gl.FLOAT, false, 0, 0);
		}

		if(I.useTans){
			gl.bindBuffer(gl.ARRAY_BUFFER, tanBuffer);
			gl.vertexAttribPointer(Loc.vTangent, 3, gl.FLOAT, false, 0, 0);
		}

		if(I.useBitans){
			gl.bindBuffer(gl.ARRAY_BUFFER, bitanBuffer);
			gl.vertexAttribPointer(Loc.vBitangent, 3, gl.FLOAT, false, 0, 0);
		}
	
		if(I.useTexCoords){
			gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
			gl.vertexAttribPointer(Loc.vTexCoord, 2, gl.FLOAT, false, 0 ,0);
		}

		if(I.useDiffuseMap){
			// we use texture unit 0 for diffuse map
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, diffuseMapTexture);
			gl.uniform1i(Loc.diffuseSampler, 0);
		}
	
		if(Loc.usingDiffuseMap != undefined){
			// set the variable usingDiffuseMap if it exists in the shader program
			gl.uniform1i(Loc.usingDiffuseMap, I.useDiffuseMap? 1: 0);
		}

		if(I.useNormalMap){
			// we use texture unit 1 for normal map
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, normalMapTexture);
			gl.uniform1i(Loc.normalSampler, 1);			
		}	

		if(Loc.usingNormalMap != undefined) {
			// set the variable  usingNormalMap if exists in the shader program
			gl.uniform1i(Loc.usingNormalMap, I.useNormalMap? 1 : 0);
		}
		
		// Set material uniforms 
		if(Loc.Ka != undefined) { gl.uniform3fv(Loc.Ka, flatten(Obj.material.Ka)); }
		if(Loc.Kd != undefined) { gl.uniform3fv(Loc.Kd, flatten(Obj.material.Kd)); }
		if(Loc.Ks != undefined) { gl.uniform3fv(Loc.Ks, flatten(Obj.material.Ks)); }
		if(Loc.shininess != undefined) { gl.uniform1f(Loc.shininess, Obj.material.shininess); }
	
		// Set modelling and normal transformation matrices
	    if(Loc.M != undefined) { gl.uniformMatrix4fv(Loc.M, gl.FALSE, flatten(modelMatrix));  }
	    if(Loc.N != undefined) { gl.uniformMatrix3fv(Loc.N, gl.FALSE, flatten(normalMatrix)); }

		// Draw
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
		gl.drawElements(gl.TRIANGLES, 3*Obj.triangles.length, gl.UNSIGNED_SHORT, 0);

		Loc.disableAttributes(); // disable attributes
	}


	
/*----- Helper functions defined below -----*/



	function setProgramInfo(program){

		var Loc = getLocations(Attributes, Uniforms, program); //from Utils.js

		var useNormals = (Loc.vNormal  != undefined);
		var useTans    = (Loc.vTangent != undefined);
		var useBitans  = (Loc.vBitangent != undefined);
		var texCoordsRequired  = (Loc.vTexCoord != undefined);
		var diffuseMapRequired = (Loc.diffuseSampler != undefined);
		var normalMapRequired  = (Loc.normalSampler != undefined);

		// If necessary, compute normals, create a buffer and send data
		if(useNormals && !normalsPresent) {
			computeNormals(); 
			normalsPresent = true;
			nBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, flatten(Obj.normals), gl.STATIC_DRAW);
		}

		// If necessary, compute tangents and bitangents, create buffers and send data
		if((useTans && !tansPresent) || (useBitans && !bitansPresent)) {
			computeTangentsAndBitangents(); 
			tansPresent = bitansPresent = true;

			tanBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, tanBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, flatten(Obj.tangents), gl.STATIC_DRAW);

			bitanBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, bitanBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, flatten(Obj.bitangents), gl.STATIC_DRAW); 
		}
			
		if(texCoordsRequired && !texCoordsPresent){
			console.error("Texture coordinates absent but required in the shaders.");
		}
			
		if(diffuseMapRequired && !diffuseMapPresent){
			console.error("Diffuse map absent but required in the shaders.");
		}
		
		if(normalMapRequired && !normalMapPresent){
			console.error("Normal map absent but required in the shaders.");
		}

		if(program.id == undefined){
			program.id = Math.random(); // assign a random id
		}

		return programInfo[program.id] = { // Info object 
			Locations: 		Loc,
			useNormals:   	useNormals,
			useTans: 	  	useTans,
			useBitans:    	useBitans,
			useTexCoords:	texCoordsRequired && texCoordsPresent,
			useNormalMap:	normalMapRequired  && normalMapPresent,
			useDiffuseMap:	diffuseMapRequired && diffuseMapPresent
		};
	
	}
	


	function sendBufferData(){
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(Obj.positions), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(flatten(Obj.triangles)),gl.STATIC_DRAW);

		if(normalsPresent){
			gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, flatten(Obj.normals), gl.STATIC_DRAW);
		}
				
		if(texCoordsPresent){
			gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, flatten(Obj.texCoords), gl.STATIC_DRAW);
		}

		if(tansPresent){
			gl.bindBuffer(gl.ARRAY_BUFFER, tanBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, flatten(Obj.tangents), gl.STATIC_DRAW);
		}

		if(bitansPresent){
			gl.bindBuffer(gl.ARRAY_BUFFER, bitanBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, flatten(Obj.bitangents), gl.STATIC_DRAW); 		
		}
	}



	function createTriangles(){
		// create triangles array if not present 
		// Obj.triangles = [[0,1,2], [3,4,5], ...] 
		Obj.triangles = [];
		for(var i = 0; i<Obj.positions.length/3; ++i){
			Obj.triangles[i] = [3*i, 3*i+1, 3*i+2];
		}
	}



	function createTextures(){
		// Obj.diffuseMap and Obj.normalMap are assumed to be either image locations
		// from which we create texture objects or already created texture objects.

		if(diffuseMapPresent){ 
			let type = typeof Obj.diffuseMap;
			if(type == "string"){ // image src
				diffuseMapTexture = newTexture(Obj.diffuseMap); // defined in Texture.js
			}
			else if(type == "object"){ // texture object
				diffuseMapTexture = Obj.diffuseMap;
			}
			else{
				diffuseMapPresent = false;
			}
		}

		if(normalMapPresent){ 
			let type = typeof Obj.normalMap;
			if(type == "string"){ // image src
				normalMapTexture = newTexture(Obj.normalMap); // defined in Texture.js
			}
			else if(type == "object"){ // texture object
				normalMapTexture = Obj.normalMap;
			}
			else{
				normalMapPresent = false;
			}
		}
	}



	function computeNormals(){
		// Go over each triangle and compute the normals.
		// The normal at a vertex is the weighted sum of the 
		// normals of adjacent triangles. The weight of a 
		// triangle is proportional to its area. 

		Obj.normals = [];
		var pos = Obj.positions;
		var nor = Obj.normals;
		var tri = Obj.triangles;
		var i, j;
		for(i = 0; i < pos.length; ++i){
			nor[i] = vec3(0, 0, 0);
		}
		for(i = 0; i < tri.length; ++i ){
			var t = tri[i];
			var v = [];
			for(j =0; j<3; ++j){
				v[j] = vec3(pos[t[j]]);
			}
			var v01 = subtract(v[1],v[0]);
			var v12 = subtract(v[2],v[1]);
			var n = cross(v01, v12); 
			// Note: we don't normalize n. The length of n is
			// proportional to the area of the triangle t.
			
			for(j =0; j<3; ++j){
				nor[t[j]] = add(nor[t[j]], n);
			}
		}
		for(i = 0; i < pos.length; ++i){
			nor[i] = normalize(nor[i]); 
		}
	}

	function computeTangentsAndBitangents(){
		//compute tangent and bitangent for each vertex
		var tri = Obj.triangles;
		var pos = Obj.positions;
		var tex = Obj.texCoords;
		var T, B, E1, E2, DU1, DV1, DU2, DV2;
		var a, b, c;
		var i,j;

		Obj.tangents = [];
		Obj.bitangents = [];
		for(i = 0; i < pos.length; ++i){
			Obj.tangents[i] = vec3(0,0,0);
			Obj.bitangents[i] = vec3(0,0,0);
		}

		for(i = 0; i < tri.length; ++i){
			[a,b,c] = tri[i];
			
			//Note: we are following the notation in slides. 
			E1 = subtract(vec3(pos[b]), vec3(pos[a]));
			E2 = subtract(vec3(pos[c]), vec3(pos[b]));
			DU1 = tex[b][0] - tex[a][0];
			DV1 = tex[b][1] - tex[a][1];
			DU2 = tex[c][0] - tex[b][0];
			DV2 = tex[c][1] - tex[b][1];
			
			T = vec3(); B = vec3(); 
			for(j=0; j<3; ++j){
				T[j] = DV2*E1[j] - DV1*E2[j];
				B[j] = -DU2*E1[j] + DU1*E2[j];
			}
			// (DU1*DV2 - DU2*DV1) is the area of the triangle in texture coordinates
			// So, the area of the triangle is (DU1*DV2 - DU2*DV1)*length(T)*length(B).
			// Since we didn't divide by (DU1*DV2 - DU2*DV1) and we didn't normalize T
			// and B, we just need scale T by length(B) and B by length of T to make 
			// both proportional to the area of the triangle.

			T = scale(length(B), T); B = scale(length(T), B);

			// Add T and B to tangent and bitangent resp. at all three vertices
			Obj.tangents[a] = add(Obj.tangents[a], T);
			Obj.tangents[b] = add(Obj.tangents[a], T);
			Obj.tangents[c] = add(Obj.tangents[a], T);
			Obj.bitangents[a] = add(Obj.bitangents[a], B);
			Obj.bitangents[b] = add(Obj.bitangents[b], B);
			Obj.bitangents[c] = add(Obj.bitangents[c], B);
		}

		for(i = 0; i < pos.length; ++i){ // Normalize all tangents and bitangents
			Obj.tangents[i] = normalize(Obj.tangents[i]);
			Obj.bitangents[i] = normalize(Obj.bitangents[i]);
		}
	}
	
}



