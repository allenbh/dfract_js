function fract() {
  var canvas = document.getElementById('fract-canvas');

  var gl = canvas.getContext('webgl') ||
    canvas.getContext('webgl-experimental');
  if(!gl) return;

  var vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, ""+
      "attribute vec3 aVertexPosition;\n"+
      "attribute vec4 aVertexColor;\n"+

      "uniform mat4 uMVMatrix;\n"+
      "uniform mat4 uPMatrix;\n"+

      "varying lowp vec4 vColor;\n"+

      "void main(void) {\n"+
      "  gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\n"+
      "  vColor = aVertexColor;\n"+
      "}\n"+

      "");
  gl.compileShader(vs);

  var fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, ""+
      "varying lowp vec4 vColor;\n"+

      "void main(void) {\n"+
      "  gl_FragColor = vColor;\n"+
      "}\n"+

      "");
  gl.compileShader(fs);

  var shader = gl.createProgram();
  gl.attachShader(shader, vs);
  gl.attachShader(shader, fs);
  gl.linkProgram(shader);

  gl.useProgram(shader);

  var attrVertexPosition = gl.getAttribLocation(shader, 'aVertexPosition');
  gl.enableVertexAttribArray(attrVertexPosition);

  var attrVertexColor = gl.getAttribLocation(shader, 'aVertexColor');
  gl.enableVertexAttribArray(attrVertexColor);

  var unifMVMatrix = gl.getUniformLocation(shader, 'uMVMatrix');
  var unifPMatrix = gl.getUniformLocation(shader, 'uPMatrix');

  var colors = [
    makeBufferFloat32(gl, repeat(10, [1.0, 0.0, 0.0, 1.0])),
    makeBufferFloat32(gl, repeat(10, [0.0, 1.0, 0.0, 1.0])),
    makeBufferFloat32(gl, repeat(10, [0.0, 0.0, 1.0, 1.0])),
    makeBufferFloat32(gl, repeat(10, [0.5, 0.5, 0.0, 1.0])),
    makeBufferFloat32(gl, repeat(10, [0.5, 0.0, 0.5, 1.0])),
    makeBufferFloat32(gl, repeat(10, [0.0, 0.5, 0.5, 1.0])),
    makeBufferFloat32(gl, repeat(10, [0.3, 0.3, 0.3, 1.0])),
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
    makeBufferFloat32(gl, [ -0.348,  0.200, 0.0,
                            0.348,  0.200, 0.0,
			    0.000, -0.400, 0.0,
                           ]),
    ];

  var lengths = [ 3, 4, 3 ];

  function renderStep(depth) {
    var mv = mat4.identity(mat4.create())
    gl.uniformMatrix4fv(unifMVMatrix, false, mv);

    // render the shape
    gl.bindBuffer(gl.ARRAY_BUFFER, shapes[depth%shapes.length]);
    gl.vertexAttribPointer(attrVertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, colors[depth%colors.length]);
    gl.vertexAttribPointer(attrVertexColor, 4, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, lengths[depth%lengths.length]);

    // render the branches
    var mr = mat4.identity(mat4.create());
    mr = mat4.rotateZ(mr, mr, Math.PI / 3.0);
    mv = mat4.scale(mv, mv, [0.667, 0.667, 0]);
    mv = mat4.translate(mv, mv, [0.667, 0, 0]);

    depth = depth + 1;
    for(var i = 0; i < 6; ++i) {
      mv = mat4.multiply(mv, mr, mv);
      gl.uniformMatrix4fv(unifMVMatrix, false, mv);
      gl.bindBuffer(gl.ARRAY_BUFFER, shapes[depth%shapes.length]);
      gl.vertexAttribPointer(attrVertexPosition, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, colors[depth%colors.length]);
      gl.vertexAttribPointer(attrVertexColor, 4, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, lengths[depth%lengths.length]);
    }
  }

  var texCurrent = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texCurrent);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512,
      0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  var texNext = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texNext);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512,
      0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  function swapTextures() {
    var tmp = texNext;
    texNext = texCurrent;
    texCurrent = tmp;
  }

  var offdepth = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, offdepth);
  gl.renderbufferStorage(gl.RENDERBUFFER,
      gl.DEPTH_COMPONENT16, 512, 512);

  var offscreen = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, offscreen);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, offdepth);

  var step = 0;

  function render() {
    var aspect = 1.0 * canvas.width / canvas.height;

    gl.bindFramebuffer(gl.FRAMEBUFFER, offscreen);

    gl.viewport(0, 0, 512, 512);
    gl.uniformMatrix4fv(unifPMatrix, false,
        mat4.ortho(mat4.create(), -1, 1, -1, 1, -1, 1));
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    gl.framebufferTexture2D(gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texCurrent, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    for(i = 4; 0 < i; --i) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texNext, 0);
      renderStep(i+step);
      swapTextures();
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniformMatrix4fv(unifPMatrix, false,
        mat4.ortho(mat4.create(), -aspect, aspect, -1, 1, -1, 1));
    gl.clearColor(0.4, 0.4, 0.4, 1.0);

    gl.clear(gl.COLOR_BUFFER_BIT);

    renderStep(0+step);

    ++step;
  }

  render();
  setInterval(render, 200);

  document.gl = gl;
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
