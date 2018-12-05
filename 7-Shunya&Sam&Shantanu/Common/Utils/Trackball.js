function Trackball(){ 

	if(!canvas){ canvas = document.getElementById( "gl-canvas" ); }
	
	var trackball = { /* object to be returned */
		getMatrix: function() { return tbMatrix; }	
	}; 

	var lastVector;
	var tracking = false;  /* whether we are tracking the mouse */
	var tbMatrix = mat4(); /* initialize virtual trackball matrix */

	function getMouseDirectionVector(event){
	  var r = 2.0;
	  var x = -1+2*event.offsetX/canvas.width;
	  var y = -1+2*(canvas.height- event.offsetY)/canvas.height;
	  var z = Math.sqrt(r*r-x*x-y*y);
	  return normalize(vec3(x,y,z));
	}

	//set event handlers
	canvas.addEventListener("mousedown", mousedown);
	canvas.addEventListener("mouseup", mouseup);
	canvas.addEventListener("mousemove", mousemove);
	canvas.addEventListener("wheel", wheel, {passive: true});
	
	function mousedown(event){
	  lastVector = getMouseDirectionVector(event);
	  tracking = true;
	}

	function mouseup(event){
		tracking = false;
	}

	function mousemove(event){ 
		if(tracking && event.buttons===1){
			var p1 = lastVector;
			var p2 = getMouseDirectionVector(event);
			lastVector = p2;
			var n = cross(p1,p2);
			if(length(n)!=0){
				var theta = 5*Math.asin(length(n))*180/Math.PI;
				tbMatrix = mult(rotate(theta, n), tbMatrix);
				// We are using the rotate function from MV.js which 
				// is correct. rotateX and rotateY have sign errors.
			}
		}
	}

	function wheel(event){
		var s=(1 - event.deltaY/500);
		tbMatrix = mult(scalem(s,s,s), tbMatrix);
	}
	
	return trackball;
}
