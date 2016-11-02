// dimensions of our map texture (before distorting to 256x256)
var downtown_w = 1218;
var downtown_h = 680;

// lat/lng info for our map
var map_center = {
    lat: 37.8703,
    lng: -122.2691
};
var map_scale = { // canvas goes from -1.0 to 1.0.
    dLat: 37.8703 - 37.8688,
    dLng: -122.2691 - -122.2723,
};
var compeer_loc = {
    lat: map_center.lat + 0.001,
    lng: map_center.lng + 0.001,
}

hexen = {
    bamp: { lat: 37.8716, lng: -122.2664, ti: "Oxford &amp; Addison",
	    pw: 'ucpd' },
    brow: { lat: 37.8695, lng: -122.2666, ti: "Brower Center, Allston Way",
	    pw: 'area' },
    clok: { lat: 37.8690, lng: -122.2680, ti: "Clock, Shattuck &amp; Allston",
	    pw: 'bike' },
    colg: { lat: 37.8699, lng: -122.2699, ti: "City College, Center St.",
	    pw: 'make' },
    drum: { lat: 37.8696, lng: -122.2717, ti: "MLK Park, Center St.",
	    pw: 'idea' },
    fork: { lat: 37.8702, lng: -122.2679, ti: "Shattuck &amp; Center",
	    pw: 'wind' },
    pasg: { lat: 37.8702, lng: -122.2691, ti: "Arts Passage, Center St.",
	    pw: 'arts' },
    plnt: { lat: 37.8699, lng: -122.2663, ti: "Allston Place, Allston Way",
	    pw: 'main' },
    poem: { lat: 37.8710, lng: -122.2693, ti: "The World, Center St.",
	    pw: 'gong' },
    vine: { lat: 37.8696, lng: -122.2673, ti: "Trumpetvine Court",
	    pw: 'muse' },
};

for (hid in hexen) {
    hexen[hid].loc = ll2canvas(hexen[hid].lat, hexen[hid].lng)
    hexen[hid].signal = false;
}

function ll2canvas(lat, lng) {
    return {
	x: (lng - map_center.lng) / map_scale.dLng,
	y: (lat - map_center.lat) / map_scale.dLat,
    }
}

var textures = {};
var i = new Image();
i.src = './downtown_map_stretched.jpg';
i.onload = function() {
  textures.downtown_map = i;
}

var gl = {}; // webGL context
var glv = {}; // GL variables holder
var shaderPrograms = {};

function getBitmapShaderProgram() {
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, 'precision mediump float; uniform sampler2D tex; varying vec2 tex_pos; void main() { gl_FragColor = texture2D(tex, tex_pos); }');
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {  
	alert('An error occurred compiling frag shader: ' + gl.getShaderInfoLog(fragmentShader));
    }
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, 'attribute vec2 pos; uniform vec2 grid_center_pos; uniform float icon_radius; uniform vec2 tex_center; varying vec2 tex_pos; void main() { gl_Position = vec4(grid_center_pos + icon_radius * pos, 0, 1); tex_pos.x = (pos.x / 2.0) + 0.5 ; tex_pos.y = 0.5 - (pos.y / 2.0) ; }');
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {  
	alert('An error occurred compiling vert shader: ' + gl.getShaderInfoLog(vertexShader));  
    }
  
    // Create the shader program
    bitmapShaderProgram = gl.createProgram();
    gl.attachShader(bitmapShaderProgram, vertexShader);
    gl.attachShader(bitmapShaderProgram, fragmentShader);
    gl.linkProgram(bitmapShaderProgram);
  
    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(bitmapShaderProgram, gl.LINK_STATUS)) {
	alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(bitmapShaderProgram));
    }

    // variables "exported" by program
    glv.grid_center_pos = gl.getUniformLocation(bitmapShaderProgram, 'grid_center_pos');
    glv.icon_radius = gl.getUniformLocation(bitmapShaderProgram, 'icon_radius');
    glv.tex_center = gl.getUniformLocation(bitmapShaderProgram, 'tex_center');
    glv.pos = gl.getUniformLocation(bitmapShaderProgram, 'pos');

    return bitmapShaderProgram;
}

