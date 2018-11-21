var nx = 512; 			// width of image in pixels
var ny = 512; 			// height of image in pixels
var trace_depth = 2;	// number of bounces of a ray
var counter = 0;
var Objects = [
	{ type: "sphere", c: vec3(-0.6,0.6,1.5), r: 0.2, material_id: 0},
	{ type: "sphere", c: vec3(0,0,0), r: 1, material_id: 1},
	{ type: "sphere", c: vec3(-1,-0.3,1.5), r:0.3, material_id: 2},
	{ type: "sphere", c: vec3(0.5,0,1.5), r:0.1, material_id: 3},
	{ type: "cube", c: vec3(0.5,0.5,1.5), r:0.1, material_id: 4},
	{ type: "cylinder", c: vec3(0.8,-0.5, 1.5), r:0.1, h: 0.2, material_id: 5}
];

var Lights = [
	{ position: vec3(0,10,0), color: vec3(1,1,1), intensity: 0.6},
	{ position: vec3(0,0,10), color: vec3(1,1,1), intensity: 0.5}
];

var ambient_light = vec3(0.1,0.1,0.1);
var background_color = vec3(0,0,0);

var Materials = [
	{color: vec3(1,0,1), reflectivity: 0.2, shininess: 100},
	{color: vec3(0.8,0.8,0.8), reflectivity: 0.8, shininess: 2400},
	{color: vec3(0.1,0.7,0.2), reflectivity: 0.1, shininess: 150},
	{color: vec3(0.6,0.1,0.1), reflectivity: 0.1, shininess: 50},
	{color: vec3(0.1,0.7,0.2), reflectivity: 0.1, shininess: 150},
	{color: vec3(1.0,0,1.0), reflectivity: 0.8, shininess: 500}
];


var Camera = {
	location: vec3 (0,0,3.6),
	up: vec3(0,1, 0),
	lookat: vec3(0,0,0),
	fov: 60, 		// field of view : in degrees
};

window.onload = function init() {
			var i,j;
			var color;
			var canvas = document.getElementById("gl-canvas");
			var ctx = canvas.getContext("2d");
			
			var imgData = ctx.createImageData(nx, ny);
			var data = imgData.data;
		
			for(i=0; i<nx; ++i){
				for(j=0; j<ny; ++j){
					index = 4*(j*nx + i);
					color = trace(pixelRay(i,j), trace_depth);
					data[index] = Math.floor(color[0]*255);
					data[index+1] = Math.floor(color[1]*255);
					data[index+2] = Math.floor(color[2]*255);
					data[index+3] = 255; 	//opaque
				}
			}

			ctx.putImageData(imgData, 0,0);
}


function trace(ray, depth){
	var normal, material, viewDir, reflected_dir, reflected_ray, reflected_col;

	var color = background_color; 
	var h = hit(ray);
	
	if (h.obj === null){
		return color;
	}

	normal = computeNormal(h.obj, h.point); 
	material = Materials[h.obj.material_id];
	var original_material = material;
	viewDir = scale(-1, ray.d);
	color = shade(h.point, normal, viewDir, material);

	while (depth > 0){
		reflected_dir = add(ray.d, scale(-2*dot(ray.d, normal),normal)); 
		ray = {e:h.point, d:reflected_dir};
		h = hit(ray);
		if (h.obj !== null){
			normal = computeNormal(h.obj, h.point); 
			material = Materials[h.obj.material_id];
			viewDir = scale(-1, ray.d);
			reflected_col = shade(h.point, normal, viewDir, material);
		} else {
			reflected_col = background_color;
			color = add(color, scale(material.reflectivity, reflected_col));
			return color;
		}
	    color = add(color, scale(original_material.reflectivity, reflected_col));
	    depth--;
	}
	
	return color;

// 	var color = background_color; 
// 	var h = hit(ray);

// 	if(h.obj!==null){
// 		var normal = computeNormal(h.obj, h.point); 
// 		var material = Materials[h.obj.material_id];
// 		var viewDir = scale(-1, ray.d);
// 		color = shade(h.point, normal, viewDir, material);

// 		if(depth === 0) return color;
	
// 		var reflected_dir = add(ray.d, scale(-2*dot(ray.d, normal),normal)); 
// 		var reflected_ray = {e:h.point, d:reflected_dir};
// 		var reflected_col = trace( reflected_ray, depth-1);
// 	    color = add(color, scale(material.reflectivity, reflected_col));
// 	}
	
// 	return color;
}

