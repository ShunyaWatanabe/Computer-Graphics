function Camera(){

	var Mcam = mat4(); // camera matrix 
	var P = mat4();    // projection matrix
	
	var camFrame = { // camera frame
			e: vec3(0,0,0), // camera location
			u: vec3(1,0,0), // unit vector to "right"
			v: vec3(0,1,0), // unit vector in "up" direction
			w: vec3(0,0,1)  // unit vector opposite "gaze" direction
	};			
	
	addEventHandlers(); // add event handlers for moving the camera

	var Cam = { /* object to be returned */
		 	
		 	lookAt: function (eye, at, up) {
				// set camFrame and Mcam 

				var v = normalize(subtract(at, eye));
				var n = normalize(cross(up, v));
				var u = normalize(cross(v, n));

// 				camFrame.u = n;
// 				camFrame.v = u;
// 				camFrame.w = v;	

				v = negate(v);

				MCam = mat4(
					vec4(n, -dot(n, eye)),
					vec4(u, -dot(u, eye)),
					vec4(v, -dot(v, eye)),
					vec4()
				);
				
				camFrame.e = eye;
				camFrame.w = v;
				camFrame.u = n;
				camFrame.v = u;

		 	},

		 	setPerspective: function(fovy, aspect, near, far){
				// set the projection matrix P 

				// var n = -near;
				// var t = near*Math.tan(radians(fovy)/2);
				// var r = t*aspect;
				// var f = -far;
				// var b = -t;
				// var l = -r;

				// P = mat4(
				// 	vec4( t/aspect,  0,            0,           0),
				// 	vec4(        0,  t,            0,           0),
				// 	vec4(        0,  0, -(n+f)/(n-f), 2*f*n/(n-f)),
				// 	vec4(        0,  0,           -1,           0)
				// );
				var d = far - near;
				var t = near * Math.tan(radians(fovy/2));
				P = mat4(
					vec4(near/t/aspect,            0,            0, 0),
					vec4(            0,       near/t,            0, 0),
					vec4(            0, (near+far)/d, 2*near*far/d, 0),
					vec4(            0,            0,           -1, 0)
					);
			},

			setOrthographic: function (r,l,t,b,n,f){
				// set the projection matrix P 

				P = mat4(
					vec4(2/(r-l),       0,        0, -(r+l)/(r-l)),
					vec4(      0, 2/(t-b),        0, -(t+b)/(t-b)),
					vec4(      0,       0,  2/(n-f), -(n+f)/(n-f)),
					vec4(      0,       0,        0,            1)
				);
			},
			
			getCameraTransformationMatrix: function(){
				return Mcam;
			},
			
			getProjectionMatrix: function(){
				return P;
			},

			getMatrix: function(){
				// combines camera transformation and projection
				return mult(P,Mcam);
			},
			
			getFrame: function (){
				// returns camera frame (e, u, v, w)
				return camFrame;
			}
	};

	/* Helper functions */
	
	function addEventHandlers(){
		document.addEventListener("keydown", function(event) {

			console.log(event);

			var num = 0.03;

			// left 
			if (event.which == "37"){
				console.log("here");
				if (event.ctrlKey == true){
					// 
					Mcam = mult(rotate(5, vec3(0, 1, 0), Mcam));
				} else {
					camFrame.e[0] += num;
					camFrame.w[0] += num;
					Cam.lookAt(camFrame.e, camFrame.w, camFrame.v);
				}
			}

			//  up
			if (event.which == "38"){
				camFrame.e[1] += num;
				camFrame.w[1] += num;
				Cam.lookAt(camFrame.e, camFrame.w,camFrame.v);
			}

			// right
			if (event.which == "39"){
				if (event.ctrlKey == true){
					Mcam = mult(rotate(-5, vec3(0, 1, 0), Mcam));
				} else {
					camFrame.e[0] -= num;
					camFrame.w[0] -= num;
					Cam.lookAt(camFrame.e, camFrame.w,camFrame.v);
				}
				
			}

			// down
			if (event.which == "40"){
				camFrame.e[1] -= num;
				camFrame.w[1] -= num;
				Cam.lookAt(camFrame.e, camFrame.w,camFrame.v);
			}

			// "a" -> zoom in
			if (event.which == "65"){
				camFrame.e[2] -= num;
				Cam.lookAt(camFrame.e, camFrame.w,camFrame.v);

			}

			// "z" -> zoom out
			if (event.which == "90"){
				camFrame.e[2] += num;
				Cam.lookAt(camFrame.e, camFrame.w,camFrame.v);
			}


		});
		// ...
	}
	
	// ... 
	
	return Cam;
}
