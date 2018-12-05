function objInit(Obj){
	
	var vBuffer, nBuffer, iBuffer;
	var tBuffer, tanBuffer, bitanBuffer;
	var modelMatrix = mat4();
	var normalMatrix = mat3();
	var diffuseMapTexture, normalMapTexture, heightMapTexture, specularMapTexture; 
	
	var trianglesPresent = (Obj.triangles !== undefined) && (Obj.triangles.length > 0);		
	var normalsPresent = (Obj.normals!==undefined) && (Obj.normals.length > 0);	
	var texCoordsPresent = (Obj.texCoords!==undefined) && (Obj.texCoords.length > 0);
	var usingDiffuseMap = texCoordsPresent && (Obj.diffuseMap!==undefined) && (Obj.diffuseMap!== "");
	var usingNormalMap = texCoordsPresent && (Obj.normalMap!==undefined) && (Obj.normalMap!== "");
	var usingHeightMap = texCoordsPresent && (Obj.heightMap!==undefined) && (Obj.heightMap!== "");
	var usingSpecularMap = texCoordsPresent && (Obj.specularMap!==undefined) && (Obj.specularMap!== "");

	/* get attribute and uniform locations */
	var Attributes = ["vPosition", "vNormal"];
	if(texCoordsPresent)  Attributes.push("vTexCoord");
	if(usingNormalMap) Attributes.push("vTangent", "vBitangent");

	var Uniforms = ["Ka", "Kd", "Ks", "shininess", "M", "N",
					"usingDiffuseMap", "usingNormalMap", "usingHeightMap", "usingSpecularMap"];

	if(usingDiffuseMap) Uniforms.push("diffuseMapSampler");
	if(usingNormalMap) Uniforms.push("normalMapSampler");
	if(usingHeightMap) Uniforms.push("heightMapSampler");
	if(usingSpecularMap) Uniforms.push("specularMapSampler");

	var Loc = getLocations(Attributes, Uniforms); /* defined in Utils.js */

	setupTextureMaps(); /* diffuse and normal maps */

	if(!trianglesPresent) createTriangles(); /* create triangles array if not present */
	
	if(!normalsPresent) computeNormals(); 	 /* compute normals if not provided */

	if(usingNormalMap) computeTangentsAndBitangents(); /* compute tangents and bitangents */

	setupBuffers();    /* buffers for positions, normals etc. */
	
	
/*----- Attach data and functions to Obj -----*/

	if(Obj.material === undefined){ /* default material */
		Obj.material = {	
			Ka: vec3(1.0, 1.0, 1.0),
			Kd: vec3(Math.random(), Math.random(), Math.random()),
			Ks: vec3(0.0, 0.0, 0.0),
			shininess: 500*Math.random() 
		};
	}
	 
	Obj.setModelMatrix = function(m){ 
		modelMatrix = m;
		normalMatrix = normalTransformationMatrix(m);
	}

	Obj.getModelMatrix = function(){ return modelMatrix; }
	Obj.getNormalTransformationMatrix = function (){return normalMatrix;}
	
	Obj.draw = function(){
		// enable attributes 
		Loc.enableAttributes();

		// set attribute pointers
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.vertexAttribPointer(Loc.vPosition, 3, gl.FLOAT, false, 0, 0);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
		gl.vertexAttribPointer(Loc.vNormal, 3, gl.FLOAT, false, 0, 0);

		if(texCoordsPresent){
			gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
			gl.vertexAttribPointer(Loc.vTexCoord, 2, gl.FLOAT, false, 0 ,0);
		}

		if(usingDiffuseMap){
			// we use texture unit 0 for diffuse map
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, diffuseMapTexture);
			gl.uniform1i(Loc.usingDiffuseMap, 1);
		}
		else{
			gl.uniform1i(Loc.usingDiffuseMap, 0);
		}

		if(usingNormalMap){
			gl.bindBuffer(gl.ARRAY_BUFFER, tanBuffer);
			gl.vertexAttribPointer(Loc.vTangent, 3, gl.FLOAT, false, 0, 0);

			gl.bindBuffer(gl.ARRAY_BUFFER, bitanBuffer);
			gl.vertexAttribPointer(Loc.vBitangent, 3, gl.FLOAT, false, 0, 0);

			// we use texture unit 1 for normal map
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, normalMapTexture);
			gl.uniform1i(Loc.usingNormalMap, 1);
		}
		else{
			gl.uniform1i(Loc.usingNormalMap, 0);
		}

		if(usingHeightMap){
			gl.activeTexture(gl.TEXTURE2);
			gl.bindTexture(gl.TEXTURE_2D, heightMapTexture);
			gl.uniform1i(Loc.usingHeightMap, 1);
		}
		else{
			gl.uniform1i(Loc.usingHeightMap, 0);
		}

		if(usingSpecularMap){
			gl.activeTexture(gl.TEXTURE3);
			gl.bindTexture(gl.TEXTURE_2D, specularMapTexture);
			gl.uniform1i(Loc.usingSpecularMap, 1);
		}
		else{
			gl.uniform1i(Loc.usingSpecularMap, 0);
		}
		
		//set material
		gl.uniform3fv(Loc.Ka, flatten(Obj.material.Ka));
		gl.uniform3fv(Loc.Kd, flatten(Obj.material.Kd));
		gl.uniform3fv(Loc.Ks, flatten(Obj.material.Ks));
		// gl.uniform1f(Loc.shininess, Obj.material.shininess);

		// set modelling and normal transformation matrices
    gl.uniformMatrix4fv(Loc.M, gl.FALSE, flatten(modelMatrix));
    gl.uniformMatrix3fv(Loc.N, gl.FALSE, flatten(normalMatrix));

		// Draw
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
		gl.drawElements(gl.TRIANGLES, 3*Obj.triangles.length, gl.UNSIGNED_SHORT, 0);

		Loc.disableAttributes(); // disable attributes
	}
	