function shade(position, normal, viewDir, material){
	var i,l, shadowRay;
	var diffuseIntensity, specularIntensity, toLight, lightDir;
	var halfvector;
	var shininess = material.shininess;
	var color = material.color;

	var final_color = vec3(0,0,0);
	var diffuse = ambient_light;
	var specular = vec3(0,0,0);
	
	for(i = 0; i< Lights.length; ++i){
		l = Lights[i];
		toLight = subtract(l.position, position);
		lightDir = normalize(toLight);

		shadowRay = {e:position, d: lightDir}; 
		if(hit(shadowRay).t > length(toLight)){ 
			diffuseIntensity = l.intensity * Math.max(dot(lightDir, normal),0);
			diffuse = add(diffuse, scale(diffuseIntensity, l.color)); 
			halfvector = normalize(add(viewDir, lightDir));
			specularIntensity = Math.pow(Math.max(dot(halfvector, normal), 0), shininess);
			specular = add(specular, scale(specularIntensity, l.color));
		}
	}

	final_color = add(final_color, mult(diffuse, color));
	final_color = add(final_color, specular);

	return final_color;
}

function hit(ray){
	var i, x;
	var obj = null, t = Infinity, loc;
	for(i = 0; i< Objects.length; ++i){
		x = intersect(ray, Objects[i]);
		if(x>=0 && x < t){
			obj = Objects[i];
			t = x;
		}
	}
	if(t < Infinity){
		loc = add(ray.e, scale(t, ray.d));
	}

	return {obj: obj, point: loc, t:t};
}

function pixelRay(i,j){
	// return the ray from camera through (i,j)^th pixel
	// i,j increase to right and down as in a picture 

	j = ny - j; // invert j

	var n = 1; 				// distance to near plane i.e., projection plane
	var aspect = ny/nx; 	// aspect = height/width
	var fov_radians = Camera.fov*Math.PI/180;
	var t = n*Math.tan(fov_radians/2);
	var r = t*aspect;
	var b = -t, l = -r;

	// compute camera basis 
	var w = normalize(subtract(Camera.location, Camera.lookat));
	var u = normalize(cross(Camera.up,w));
	var v = cross(w,u);

	var ucomp = l + (r-l)*(i+0.5)/nx;
	var vcomp = b + (t-b)*(j+0.5)/ny;
	var wcomp = -n;

	var raydir = scale(ucomp, u);
	raydir = add(raydir, scale(vcomp, v));
	raydir = add(raydir, scale(wcomp, w));;

	return { e: Camera.location, d: normalize(raydir)}; 
}

