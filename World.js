// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    v_Normal = a_Normal;
  }
`;

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform int u_whichTexture;
  void main() {

  if (u_whichTexture == -3) { // Use normal vector as color
    gl_FragColor = vec4((v_Normal + 1.0) / 2.0, 1.0); // Map normal from [-1,1] to [0,1]
 
  } else if(u_whichTexture == -2) { //Use color
    gl_FragColor = u_FragColor;

  } else if(u_whichTexture == -1) {
    gl_FragColor = vec4(v_UV, 1.0, 1.0); //Use UV color

  } else if(u_whichTexture == 0) {
    gl_FragColor = texture2D(u_Sampler0, v_UV); //Use texture0

  } else if(u_whichTexture == 1) {
    gl_FragColor = texture2D(u_Sampler1, v_UV); //Use texture1
  } 
    else {
    gl_FragColor = vec4(1.0, 0.2, 0.2, 1.0); //Error color
  }

  }
`;

// global variables: user interface elements or data passed from JavaScript to GLSL shaders
let canvas;
let gl;
let a_Position
let u_FragColor;
let a_UV;
let a_Normal;
let u_whichTexture;
let u_Size;
let u_ModelMatrix;
let u_ProjectionMatrix;
let u_ViewMatrix;
let u_GlobalRotateMatrix;
let u_Sampler0;
let u_Sampler1;

function setupWebGL() {
  canvas = document.getElementById('webgl'); //do not use var, that makes a new local variable instead of using the current global one 

  // Get the rendering context for WebGL
  //gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl",{ preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  gl.enable(gl.DEPTH_TEST);

}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }
  
  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  if (a_UV < 0){
    console.log('Failed to get the storage location of a_UV');
    return;
  }

  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal < 0){
    console.log('Failed to get the storage location of a_Normal');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
   console.log('Failed to get the storage location of u_ModelMatrix');
   return;
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if(!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }

  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if (!u_ViewMatrix){
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  if(!u_ProjectionMatrix) {
    console.log('Failed to get the storage location of u_ProjectionMatrix');
    return;
  }

  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  if(!u_whichTexture) {
    console.log('Failed to get the storage location of u_whichTexture');
    return;
  }

  // Get the storage location of u_Sampler
  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  if (!u_Sampler0) {
    console.log('Failed to get the storage location of u_Sampler0');
    return false;
  }

  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  if (!u_Sampler1) {
    console.log('Failed to get the storage location of u_Sampler1');
    return false;
  }

}

//Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

// Global variables related to UI elements
let g_selectedColor=[1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 5;
let g_selectedType = POINT;
let g_globalAngle = 0;
let g_camera;
let g_yellowAngle = 0;
let g_magentaAngle = 0;
let g_isDragging = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;
let g_flyMode = false;
let g_normalOn = false;



function addActionsForHtmlUI(){
  //angle slider events
  document.getElementById('angleSlide').addEventListener('mousemove', function() {g_globalAngle=this.value; renderAllShapes();});
  document.getElementById('magentaSlide').addEventListener('mousemove', function() { g_magentaAngle = this.value; renderAllShapes();});
  document.getElementById('yellowSlide').addEventListener('mousemove', function() { g_yellowAngle = this.value; renderAllShapes();});

  document.getElementById('normalOn').onclick = function(){g_normalOn = true; renderAllShapes();};
  document.getElementById('normalOff').onclick = function(){g_normalOn = false; renderAllShapes();};
}

function tick() {
  renderAllShapes();
  requestAnimationFrame(tick);
}


function handleMouseDown(ev) {
  g_isDragging = true;
  g_lastMouseX = ev.clientX;
  g_lastMouseY = ev.clientY;
}

function handleMouseMove(ev) {
  if(!g_isDragging) return;
  var deltaX = ev.clientX - g_lastMouseX;
  var deltaY = ev.clientY - g_lastMouseY;
  g_lastMouseX = ev.clientX;
  g_lastMouseY = ev.clientY;
  var sensitivity = 0.2;
  if(deltaX !== 0) {
    var angle = -deltaX * sensitivity;
    rotateCameraHorizontal(angle);
  }
  if(deltaY !== 0) {
    var angleY = -deltaY * sensitivity;
    rotateCameraVertical(angleY);
  }
  renderAllShapes();
}

function rotateCameraHorizontal(angle) {
  var f = new Vector3();
  f.set(g_camera.at);
  f.sub(g_camera.eye);
  var rotationMatrix = new Matrix4();
  rotationMatrix.setRotate(angle, g_camera.up.elements[0], g_camera.up.elements[1], g_camera.up.elements[2]);
  var f_prime = rotationMatrix.multiplyVector3(f);
  g_camera.at = new Vector3();
  g_camera.at.set(g_camera.eye);
  g_camera.at.add(f_prime);
}

function rotateCameraVertical(angle) {
  var f = new Vector3();
  f.set(g_camera.at);
  f.sub(g_camera.eye);
  var s = Vector3.cross(g_camera.up, f);
  var rotationMatrix = new Matrix4();
  rotationMatrix.setRotate(angle, s.elements[0], s.elements[1], s.elements[2]);
  var f_prime = rotationMatrix.multiplyVector3(f);
  g_camera.at = new Vector3();
  g_camera.at.set(g_camera.eye);
  g_camera.at.add(f_prime);
}

function handleMouseUp(ev) {
  g_isDragging = false;
}


function main() {
  // Retrieve <canvas> element
  setupWebGL();
  
  // Initialize shaders
  connectVariablesToGLSL();

  //set up actions for HTML UI elements
  addActionsForHtmlUI();

  document.onkeydown = keydown;

  //mouse controls
  canvas.onmousedown = handleMouseDown;
  canvas.onmousemove = handleMouseMove;
  canvas.onmouseup = handleMouseUp;
  initTextures();
 
  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  requestAnimationFrame(tick);
}



var g_shapesList = [];

function click(ev) {
  //extract event click and convert coordinates to webGL coordinates
  let [x,y] = convertCoordinatesEventToGL(ev);

  //create and store the new point
  let point;
  if(g_selectedType == POINT){
    point = new Point();
  } else if (g_selectedType == CIRCLE){
    point = new Circle();
  } else{
    point = new Triangle();
  }
  point.position=[x, y];
  point.color=g_selectedColor.slice();
  point.size=g_selectedSize;
  g_shapesList.push(point);
  
  renderAllShapes();
}

function convertCoordinatesEventToGL(ev) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);
  return([x, y]);
}