function getPolyShaderProgram() {
  var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, 'precision mediump float; uniform vec4 poly_color; void main() { gl_FragColor = poly_color; }');
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {  
      alert('An error occurred compiling frag shader: ' + gl.getShaderInfoLog(fragmentShader));
  }
  var vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, 'attribute vec2 poly_vert_pos; void main() { gl_Position = vec4(poly_vert_pos, 0, 1); }');
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {  
      alert('An error occurred compiling vert shader: ' + gl.getShaderInfoLog(vertexShader));  
  }
  
  // Create the shader program
  
  polyShaderProgram = gl.createProgram();
  gl.attachShader(polyShaderProgram, vertexShader);
  gl.attachShader(polyShaderProgram, fragmentShader);
  gl.linkProgram(polyShaderProgram);
  
  // If creating the shader program failed, alert
  if (!gl.getProgramParameter(polyShaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shader));
  }
  
  // variables "exported" by program
  glv.poly_vert_pos = gl.getAttribLocation(polyShaderProgram, 'poly_vert_pos');
  glv.poly_color = gl.getUniformLocation(polyShaderProgram, 'poly_color');

  return polyShaderProgram;
}

function initGL() {
    gl = document.getElementById('glcanvas').getContext('webgl');

    shaderPrograms.bitmap = getBitmapShaderProgram();
    shaderPrograms.poly = getPolyShaderProgram();
}

function initChecklist() {
    var helper = function(hid) {
	var d = $('<button class="ui-btn" id="btn' + hid + '" data-rel="popup">' + hexen[hid].ti +'</button>');
	var f = function() {
	    showDeets(hid);
	}
	d.click(f);
	d.appendTo($('#checklist'));
    }
    for (hid in hexen) {
	helper(hid);
    }
}

function showDeets(hid) {
    $('#deetstitle').html(hexen[hid].ti)
    if (locblurb && locblurb[hid]) {
	$('#deetsblurb').html(locblurb[hid]);
    } else {
	$('#deetsblurb').html('NOTHING HERE YET, SORRY. MAYBE CLICK <b>Oxford &amp; Addison</b> INSTEAD ' + hid);
    }
    $('#deetssplash').attr('src', '' + hid + '.jpg')
    $('#deets').show();
}

function drawMapBackground() {
    if (!textures.downtown_map) { return; }
    gl.useProgram(shaderPrograms.bitmap);

   var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(glv.circle_pos);
    gl.vertexAttribPointer(glv.circle_pos, 2, gl.FLOAT, false, 0, 0);
    
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textures.downtown_map);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.bufferData(
        gl.ARRAY_BUFFER,
	new Float32Array([
		-1.0, -1.0,
		-1.0,  1.0,
	        1.0, -1.0,

                1.0,  1.0,
                1.0, -1.0,
                -1.0,  1.0
	]),
        gl.STATIC_DRAW);
    gl.uniform1f(glv.icon_radius, 1.0);

    gl.uniform2f(glv.grid_center_pos, 0, 0);
    gl.uniform2f(glv.tex_center, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function drawMapSignalHexen() {
    var signalPeriod_ms = 1024;
    var hexSize = 0.05;
    gl.useProgram(shaderPrograms.poly);

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(glv.poly_vert_pos);
    gl.vertexAttribPointer(glv.poly_vert_pos, 2, gl.FLOAT, false, 0, 0);

    gl.uniform4f(glv.poly_color, 0.4, 0.4, 0.9, 1);
    gl.lineWidth(0.5);

    xScale = downtown_h / downtown_w;
    timeScale = (Date.now() % signalPeriod_ms) / signalPeriod_ms;
    if (timeScale < 0.5) {
	timeScale = 1.0 - timeScale;
    }
    yDel = hexSize * timeScale;
    xDel = yDel * xScale;

    for (hid in hexen) {
	h = hexen[hid];
	if (!h.signal) { continue; }
	gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
		h.loc.x - 2 * xDel, h.loc.y - yDel,
		h.loc.x - 2 * xDel, h.loc.y + yDel,
		h.loc.x + 0.0     , h.loc.y + 2 * yDel,
		h.loc.x + 2 * xDel, h.loc.y + yDel,
		h.loc.x + 2 * xDel, h.loc.y - yDel,
		h.loc.x - 0.0     , h.loc.y - 2 * yDel,
		h.loc.x - 2 * xDel, h.loc.y - yDel,
            ]),
            gl.STATIC_DRAW);
	gl.drawArrays(gl.LINE_STRIP, 0, 7);
    }

    gl.uniform4f(glv.poly_color, 0.6, 0.0, 0.6, 1);
    yDel = hexSize * (0.25 + Math.random());
    xDel = yDel * xScale * (0.61 + Math.random());

    for (hid in hexen) {
	h = hexen[hid];
	if (h.signal) { continue; }
	gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
		h.loc.x - 2 * xDel, h.loc.y - yDel,
		h.loc.x - 2 * xDel, h.loc.y + yDel,
		h.loc.x + 0.0     , h.loc.y + 2 * yDel,
		h.loc.x + 2 * xDel, h.loc.y + yDel,
		h.loc.x + 2 * xDel, h.loc.y - yDel,
		h.loc.x - 0.0     , h.loc.y - 2 * yDel,
		h.loc.x - 2 * xDel, h.loc.y - yDel,
            ]),
            gl.STATIC_DRAW);
	gl.drawArrays(gl.LINE_STRIP, 0, 7);
    }
}