function intersect(ray, obj){
	if(obj.type === "sphere"){
		var t, t1, t2;
		var x = subtract(ray.e,obj.c);
		// x is a vector between origin of ray and center of sphere
		var A = dot(ray.d, ray.d);
		// A is a magnitude^2 of ray
		var B = 2*dot(x, ray.d);
		// B
		var C = dot(x,x) - obj.r*obj.r;
		var D = B*B - 4*A*C;
		t = Infinity;
		if(D >= 0){
			var S = Math.sqrt(D);
			t1 = (-B - S)/(2*A);
			t2 = (-B + S)/(2*A);
			if(t1 >= 0){
				t = t1;
			}
			if(/*t2 >= 0 &&*/ t2<t1 ){
				t = t2;
			}
		}
		return t;
	}
	else if (obj.type === "cube"){
		// TODO
		// obj = { type: "cube", c: vec3(0.5,1.5,1.5), r:0.1, material_id: 4},
		// t = dot((po-lo),n)/dot(l, n)

		// https://www.scratchapixel.com/lessons/3d-basic-rendering/minimal-ray-tracer-rendering-simple-shapes/ray-plane-and-ray-disk-intersection
		var x = obj.c[0];
		var y = obj.c[1];
		var z = obj.c[2];
		var r = obj.r;
		
		var right = vec3(x+r, y, z); 
		var left = vec3(x-r, y, z); 
		var top = vec3(x, y+r, z); 
		var bottom = vec3(x, y-r, z); 
		var front = vec3(x, y, z+r); 
		var back = vec3(x, y, z-r);
		
		var points = [right, left, top, bottom, front, back];

		var rightn = subtract(right, obj.c);
		var leftn = subtract(left, obj.c);
		var topn = subtract(top, obj.c);
		var bottomn = subtract(bottom, obj.c);
		var frontn = subtract(front, obj.c);
		var backn = subtract(back, obj.c);

		var normals = [rightn, leftn, topn, bottomn, frontn, backn];

		var t = Infinity;
		for (var i=0; i<points.length; i++){
			var numerator = dot(subtract(points[i], ray.e), normals[i]);
			var denominator = dot(ray.d, normals[i]);
			var tempT = numerator/denominator;
			//tempT = Math.abs(tempT);
			var p = add(ray.e, scale(tempT, ray.d));
			var isValid = true;
			// check x
			if (p[0] > x+r || p[0] < x-r ){
				isValid = false;
			}
			// check y
			if (p[1] > y+r || p[1] < y-r ){
				isValid = false;
			}
			// check z
			if (p[2] > z+r || p[2] < z-r ){
				isValid = false;
			}
			if (isValid){
				if (tempT < 0){
					//console.log(tempT);
				}
				if (tempT < t && tempT > 0){
					t = tempT;
				}	
			}
		}
		return t;
	} 
	else if (obj.type === "cylinder"){
		// TODO
		// obj = { type: "cylinder", c: vec3(1.5,0,1.5), r:0.1, height: 0.5, material_id: 5}

		var x = obj.c[0];
		var y = obj.c[1];
		var z = obj.c[2];

		var top = vec3(x, y+obj.height/2, z);
		var bottom = vec3(x, y-obj.height/2, z);
		
		var topn = subtract(top, obj.c);
		var bottomn = subtract(bottom, obj.c);
		
		var points = [top, bottom];
		var normals = [topn, bottomn];

		var t = Infinity;
		var tempT = Infinity;
		// top & bottom
		for (var i=0; i<points.length; i++){
			var numerator = dot(subtract(points[i], ray.e), normals[i]);
			var denominator = dot(ray.d, normals[i]);
			var tempT = numerator/denominator;
			tempT = Math.abs(tempT);
			var p = add(ray.e, scale(tempT, ray.d));
			// if the distance between point and p is less than radius, update t
			var dist = length(subtract(p, points[i]));
			if (dist < r){
				if (tempT < t && tempT > 0){
					t = tempT;
				}	
			}
		}
		// side

		// https://www.cl.cam.ac.uk/teaching/1999/AGraphHCI/SMAG/node2.html#SECTION00023200000000000000

		var a = ray.d[0]*ray.d[0]+ray.d[2]*ray.d[2];
		var b = 2*(ray.e[0]-x)*ray.d[0]+2*(ray.e[2]-z)*ray.d[2];
		var c = (ray.e[0]-x)*(ray.e[0]-x)+(ray.e[2]-z)*(ray.e[2]-z)-obj.r*obj.r;
		
		tempT = (-b+Math.sqrt(b*b-4*a*c))/2*a;
		var py = ray.e[1] + ray.d[1]*tempT;
		if (tempT === tempT){
			if (tempT < t && py > y-obj.h/2 && py < y+obj.h/2){
				t = tempT;
			}
		}

		tempT = (-b-Math.sqrt(b*b-4*a*c))/2*a;
		if (tempT === tempT){
			py = ray.e[1] + ray.d[1]*tempT;
			if (tempT < t && py > y-obj.h/2 && py < y+obj.h/2){
				t = tempT;
			}		
		}
		return t;
	} 
}

function computeNormal(obj, point){
	if(obj.type === "sphere"){
		return normalize(subtract(point, obj.c));
	}
	else if (obj.type === "cube"){
		// TODO
		// obj = { type: "cube", c: vec3(0.5,1.5,1.5), r:0.1, material_id: 4},

		var x = obj.c[0];
		var y = obj.c[1];
		var z = obj.c[2];
		var r = obj.r;

		if (x+r == point[0]){
			// right 
			return vec3(1, 0, 0);
		} else if (x-r == point[0]){
			// left
			return vec3(-1, 0, 0);
		} else if (y+r == point[1]){
			// top
			return vec3(0, 1, 0);
		} else if (y-r == point[1]){
			// bottom
			return vec3(0, -1, 0);
		} else if (z+r == point[2]){
			// front
			return vec3(0, 0, 1);
		} else {
			// back
			return vec3(0, 0, -1);
		} 
	}
	else if (obj.type === "cylinder"){
		// TODO
		// obj = { type: "cylinder", c: vec3(1.5,0,1.5), r:0.1, height: 0.5, material_id: 5}
		var x = obj.c[0];
		var y = obj.c[1];
		var z = point[2];
		// top
		if (y == obj.c[1]+obj.height/2){
			return vec3(0, 1, 0);
		}
		// bottom
		else if (y == obj.c[1]+obj.height/2){
			return vec3(0, -1, 0);
		}
		// side
		return normalize(vec3(point[0]-x, 0, point[2]-z));
	}
}


