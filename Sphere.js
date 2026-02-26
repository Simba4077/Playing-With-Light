function cos(angle){ return Math.cos(angle); }
function sin(angle) {return Math.sin(angle); }

class Sphere{
  constructor(){
    this.type='sphere';
    this.useSpecular = 1; //1 for ambient, 0 for no ambient
    this.color=[1.0,1.0,1.0,1.0];
    this.matrix = new Matrix4(); //uncomment when using 
    this.textureNum = -2; //use UV color as default
  }

render(){
    var verts32 = [];
    var uv32 = [];
    var rgba = this.color;
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniform1i(u_useSpecular, this.useSpecular);
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    var d = Math.PI/10;
    var dd = Math.PI/10;

    for (var t = 0; t<Math.PI; t+=d){
        for (var r = 0; r< (2*Math.PI); r+=d){
            var p1 = [sin(t)*cos(r), sin(t) * sin(r), cos(t)];
            var p2 = [sin(t+dd)*cos(r), sin(t+dd)*sin(r), cos(t+dd)];
            var p3 = [sin(t)*cos(r+dd), sin(t)*sin(r+dd), cos(t)];
            var p4 = [sin(t+dd)*cos(r+dd),sin(t+dd)*sin(r+dd),cos(t+dd)];

            var uv1 = [t/Math.PI, r/(2*Math.PI)];
            var uv2 = [(t+dd)/Math.PI, r/(2*Math.PI)];
            var uv3 = [t/Math.PI, (r+dd)/(2*Math.PI)];
            var uv4 = [(t+dd)/Math.PI, (r+dd)/(2*Math.PI)];
        
            verts32 = verts32.concat(p1);
            uv32 = uv32.concat(uv1);
            verts32 = verts32.concat(p2);
            uv32 = uv32.concat(uv2);
            verts32 = verts32.concat(p4);
            uv32 = uv32.concat(uv4);


            verts32 = verts32.concat(p1);
            uv32 = uv32.concat(uv1);
            verts32 = verts32.concat(p4);
            uv32 = uv32.concat(uv4);
            verts32 = verts32.concat(p3);
            uv32 = uv32.concat(uv3);

    } 

    }

    this.verts32 = new Float32Array(verts32);
    this.uv32 = new Float32Array(uv32);
   
   
// Initialize buffers and bind data
    if(g_vertexBuffer == null){
      initTriangle3D();
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
    // Bind vertex buffer and upload vertex data
    gl.bufferData(gl.ARRAY_BUFFER, this.verts32, gl.DYNAMIC_DRAW);

//------------------------------------------------
    if(g_uvBuffer == null){
      initUVBuffer();
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuffer);
    // Bind UV buffer and upload UV data
    gl.bufferData(gl.ARRAY_BUFFER, this.uv32, gl.DYNAMIC_DRAW);

//------------------------------------------------
    // Bind Normal buffer and upload Normal data
    if(g_normalBuffer == null){
      initNormalBuffer();
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, g_normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.verts32, gl.DYNAMIC_DRAW);

    
    gl.drawArrays(gl.TRIANGLES, 0, this.verts32.length/3);

  
}
}