g_camera = new Camera();
var g_map = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

function drawMap(){          
  var body = new Cube();
  for(var z=0; z<g_map.length; z++){
    for(var x=0; x<g_map[0].length; x++){
      var height = g_map[z][x];
      
      if(height > 0){
        // Draw 'height' number of cubes stacked vertically
        for(var h=0; h<height; h++){
          body.color = [1.0, 0.0, 0.0, 1.0];
          body.textureNum = -1;
          // Stack cubes: each cube is 1 unit tall, starting from -0.75
          body.matrix.setIdentity();
          body.matrix.translate(x-14.5, -0.75 + h, z-15);
          body.renderfast();
        }
      }  
    }
  }
}


function keydown(ev) {
    if(ev.keyCode == 87) { // W
        g_camera.forward();
    } else if(ev.keyCode == 83) { // S
        g_camera.back();
    } else if(ev.keyCode == 65) { // A
        g_camera.left();
    } else if(ev.keyCode == 68) { // D
        g_camera.right();
    } else if(ev.keyCode == 81) { // Q
        g_camera.panLeft();
    } else if(ev.keyCode == 69) { // E
        g_camera.panRight();
    } else if(ev.keyCode == 70) { // F
        g_flyMode = !g_flyMode;
        console.log("Fly mode: " + (g_flyMode ? "ON" : "OFF"));
        if (!g_flyMode) {
          var groundLevel = 1;
          if (g_camera.eye.elements[1] > groundLevel) {
            var dropAmount = g_camera.eye.elements[1] - groundLevel;
            g_camera.eye.elements[1] -= dropAmount;
            g_camera.at.elements[1] -= dropAmount;
          }
        }
    }
    renderAllShapes();
}


