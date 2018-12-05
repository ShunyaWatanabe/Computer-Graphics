var nx = 512; 			// width of image in pixels
var ny = 512; 			// height of image in pixels
var trace_depth = 2;	// number of bounces of a ray

var Objects = [
	{ type: "sphere", c: vec3(-0.6,0.6,1.5), r: 0.2, material_id: 0},
	{ type: "sphere", c: vec3(0,0,0), r: 1, material_id: 1},
	{ type: "sphere", c: vec3(-1,-0.3,1.5), r:0.3, material_id: 2},
	{ type: "sphere", c: vec3(0.5,0,1.5), r:0.1, material_id: 3}
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
	{color: vec3(0.6,0.1,0.1), reflectivity: 0.1, shininess: 50}
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

	var color = background_color; 
	var h = hit(ray);

	if(h.obj!==null){
		var normal = computeNormal(h.obj, h.point); 
		var material = Materials[h.obj.material_id];
		var viewDir = scale(-1, ray.d);
		color = shade(h.point, normal, viewDir, material);

		if(depth === 0) return color;
	
		var reflected_dir = add(ray.d, scale(-2*dot(ray.d, normal),normal)); 
		var reflected_ray = {e:h.point, d:reflected_dir};
		var reflected_col = trace( reflected_ray, depth-1);
	    color = add(color, scale(material.reflectivity, reflected_col));
	}
	
	return color;
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
		var A = dot(ray.d, ray.d);
		var B = 2*dot(x, ray.d);
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
			if(t2 >= 0 && t2<t1 ){
				t = t2;
			}
		}
		return t;
	}
}

function computeNormal(obj, point){
	if(obj.type === "sphere"){
		return normalize(subtract(point, obj.c));
	}
}



