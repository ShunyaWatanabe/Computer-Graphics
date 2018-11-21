// works on firefox, doesn't work on google chrome
// WebGL setup from here https://github.com/brstf/webgl-tutorial

var gl;
var gl_program;
var gl_program_loc = {};
var vbo;
var indices;
var mvmat;
var nmat;
var yrot = 0;
var imageLoads = [];
var textures = [];
var drawState = 0;

function update( time ) {
    // Setup another request
    requestId = requestAnimFrame( update );
    draw();
}

function textureFinishedLoading( image, texture ) {
    gl.bindTexture( gl.TEXTURE_2D, texture );

    // Flip the image over it's horizontal axis to be 
    // consistent with WebGL [OpenGL] coordinate systems
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    
    // Load in the image data into the texture
    //  Type of texture - TEXTURE_2D
    //  Level of detail level - 0 (this will be covered later)
    //  Internal format of texture - RGBA
    //  Format of Texel data - RGBA (must match internal format)
    //  Type of data - UNSIGNED_BYTE (0-255)
    //  Data - the image we loaded in
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image );
    
    // Set the min and mag filter to nearest
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
    
    // Set the wrap in both directions to repeat
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT );
    
    // Unbind textures
    gl.bindTexture( gl.TEXTURE_2D, null );
}

function loadImageForTexture( src, texture ) {
    var image = new Image();
    image.onload = function() {
        imageLoads.splice( imageLoads.indexOf( image ), 1 );
        textureFinishedLoading( image, texture );
    }
    imageLoads.push( image );
    image.src = src;
}

function loadTextures() {
    // Create a texture object for the stone texture
    textures.push( gl.createTexture() );
    loadImageForTexture("textures/wood-diffuse.jpg", textures[0]);
    textures.push( gl.createTexture() );
    loadImageForTexture("textures/wood-normal.jpg", textures[1]);
}

/**
 * Initializes all variables, shaders, and WebGL options 
 * needed for this program.
 */ 
function init() {
    // Set the clear color to fully transparent black
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    
    // Create the two buffer objects
    vbo = gl.createBuffer();
    indices = gl.createBuffer();
    
    // Create the matrices
    mvmat = mat4.create();
    nmat = mat3.create();
    
    // Load the texture(s)
    loadTextures();
    
    
    // Bind the vertex buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.depthRange( 10.0, 10.0 );
    
    var vertices = new Float32Array([ -1.0, -1.0,  1.0, 0.0, 0.0, 
                                       1.0, -1.0,  1.0, 1.0, 0.0, 
                                      -1.0,  1.0,  1.0, 0.0, 1.0,
                                       1.0,  1.0,  1.0, 1.0, 1.0,
                                   ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    // Bind and set the data of the lineIndices buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([ 0, 1, 2, 3, 3, 3]), gl.STATIC_DRAW);
    
    
    // Initialize the shaders
    initShaders();
}

/**
 * Loads and compiles a given shader as the given type.
 * @param type WebGL shader type to load (gl.VERTEX_SHADER | gl.FRAGMENT_SHADER)
 * @param shaderSrc String source of the shader to load
 * @return Fully compiled shader, or null on error
 */
function loadShader(type, shaderSrc) {
    var shader = gl.createShader(type);
    
    // Load the shader source
    gl.shaderSource(shader, shaderSrc);
    
    // Compile the shader
    gl.compileShader(shader);
    
    // Check the compile status
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) &&
        !gl.isContextLost()) {
        var infoLog = gl.getShaderInfoLog(shader);
        window.console.log("Error compiling shader:\n" + infoLog);
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

/**
 * Initializes the shaders used for the program
 */
function initShaders() {
    // Load the shaders and compile them (shaders are located in the HTML)
    var vertexShader   = loadShader(   gl.VERTEX_SHADER, document.getElementById('vshader').innerHTML );
    var fragmentShader = loadShader( gl.FRAGMENT_SHADER, document.getElementById('fshader').innerHTML );
    
    // Create the program object
    var programObject = gl.createProgram();
    gl.attachShader(programObject, vertexShader);
    gl.attachShader(programObject, fragmentShader);
    gl_program = programObject;
    
    // link the program
    gl.linkProgram(gl_program);
    
    // verify link
    var linked = gl.getProgramParameter(gl_program, gl.LINK_STATUS);
    if( !linked && !gl.isContextLost()) {
        var infoLog = gl.getProgramInfoLog(gl_program);
        window.console.log("Error linking program:\n" + infoLog);
        gl.deleteProgram(gl_program);
        return;
    }
    
    // Get the uniform/attribute locations
    gl_program_loc.vPosition = gl.getAttribLocation(gl_program, "vPosition");
    gl_program_loc.aTexCoord = gl.getAttribLocation(gl_program, "aTexCoord");
    gl_program_loc.uMVmat = gl.getUniformLocation(gl_program, "uMVmat");
    gl_program_loc.uNmat  = gl.getUniformLocation(gl_program, "uNmat"); 
    gl_program_loc.uSampler = gl.getUniformLocation(gl_program, "uSampler");
    gl_program_loc.uNormalMap = gl.getUniformLocation(gl_program, "uNormalMap");
    gl_program_loc.uDrawState = gl.getUniformLocation(gl_program, "uDrawState");
}

/**
 * Display function, sets up various matrices, binds data to the GPU,
 * and displays it.
 */
function draw() {
    // Clear the color buffer
    gl.clear( gl.COLOR_BUFFER_BIT );
    
    // Set mvmat to the proper rotation
    mat4.identity( mvmat );
    mat4.rotateY( mvmat, yrot, mvmat );

    mat4.toInverseMat3( mvmat, nmat );
    mat3.transpose( nmat );
    
    // Use the created shader program
    gl.useProgram(gl_program);
    
    // Set texture0 to have the stone texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[0]);
    
    // Set uSampler to have the value 0, so it uses TEXTURE0
    gl.uniform1i(gl_program_loc.uSampler, 0);
    
    // Send color uniform to the shader:
    gl.uniformMatrix4fv( gl_program_loc.uMVmat, false, mvmat );
    gl.uniformMatrix3fv( gl_program_loc.uNmat,  false, nmat );
    
    // Set texture1 to have the normal map
    gl.activeTexture(gl.TEXTURE1);;
    gl.bindTexture(gl.TEXTURE_2D, textures[1]);
    
    // Set uNormalMap to have the value 1, so it uses TEXTURE1
    gl.uniform1i(gl_program_loc.uNormalMap, 1);
    
    // Send the drawstate to the shader
    gl.uniform1i(gl_program_loc.uDrawState, drawState);

    // Bind vbo to be the current array buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        
    // Enables a vertex attribute array for vertex positions
    gl.enableVertexAttribArray(gl_program_loc.vPosition);
    gl.enableVertexAttribArray(gl_program_loc.aTexCoord);
    
    // Setup the pointer to the position data
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    gl.vertexAttribPointer(gl_program_loc.vPosition, 3, gl.FLOAT, false, 20,  0);
    gl.vertexAttribPointer(gl_program_loc.aTexCoord, 2, gl.FLOAT, false, 20, 12);
    gl.drawElements(gl.TRIANGLE_STRIP, 6, gl.UNSIGNED_SHORT, 0);
}

/**
 * Entry point of the application.
 */
function main() {
    // Set up WebGL
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL( canvas );
    if(!gl){alert("WebGL setup failed!");}
    
    canvas
    // Initialize all variables and display the scene
    init();

    // Draw the scene
    requestId = requestAnimFrame( update );
} 
