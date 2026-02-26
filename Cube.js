class Cube{
  constructor(){
    this.type='cube';
    this.color=[1.0,1.0,1.0,1.0];
    this.matrix = new Matrix4(); //uncomment when using 
    this.normalMatrix = new Matrix4();
    
    this.textureNum = -2; //use color as default
    this.useSpecular = 1; //1 for specular, 0 for no specular
    this.cubeVerts = new Float32Array([
      // Front face
      0.0, 0.0, 0.0,
      1.0, 1.0, 0.0,
      1.0, 0.0, 0.0,
      0.0, 0.0, 0.0,
      0.0, 1.0, 0.0,
      1.0, 1.0, 0.0,

      // Top face
      0.0, 1.0, 0.0,
      0.0, 1.0, 1.0,
      1.0, 1.0, 1.0,
      0.0, 1.0, 0.0,
      1.0, 1.0, 1.0,
      1.0, 1.0, 0.0,

      // Right face
      1.0, 0.0, 0.0,
      1.0, 1.0, 1.0,
      1.0, 0.0, 1.0,
      1.0, 0.0, 0.0,
      1.0, 1.0, 0.0,
      1.0, 1.0, 1.0,

      // Bottom face
      1.0, 0.0, 0.0,
      0.0, 0.0, 1.0,
      1.0, 0.0, 1.0,
      1.0, 0.0, 0.0,
      0.0, 0.0, 0.0,
      0.0, 0.0, 1.0,

      // Back face
      0.0, 0.0, 1.0,
      1.0, 1.0, 1.0,
      0.0, 1.0, 1.0,
      0.0, 0.0, 1.0,
      1.0, 0.0, 1.0,
      1.0, 1.0, 1.0,

      // Left face
      0.0, 0.0, 0.0,
      0.0, 1.0, 1.0,
      0.0, 1.0, 0.0,
      0.0, 0.0, 0.0,
      0.0, 0.0, 1.0,
      0.0, 1.0, 1.0,
    ]);
    this.cubeUVs=new Float32Array([
      // Front face
      0,0, 1,1, 1,0,
      0,0, 0,1, 1,1,
      // Top face
      0,1, 0,0, 1,0,
      0,1, 1,0, 1,1,
      // Right face
      1,0, 0,1, 0,0,
      1,0, 1,1, 0,1,
      // Bottom face
      1,0, 0,1, 0,0,
      1,0, 1,1, 0,1,
      // Back face
      1,0, 0,1, 1,1,
      1,0, 0,0, 0,1,
      // Left face
      1,0, 0,1, 1,1,
      1,0, 0,0, 0,1,
    ]);

    this.cubeNormals = new Float32Array([
      // Front face
      0,0,-1, 0,0,-1, 0,0,-1,
      0,0,-1, 0,0,-1, 0,0,-1,
      // Top face
      0,1,0, 0,1,0, 0,1,0,
      0,1,0, 0,1,0, 0,1,0,
      // Right face
      1,0,0, 1,0,0, 1,0,0,
      1,0,0, 1,0,0, 1,0,0,
      // Bottom face
      0,-1,0, 0,-1,0, 0,-1,0,
      0,-1,0, 0,-1,0, 0,-1,0,
      // Back face
      0,0,1, 0,0,1, 0,0,1,
      0,0,1, 0,0,1, 0,0,1,
      // Left face
      -1,0,0, -1,0,0, -1,0,0,
      -1,0,0, -1,0,0, -1,0,0,
    ]);  
  }

renderfast(){
    var rgba = this.color;
    if(g_normalOn) this.textureNum = -3;

    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniform1i(u_useSpecular, this.useSpecular);
    gl.uniformMatrix4fv(u_NormalMatrix, false, this.normalMatrix.elements);

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    

//------------------------------------------------    
    if(g_vertexBuffer == null){
      initTriangle3D();
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
    // Bind vertex buffer and upload vertex data
    gl.bufferData(gl.ARRAY_BUFFER, this.cubeVerts, gl.DYNAMIC_DRAW);

//------------------------------------------------
    if(g_uvBuffer == null){
      initUVBuffer();
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuffer);
    // Bind UV buffer and upload UV data
    gl.bufferData(gl.ARRAY_BUFFER, this.cubeUVs, gl.DYNAMIC_DRAW);

//------------------------------------------------
    // Bind Normal buffer and upload Normal data
    if(g_normalBuffer == null){
      initNormalBuffer();
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, g_normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.cubeNormals, gl.DYNAMIC_DRAW);

    
    gl.drawArrays(gl.TRIANGLES, 0, 36);
}

} 