function drawMapCompeer() {
    var starSize = 0.05;
    var yDel = starSize / 3;
    var xScale = downtown_h / downtown_w;
    var xDel = yDel * xScale;

    gl.useProgram(shaderPrograms.poly);

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(glv.poly_vert_pos);
    gl.vertexAttribPointer(glv.poly_vert_pos, 2, gl.FLOAT, false, 0, 0);

    gl.uniform4f(glv.poly_color, 0.0, 0.9, 0.0, 1);
    gl.lineWidth(0.5);

    var c = ll2canvas(compeer_loc.lat, compeer_loc.lng);

    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
	    c.x + 0 * xDel, c.y + 3 * yDel,
	    c.x + 1 * xDel, c.y + 1 * yDel,
	    c.x + 3 * xDel, c.y + 0 * yDel,
	    c.x + 1 * xDel, c.y - 1 * yDel,
	    c.x + 0 * xDel, c.y - 3 * yDel,
	    c.x - 1 * xDel, c.y - 1 * yDel,
	    c.x - 3 * xDel, c.y + 0 * yDel,
	    c.x - 1 * xDel, c.y + 1 * yDel,
	    c.x + 0 * xDel, c.y + 3 * yDel,
        ]),
        gl.STATIC_DRAW);
    gl.drawArrays(gl.LINE_STRIP, 0, 9);
}

function drawMap() {
    drawMapBackground();
    drawMapSignalHexen();
    drawMapCompeer();
}

function checkPW() {
    var guess = $('#deetspw').val().toLowerCase();
    if (!guess) { return; }
    for (hid in hexen) {
	if (guess == hexen[hid].pw) {
	    $('#deetspw').val('')
	    $('#btn' + hid).prop('disabled', true)
	    hexen[hid].signal = true;
	    $('#deets').hide()
	    setTimeout(checkTriumph, 5 * 1000);
	    return
	}
    }
    $('#deetspw').val('????');
}

function checkTriumph() {
    for (hid in hexen) {
	if (!hexen[hid].signal) {
	    return
	}
    }
    $('#checklist').html('<p>∿∿∿Wow, you got &apos;em all. Something not-so-anticlimatic as this should probably happen.∿∿∿')
}

function tick() {
    drawMap();
}

function pace() {
    navigator.geolocation.getCurrentPosition(function(pos) {
	compeer_loc = {
	    lat: pos.coords.latitude,
	    lng: pos.coords.longitude,
	}
    });
}

$(document).ready(function() {
    initGL();
    initChecklist();
    $(window).resize(function(e) {
	$('#glcanvas').height($('#glcanvas').width() * 680 / 1218);
    });

    $("#deetscancel").click(function() {
	$('#deets').hide();
    });
    $('#deetspw').keydown(function(e){
	if (e.keyCode && e.keyCode == 13) {
	    checkPW();
	    return false
	}
    });
    $('#deetsenterpw').click(checkPW);

    setInterval(tick, 1000/60);
    setInterval(pace, 10 * 1000);
})