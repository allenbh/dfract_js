function fract() {
  // Constants
  var OFFSCREEN_DIM = 1024;
  var OFFSCREEN_SCALE = 1.8;
  // Variables
  var DEPTH = 10;
  var BRANCH = 4;
  var SCALEW = 0.53;
  var SCALEH = 0.53;
  var TRANS = 0.5;
  var ROTATE = -0.1;
  var ALPHA = 1.0;
  var DEBUG_TEXBOX = 0;

  var canvas = document.getElementById('fract-canvas');

  var gl = canvas.getContext('webgl') ||
    canvas.getContext('webgl-experimental');
  if(!gl) return;
  document.gl = gl;

  var vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, ""+
      "attribute vec3 aVertex;\n"+

      "uniform mat4 uMVMatrix;\n"+
      "uniform mat4 uPMatrix;\n"+

      "varying vec2 vTexCoord;\n"+

      "void main(void) {\n"+
      "  gl_Position = uPMatrix * uMVMatrix * vec4(aVertex, 1.0);\n"+
      "  vTexCoord = (aVertex.xy / "+OFFSCREEN_SCALE+" + 1.0) / 2.0;\n"+
      "}\n"+

      "");
  gl.compileShader(vs);
  console.log(gl.getShaderInfoLog(vs));

  var fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, ""+
      "precision mediump float;\n"+

      "uniform vec4 uScale;\n"+
      "uniform vec4 uColor;\n"+
      "uniform sampler2D uSamp;\n"+

      "varying vec2 vTexCoord;\n"+

      "void main(void) {\n"+
      "  gl_FragColor = uScale * (uColor + texture2D(uSamp, vTexCoord));\n"+
      "}\n"+

      "");
  gl.compileShader(fs);
  console.log(gl.getShaderInfoLog(fs));

  var shader = gl.createProgram();
  gl.attachShader(shader, vs);
  gl.attachShader(shader, fs);
  gl.linkProgram(shader);

  gl.useProgram(shader);

  var attrVertex = gl.getAttribLocation(shader, 'aVertex');
  gl.enableVertexAttribArray(attrVertex);

  var unifColor = gl.getUniformLocation(shader, 'uColor');
  var unifScale = gl.getUniformLocation(shader, 'uScale');
  var unifMVMatrix = gl.getUniformLocation(shader, 'uMVMatrix');
  var unifPMatrix = gl.getUniformLocation(shader, 'uPMatrix');

  var colorScale = vec4.fromValues(1.0, 1.0, 1.0, 1.0);

  var colors = [
    vec4.fromValues(1.0, 0.0, 0.0, 1.0),
    vec4.fromValues(0.0, 1.0, 0.0, 1.0),
    vec4.fromValues(0.0, 0.0, 1.0, 1.0),
    vec4.fromValues(0.5, 0.5, 0.0, 1.0),
    vec4.fromValues(0.5, 0.0, 0.5, 1.0),
    vec4.fromValues(0.0, 0.5, 0.5, 1.0),
    ];

  var shapes = [
    makeBufferFloat32(gl, [ 0.000,  0.400, 0.0,
                            0.348, -0.200, 0.0,
                           -0.348, -0.200, 0.0,
                           ]),
    makeBufferFloat32(gl, [ 0.283,  0.283, 0.0,
                            0.283, -0.283, 0.0,
                           -0.283, -0.283, 0.0,
                           -0.283,  0.283, 0.0,
                           ]),
    makeBufferFloat32(gl, [-0.348,  0.200, 0.0,
                            0.348,  0.200, 0.0,
			    0.000, -0.400, 0.0,
                           ]),
    makeBufferFloat32(gl, [ 0.400,  0.000, 0.0,
                            0.000, -0.400, 0.0,
                           -0.400,  0.000, 0.0,
                            0.000,  0.400, 0.0,
                           ]),
    ];
  var lengths = [ 3, 4, 3, 4 ];

  var texScale = vec4.fromValues(1.0, 1.0, 1.0, ALPHA);
  var texColor = vec4.fromValues(0.0, 0.0, 0.0, 0.0);
  var texShape = makeBufferFloat32(gl, [
		  -0.99*OFFSCREEN_SCALE,  0.99*OFFSCREEN_SCALE, 0.0,
		   0.99*OFFSCREEN_SCALE,  0.99*OFFSCREEN_SCALE, 0.0,
		   0.99*OFFSCREEN_SCALE, -0.99*OFFSCREEN_SCALE, 0.0,
		  -0.99*OFFSCREEN_SCALE, -0.99*OFFSCREEN_SCALE, 0.0,
		  -0.99*OFFSCREEN_SCALE,  0.99*OFFSCREEN_SCALE, 0.0,
		  ]);

  function renderStep(depth) {
    var mv = mat4.identity(mat4.create())
    gl.uniformMatrix4fv(unifMVMatrix, false, mv);

    // render the shape
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, shapes[depth%shapes.length]);
    gl.vertexAttribPointer(attrVertex, 3, gl.FLOAT, false, 0, 0);
    gl.uniform4fv(unifColor, colors[depth%colors.length]);
    gl.uniform4fv(unifScale, colorScale);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, lengths[depth%lengths.length]);

    // render the branches
    var mr = mat4.identity(mat4.create());
    mr = mat4.rotateZ(mr, mr, Math.PI * 2.0 / BRANCH);
    mv = mat4.scale(mv, mv, [SCALEW, SCALEH, 0]);
    mv = mat4.translate(mv, mv, [TRANS, 0, 0]);
    mv = mat4.rotateZ(mv, mv, Math.PI * ROTATE);
    gl.bindTexture(gl.TEXTURE_2D, texCurrent);
    gl.bindBuffer(gl.ARRAY_BUFFER, texShape);
    gl.vertexAttribPointer(attrVertex, 3, gl.FLOAT, false, 0, 0);
    gl.uniform4fv(unifColor, texColor);
    gl.uniform4fv(unifScale, texScale);
    for(var i = 0; i < BRANCH; ++i) {
      gl.uniformMatrix4fv(unifMVMatrix, false, mv);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
      mv = mat4.multiply(mv, mr, mv);
    }

    // render texture boxes (for debugging)
    if(depth < DEBUG_TEXBOX) {
      gl.uniform4fv(unifColor, colors[depth%colors.length]);
      gl.uniform4fv(unifScale, colorScale);
      for(var i = 0; i < BRANCH; ++i) {
        gl.uniformMatrix4fv(unifMVMatrix, false, mv);
        gl.drawArrays(gl.LINE_STRIP, 0, 5);
        mv = mat4.multiply(mv, mr, mv);
      }
    }
  }

  var texCurrent = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texCurrent);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OFFSCREEN_DIM, OFFSCREEN_DIM,
      0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  var texNext = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texNext);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OFFSCREEN_DIM, OFFSCREEN_DIM,
      0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  function swapTextures() {
    var tmp = texNext;
    texNext = texCurrent;
    texCurrent = tmp;
  }

  var offdepth = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, offdepth);
  gl.renderbufferStorage(gl.RENDERBUFFER,
      gl.DEPTH_COMPONENT16, OFFSCREEN_DIM, OFFSCREEN_DIM);

  var offscreen = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, offscreen);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, offdepth);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  function render() {
    var aspect = 1.0 * canvas.width / canvas.height;

    gl.bindFramebuffer(gl.FRAMEBUFFER, offscreen);

    gl.viewport(0, 0, OFFSCREEN_DIM, OFFSCREEN_DIM);
    gl.uniformMatrix4fv(unifPMatrix, false,
        mat4.ortho(mat4.create(),
	       	-OFFSCREEN_SCALE, OFFSCREEN_SCALE,
	       	-OFFSCREEN_SCALE, OFFSCREEN_SCALE,
	       	-1, 1));
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    gl.framebufferTexture2D(gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texCurrent, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    for(i = DEPTH; 0 < i; --i) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texNext, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      renderStep(i);
      swapTextures();
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniformMatrix4fv(unifPMatrix, false,
        mat4.ortho(mat4.create(), -aspect*1.2, aspect*1.2, -1.2, 1.2, -1, 1));
    gl.clearColor(0.2, 0.2, 0.2, 1.0);

    gl.clear(gl.COLOR_BUFFER_BIT);

    renderStep(0);
  }

  gl.blendFuncSeparate(
		  gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,
		  gl.SRC_ALPHA, gl.DST_ALPHA);
  gl.enable(gl.BLEND);

  var input;

  input = document.getElementById('fract-depth-ctrl');
  input.value = DEPTH;
  input.onchange = function() {
    DEPTH = this.value;
    window.requestAnimationFrame(render);
  };

  input = document.getElementById('fract-branch-ctrl');
  input.value = BRANCH;
  input.onchange = function() {
    BRANCH = this.value;
    window.requestAnimationFrame(render);
  };

  input = document.getElementById('fract-trans-ctrl');
  input.value = TRANS;
  input.onchange = function() {
    TRANS = this.value;
    window.requestAnimationFrame(render);
  };

  input = document.getElementById('fract-scale-ctrl');
  input.value = SCALEW;
  input.onchange = function() {
    SCALEW = this.value;
    SCALEH = this.value;
    window.requestAnimationFrame(render);
  };

  input = document.getElementById('fract-rotate-ctrl');
  input.value = ROTATE;
  input.onchange = function() {
    ROTATE = this.value;
    window.requestAnimationFrame(render);
  };

  input = document.getElementById('fract-debug-ctrl');
  input.value = DEBUG_TEXBOX;
  input.onchange = function() {
    DEBUG_TEXBOX = this.value;
    window.requestAnimationFrame(render);
  };

  render();
}

function range(n) {
  var a = [];
  for(var i = 0; i < n; ++i) {
    a.push(i);
  }
  return a;
}

function repeat(n, v) {
  var a = [];
  for(var i = 0; i < n; ++i) {
    a = a.concat(v);
  }
  return a;
}

function makeBufferFloat32(gl, a) {
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a), gl.STATIC_DRAW);
  return buffer;
}

function makeBufferUint16(gl, a) {
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(a), gl.STATIC_DRAW);
  return buffer;
}