/*----- Helper functions defined below -----*/
	
	function createTriangles(){ 
		/* Obj.triangles = [[0,1,2], [3,4,5], ...] */
		Obj.triangles = [];
		for(var i = 0; i<Obj.positions.length/3; ++i){
			Obj.triangles[i] = [3*i, 3*i+1, 3*i+2];
		}
	}
	
	function setupBuffers(){
		vBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(Obj.positions), gl.STATIC_DRAW);

		nBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(Obj.normals), gl.STATIC_DRAW);

		iBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(flatten(Obj.triangles)),gl.STATIC_DRAW);

		if(texCoordsPresent){
			tBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, flatten(Obj.texCoords), gl.STATIC_DRAW);
		}

		if(usingNormalMap){
			tanBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, tanBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, flatten(Obj.tangents), gl.STATIC_DRAW);

			bitanBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, bitanBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, flatten(Obj.bitangents), gl.STATIC_DRAW); 		
		}
	}

	function setupTextureMaps(){
		if(usingDiffuseMap){
			diffuseMapTexture = setupTexture(Obj.diffuseMap); 
			gl.uniform1i(Loc.diffuseMapSampler, 0);
		}

		if(usingNormalMap){
			normalMapTexture = setupTexture(Obj.normalMap);
			gl.uniform1i(Loc.normalMapSampler, 1);
		}

		if(usingHeightMap){
			heightMapTexture = setupTexture(Obj.heightMap);
			gl.uniform1i(Loc.heightMapSampler, 2);
		}

		if(usingSpecularMap){
			specularMapTexture = setupTexture(Obj.specularMap);
			gl.uniform1i(Loc.specularMapSampler, 3);
		}		
	}

	function setupTexture(src){
		var texture = gl.createTexture();
		
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([255, 0, 0, 255])); // single red pixel image
        gl.bindTexture(gl.TEXTURE_2D, null);

		texture.image = new Image();
		texture.image.onload = handler; 
		texture.image.src = src;

		function handler(){
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  		gl.generateMipmap(gl.TEXTURE_2D);
  		gl.bindTexture(gl.TEXTURE_2D, null);
		}
		return texture;
	}

	function computeNormals(){
		/* Go over each triangle and compute the normals.
		   The normal at a vertex is the weighted sum of the 
		   normals of adjacent triangles. The weight of a 
		   triangle is proportional to its area. */
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
			/* Note: we don't normalize n. Length of n is
			proportional to the area of the triangle t*/
			
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
		var a, b, c, t;
		var i,j;
		Obj.tangents = [];
		Obj.bitangents = [];
		for(i = 0; i < pos.length; ++i){
			Obj.tangents[i] = vec3(0,0,0);
			Obj.bitangents[i] = vec3(0,0,0);
		}

		for(i = 0; i < tri.length; ++i){
			t = tri[i];
			a = t[0], b = t[1], c = t[2];
			//following the notation in slides 
			E1 = subtract(vec3(pos[b]), vec3(pos[a]));
			E2 = subtract(vec3(pos[c]), vec3(pos[b]));
			DU1 = tex[b][0] - tex[a][0];
			DV1 = tex[b][1] - tex[a][1];
			// console.log(tex[a]);
			// console.log(tex[b]);
			// console.log(tex[c]);
			DU2 = tex[c][0] - tex[b][0];
			DV2 = tex[c][1] - tex[b][1];
			B = vec3();
			T = vec3();
			for(j=0; j<3; ++j){
				T[j] = DV2*E1[j] - DV1*E2[j];
				B[j] = -DU2*E1[j] + DU1*E2[j];
			}
			// (DU1*DV2 - DU2*DV1) is the area of the triangle in texture coordinates
			// So, the area of the triangle is (DU1*DV2 - DU2*DV1)*length(T)*length(B).
			// Since we didn't divide by (DU1*DV2 - DU2*DV1) and we didn't normalize T and B,
			// we just need scale T by length(B) and B by length of T to make both proportional
			// to the area of the triangle.

			var lt = length(T);
			var lb = length(B);
			T = scale(lb, T);
			B = scale(lt, B);

			// Add T and B to tangent and bitangent resp. at all three vertices
			Obj.tangents[a] = add(Obj.tangents[a], T);
			Obj.tangents[b] = add(Obj.tangents[a], T);
			Obj.tangents[c] = add(Obj.tangents[a], T);
			Obj.bitangents[a] = add(Obj.bitangents[a], B);
			Obj.bitangents[b] = add(Obj.bitangents[b], B);
			Obj.bitangents[c] = add(Obj.bitangents[c], B);
		}

		for(i = 0; i < pos.length; ++i){
			Obj.tangents[i] = normalize(Obj.tangents[i]);
			Obj.bitangents[i] = normalize(Obj.bitangents[i]);
		}

	}

}



