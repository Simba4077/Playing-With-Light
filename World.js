// Vertex shader program
var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec4 v_VertPos;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 1.0)));
    v_VertPos = u_ModelMatrix * a_Position;
  }
`;

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  uniform vec3 u_spotPos;
  uniform vec3 u_spotDir;
  uniform float u_spotCosineCutoff;
  uniform float u_spotExponent;
  uniform bool u_spotOn;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform int u_whichTexture;
  uniform int u_useSpecular; //1 for specular, 0 for no specular
  uniform vec3 u_lightPos;
  uniform bool u_lightOn; //true for light on, false for light off
  uniform vec3 u_cameraPos;
  varying vec4 v_VertPos;
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

  if(u_lightOn){
      vec3 L = normalize(u_lightPos - vec3(v_VertPos));
      vec3 N = normalize(v_Normal);
      float nDotL = max(dot(N, L), 0.0);
      vec3 R = reflect(-L, N);
      vec3 E = normalize(u_cameraPos - vec3(v_VertPos));
      float specular = 0.8 * pow(max(dot(E, R), 0.0), 30.0);

      vec3 diffuse = vec3(gl_FragColor) * nDotL;
      vec3 ambient = vec3(gl_FragColor) * 0.1;

      vec3 finalColor;
      if(u_useSpecular == 0){
        finalColor = diffuse + ambient;
      } else {
        finalColor = diffuse + ambient + specular;
      }

      if(u_spotOn){
        vec3 spotL = normalize(u_spotPos - vec3(v_VertPos));
        float spotFactor = 0.0;
        vec3 D = normalize(-u_spotDir);
        float spotCosine = dot(D, spotL);
        if(spotCosine >= u_spotCosineCutoff){
          spotFactor = pow(spotCosine, u_spotExponent);
        }
        float spotNDotL = max(dot(N, spotL), 0.0);
        vec3 spotR = reflect(-spotL, N);
        float spotSpec = 0.8 * pow(max(dot(E, spotR), 0.0), 30.0);
        vec3 spotDiffuse = vec3(gl_FragColor) * spotNDotL * spotFactor;
        vec3 spotSpecular = spotSpec * spotFactor * vec3(1.0);
        finalColor += spotDiffuse + spotSpecular;
      }

      gl_FragColor = vec4(finalColor, 1.0);
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
let u_useSpecular;
let u_ModelMatrix;
let u_NormalMatrix;
let u_ProjectionMatrix;
let u_ViewMatrix;
let u_CameraPos;
let u_GlobalRotateMatrix;
let u_Sampler0;
let u_Sampler1;
let u_lightPos;
let u_lightOn;
let u_spotPos;
let u_spotDir;
let u_spotCosineCutoff;
let u_spotExponent;
let u_spotOn;

let g_spotPos = [0, 5, 0];
let g_spotDir = [0, -1, 0];          // pointing straight down
let g_spotCosineCutoff = Math.cos(Math.PI / 8);  // 22.5 degree cone
let g_spotExponent = 20.0;            // higher = sharper falloff at edges
let g_spotOn = true;

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

  u_lightOn = gl.getUniformLocation(gl.program, 'u_lightOn');
  if (!u_lightOn) {
    console.log('Failed to get the storage location of u_lightOn');
    return;
  }

  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal < 0){
    console.log('Failed to get the storage location of a_Normal');
    return;
  }

  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (!u_NormalMatrix) {
    console.log('Failed to get the storage location of u_NormalMatrix');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_lightPos = gl.getUniformLocation(gl.program, 'u_lightPos');
  if (!u_lightPos) {
    console.log('Failed to get the storage location of u_lightPos');
    return;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
   console.log('Failed to get the storage location of u_ModelMatrix');
   return;
  }

  u_useSpecular = gl.getUniformLocation(gl.program, 'u_useSpecular');
  if (!u_useSpecular) {
    console.log('Failed to get the storage location of u_useSpecular');
    return;
  }

  u_CameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
  if (!u_CameraPos) {
    console.log('Failed to get the storage location of u_cameraPos');
    return;
  }

  u_spotPos = gl.getUniformLocation(gl.program, 'u_spotPos');
  if (!u_spotPos) {
    console.log('Failed to get the storage location of u_spotPos');
    return;
  }
  u_spotDir = gl.getUniformLocation(gl.program, 'u_spotDir');
  if (!u_spotDir) {
    console.log('Failed to get the storage location of u_spotDir');
    return;
  }
  u_spotCosineCutoff = gl.getUniformLocation(gl.program, 'u_spotCosineCutoff');
  if (!u_spotCosineCutoff) {
    console.log('Failed to get the storage location of u_spotCosineCutoff');
    return;
  }
  u_spotExponent = gl.getUniformLocation(gl.program, 'u_spotExponent');
  if (!u_spotExponent) {
    console.log('Failed to get the storage location of u_spotExponent');
    return;
  }
  u_spotOn = gl.getUniformLocation(gl.program, 'u_spotOn');
  if (!u_spotOn) {
    console.log('Failed to get the storage location of u_spotOn');
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
let g_topAngle = 0;
let g_middleAngle = 0;
let g_isDragging = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;
let g_flyMode = false;
let g_normalOn = false;
let g_lightPos =[0,1,-2];
let g_animationOn = false;
let g_lightOn = true;
var g_teapot;



function addActionsForHtmlUI(){
  //angle slider events
  document.getElementById('angleSlide').addEventListener('mousemove', function() {g_globalAngle=this.value; renderAllShapes();});
  document.getElementById('lightSlideX').addEventListener('mousemove', function() { g_lightPos[0] = this.value/100; renderAllShapes();});
  document.getElementById('lightSlideY').addEventListener('mousemove', function() { g_lightPos[1] = this.value/100; renderAllShapes();});
  document.getElementById('lightSlideZ').addEventListener('mousemove', function() { g_lightPos[2] = this.value/100; renderAllShapes();});

  document.getElementById('normalOn').onclick = function(){g_normalOn = true; renderAllShapes();};
  document.getElementById('normalOff').onclick = function(){g_normalOn = false; renderAllShapes();};
  document.getElementById('animationOn').onclick = function(){g_animationOn = true; renderAllShapes();};
  document.getElementById('animationOff').onclick = function(){g_animationOn = false; renderAllShapes();};
  document.getElementById('lightOn').onclick = function(){g_lightOn = true; renderAllShapes();};
  document.getElementById('lightOff').onclick = function(){g_lightOn = false; renderAllShapes();};

  document.getElementById('walkOn').onclick = function(){ g_walkingAnimation = true; };
  document.getElementById('walkOff').onclick = function(){ g_walkingAnimation = false; };

  document.getElementById('spotOn').onclick = function(){ g_spotOn = true; renderAllShapes(); };
  document.getElementById('spotOff').onclick = function(){ g_spotOn = false; renderAllShapes(); };
}

var g_startTime = performance.now()/1000;
var g_seconds = performance.now()/1000-g_startTime;

function tick() {
  g_seconds = performance.now()/1000-g_startTime;
  updateAnimationAngles();
  renderAllShapes();
  requestAnimationFrame(tick);
}

function updateAnimationAngles() {
  if(g_animationOn){
    g_lightPos[0] = 4* Math.cos(g_seconds);
  }

  g_topAngle = 90*Math.sin(g_seconds);
  g_middleAngle = 60*Math.sin(g_seconds);
  updateChihuahuaAnimation();
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

  g_teapot = new Model('teapot.obj');

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

  var normalMatrix = new Matrix4();
  normalMatrix.setInverseOf(globalRotMat);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);


  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  gl.uniform3f(u_CameraPos, g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2]);
  gl.uniform1i(u_lightOn, g_lightOn);
  gl.uniform3f(u_spotPos, g_spotPos[0], g_spotPos[1], g_spotPos[2]);
  gl.uniform3f(u_spotDir, g_spotDir[0], g_spotDir[1], g_spotDir[2]);
  gl.uniform1f(u_spotCosineCutoff, g_spotCosineCutoff);
  gl.uniform1f(u_spotExponent, g_spotExponent);
  gl.uniform1i(u_spotOn, g_spotOn);
  drawMap();
  drawChihuahua();

  var light = new Cube();
  light.color = [2,2,0,1];
  light.textureNum = -2;
  light.matrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  light.matrix.scale(-0.1, -0.1, -0.1);
  light.matrix.translate(-0.5, -0.5, -0.5);
  light.renderfast();

  var sky = new Cube();
  sky.useSpecular = 0;
  sky.color = [1.0, 0.5, 0.5, 1.0];
  sky.textureNum = 0;
  if(g_normalOn) sky.textureNum = -3;
  sky.matrix.scale(-20,-20,-20);
  sky.matrix.translate(-0.5, -0.5, -0.5);
  sky.renderfast();

  var floor = new Cube();
  floor.color = [0.2, 0.9, 0.1, 1.0];
  floor.textureNum = -2;
  floor.matrix.translate(0, -.75, -0.0);
  floor.matrix.scale(31, 0.01, 31);
  floor.matrix.translate(-.5, -9, -.5);
  floor.renderfast();

  var whiteSphere = new Sphere();
  whiteSphere.color = [1.0, 1.0, 1.0, 1.0];
  whiteSphere.textureNum = 1;
  if(g_normalOn) whiteSphere.textureNum = -3;
  whiteSphere.matrix.translate(-0.75, -.2, -0.0);
  whiteSphere.matrix.scale(0.3, 0.3, 0.3);
  whiteSphere.render();


  //---------------------------------------- rotating cubes
  var base = new Cube();
  base.color = [1.0, 0.0, 0.0, 1.0];
  base.textureNum = -2;
  base.matrix.translate(-0.25, -0.75, 0.0);
  base.matrix.rotate(-5, 1, 0, 0); 
  base.matrix.scale(0.5, 0.3, 0.5); 
  base.renderfast();

  //draw middle body
  var middleBody = new Cube();
  middleBody.color = [1.0, 1.0, 0.0, 1.0];
  middleBody.matrix.setTranslate(0, -0.5, 0.0);
  middleBody.matrix.rotate(-5, 1, 0, 1);
  middleBody.matrix.rotate(-g_middleAngle, 0, 0, 1);
  var middleCoordinatesMat = new Matrix4(middleBody.matrix);
  middleBody.matrix.scale(0.3, 0.7, 0.5);
  middleBody.matrix.translate(-0.5, 0.0, 0.0);
  middleBody.normalMatrix.setInverseOf(middleBody.matrix).transpose();
  middleBody.renderfast();

  //head 
  var head = new Cube();
  head.color = [1.0, 0.0, 1.0, 1.0];
  head.matrix = middleCoordinatesMat;
  head.matrix.translate(0.0, 0.90, 0.0);
  head.matrix.rotate(45,0,0,1);
  head.matrix.rotate(g_topAngle, 0, 0, 1);
  head.matrix.scale(0.3, 0.3, 0.3);
  head.matrix.translate(-0.5, 0.0, -0.001);
  head.normalMatrix.setInverseOf(head.matrix).transpose();
  head.renderfast();

  //----------------------------------------
  g_teapot.matrix.setIdentity();
  g_teapot.matrix.translate(3, -1, -4); 
  g_teapot.normalMatrix.setInverseOf(g_teapot.matrix).transpose();
  g_teapot.useSpecular = 1;
  if(g_normalOn) g_teapot.textureNum = -3;
  g_teapot.matrix.scale(0.4,0.4,0.4);
  g_teapot.render();


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
  image1.onerror = function() { console.log('Failed to load gray.jpg'); };  // Add this

  image1.src = 'gray.jpg';

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