function newTexture(src, width, height){
	/* src is the link to an image; 
	   null is used if src falsy */
	
	// create a texture with default settings
	var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	
	if(src){
		texture.image = new Image();
		texture.image.onload = function(){
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
			gl.generateMipmap(gl.TEXTURE_2D);
		}; 
		texture.image.src = src;
		console.log(texture.image.src);
	}
	else{
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texImage2D(gl.TEXTURE_2D, 0,  gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	}
	
	gl.bindTexture(gl.TEXTURE_2D, null); // unbind gl.TEXTURE_2D
	return texture;
}