function renderAllShapes(){

  //check the time at the start of function 
  var startTime = performance.now();


  var projMat = new Matrix4();
  //fov is 40, aspect ratio is width/height of canvas, near plane is 0.1, far plane is 100
  projMat.setPerspective(50, canvas.width/canvas.height, 1, 100);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);

  var viewMat = new Matrix4();


  viewMat.setLookAt(
    g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2],
    g_camera.at.elements[0], g_camera.at.elements[1], g_camera.at.elements[2],
    g_camera.up.elements[0], g_camera.up.elements[1], g_camera.up.elements[2]
  ); 
  
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

  var globalRotMat = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);


  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


  drawMap();

  var sky = new Cube();
  sky.color = [1.0, 0.5, 0.5, 1.0];
  sky.textureNum = -2;
  if(g_normalOn) sky.textureNum = -3;
  sky.matrix.scale(-32,-32,-32);
  sky.matrix.translate(-0.5, -0.5, -0.5);
  sky.renderfast();

  var floor = new Cube();
  floor.color = [0.5, 0.5, 0.5, 1.0];
  floor.textureNum = -1;
  floor.matrix.translate(0, -.75, -0.0);
  floor.matrix.scale(31, 0.01, 31);
  floor.matrix.translate(-.5, 1, -.5);
  floor.renderfast();

  var whiteSphere = new Sphere();
  whiteSphere.color = [1.0, 1.0, 1.0, 1.0];
  whiteSphere.textureNum = -2;
  if(g_normalOn) whiteSphere.textureNum = -3;
  whiteSphere.matrix.translate(0.75, .2, 0.0);
  whiteSphere.matrix.scale(0.3, 0.3, 0.3);
  whiteSphere.render();

  var body = new Cube();
  body.color = [1.0, 0.0, 0.0, 1.0];
  body.textureNum = -2;
  if(g_normalOn) body.textureNum = -3;
  body.matrix.translate(-0.25, -0.75, 0.0);
  body.matrix.rotate(-5, 1, 0, 0); 
  body.matrix.scale(0.5, 0.3, 0.5); 
  body.renderfast();

  //draw a left arm
  var leftArm = new Cube();
  leftArm.color = [1.0, 1.0, 0.0, 1.0];
  if(g_normalOn) leftArm.textureNum = -3;
  leftArm.matrix.setTranslate(0, -0.5, 0.0);
  leftArm.matrix.rotate(-5, 1, 0, 1);
  leftArm.matrix.rotate(-g_yellowAngle, 0, 0, 1);
  var yellowCoordinatesMat = new Matrix4(leftArm.matrix);
  leftArm.matrix.scale(0.25, 0.7, 0.5);
  leftArm.matrix.translate(-0.5, 0.0, 0.0);
  leftArm.renderfast();

  //test box
  var box = new Cube();
  box.color = [1.0, 0.0, 1.0, 1.0];
  if(g_normalOn) box.textureNum = -3;
  box.matrix = yellowCoordinatesMat;
  box.matrix.translate(0.0, 0.90, 0.0);
  box.matrix.rotate(45,0,0,1);
  box.matrix.rotate(g_magentaAngle, 0, 0, 1);
  box.matrix.scale(0.3, 0.3, 0.3);
  box.matrix.translate(-0.5, 0.0, -0.001);
  // box.matrix.rotate(-30, 1, 0, 0);
  // box.matrix.scale(0.2, 0.4, 0.2);
  box.renderfast();


  var duration = performance.now() - startTime;
  sendTextToHTML(" ms: "+Math.floor(duration) + " fps: " + Math.floor(10000/duration), "numdot")

}

function sendTextToHTML(text, htmlID){
  var htmlElm = document.getElementById(htmlID);
  if(!htmlElm){
    console.log("Failed to get" + htmlID + "from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}




//initalize and load textures : functions taken from Matsuda textbook

function initTextures() {
  var image = new Image();  // Create the image object
  if (!image) {
    console.log('Failed to create the image object');
    return false;
  }
  // Register the event handler to be called on loading an image
  image.onload = function(){ sendImageToTEXTURE0(image); };
  // Tell the browser to load an image
  image.src = 'sky.jpg';

  //add more textures here
  var image1 = new Image();
  if (!image1) {
    console.log('Failed to create the image object');
    return false;
  }
  image1.onload = function(){ sendImageToTEXTURE1(image1); };
  image1.onerror = function() { console.log('Failed to load uvgrid.png'); };  // Add this

  image1.src = 'uvgrid.png';

  return true;
}

function sendImageToTEXTURE0(image) {
  var texture = gl.createTexture();   // Create a texture object
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  }

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y axis
  // Enable texture unit0
  gl.activeTexture(gl.TEXTURE0);
  // Bind the texture object to the target
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the texture image
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  
  gl.generateMipmap(gl.TEXTURE_2D); // Generate mipmap for the texture
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

  // Set the texture unit 0 to the sampler
  gl.uniform1i(u_Sampler0, 0);

  console.log("texture 0 loaded with mipmaps");
}

function sendImageToTEXTURE1(image) {
  console.log("sendImageToTEXTURE1 called");
  console.log("Image dimensions:", image.width, image.height);
  
  var texture = gl.createTexture();
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  }

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the texture image
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  
  gl.generateMipmap(gl.TEXTURE_2D); // Generate mipmap for the texture

  // Set the texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    
// Set the texture unit 1 to the sampler
  gl.uniform1i(u_Sampler1, 1);

  console.log("texture 1 loaded with mapmaps");
  console.log("GL error:", gl.getError()); // Should be 0

}