// dimensions of our map texture (before distorting to 256x256)
var downtown_w = 948;
var downtown_h = 680;

// lat/lng info for our map
var map_center = {
    lat: 37.8703,
    lng: -122.2683
};
var map_scale = { // canvas goes from -1.0 to 1.0.
    dLat: 37.8703 - 37.8688,
    dLng: -122.2683 - -122.2709,
};
var compeer_loc = {
    lat: map_center.lat + 0.001,
    lng: map_center.lng + 0.001,
}

hexen = {
    bamp: { lat: 37.8716, lng: -122.2664, ti: "Oxford &amp; Addison" },
    brow: { lat: 37.8695, lng: -122.2666, ti: "Brower Center, Allston Way" },
    clok: { lat: 37.8690, lng: -122.2680, ti: "Clock, Shattuck &amp; Allston" },
    colg: { lat: 37.8699, lng: -122.2699, ti: "City College, Center St." },
    fork: { lat: 37.8702, lng: -122.2679, ti: "Shattuck &amp; Center" },
    pasg: { lat: 37.8702, lng: -122.2691, ti: "Arts Passage, Center St." },
    poem: { lat: 37.8710, lng: -122.2693, ti: "The World, Addison St." },
    vine: { lat: 37.8696, lng: -122.2673, ti: "Trumpetvine Court" },
};
signal = {}

for (hid in hexen) {
    hexen[hid].loc = ll2canvas(hexen[hid].lat, hexen[hid].lng)
    signal[hid] = '';
    var a = new Audio();
    a.src = './HID.mp3'.replace(/HID/, hid);
    hexen[hid].preloadaudio = a;
}
var preLoadWalk = new Audio();
preLoadWalk = './walk.mp3';

var loc = ''; // most recent location we "visited" (pressed the button for)

function ll2canvas(lat, lng) {
    return {
	x: (lng - map_center.lng) / map_scale.dLng,
	y: (lat - map_center.lat) / map_scale.dLat,
    }
}

// km betwen two lat/lng locs
function distanceLL(lat1, lng1, lat2, lng2) {
    var dXKm = (lng1 - lng2) *  88.5;
    var dYKm = (lat1 - lat2) * 111.1;
    return Math.sqrt((dXKm * dXKm) + (dYKm * dYKm));
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

// for GL things, a square made of 2 triangles
var sqF32Array = new Float32Array([ 
		-1.0, -1.0,
		-1.0,  1.0,
	        1.0, -1.0,

                1.0,  1.0,
                1.0, -1.0,
                -1.0,  1.0
	])

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
	var t = signal[hid] || hexen[hid].ti;
	var cls = '';
	if (signal[hid]) {
	    cls = 'class="signaled" '
	}
	var d = $('<button ' + cls + ' id="btn' + hid + '" data-rel="popup"><span class="prox">∿</span>' + t +'<span class="prox">∿</span></button><br>');
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
    loc = hid;
    $('#deetstitle').html(hexen[hid].ti)
    if (locblurb && locblurb[hid]) {
	$('#deetsblurb').html(locblurb[hid]);
    } else {
	$('#deetsblurb').html('NOTHING HERE YET, SORRY. MAYBE CLICK <b>Oxford &amp; Addison</b> INSTEAD ' + hid);
    }
    $('#deetsaud').attr('src', './HID.mp3'.replace(/HID/, hid));
    $('#deetssplash').attr('src', './HID.jpg'.replace(/HID/, hid));
    if (signal[hid]) {
	$('#deetspw').prop("disabled", true).val(signal[hid]);
	$('#deetsenterpw').hide();
    } else {
	$('#deetspw').prop("disabled", false).val('');
	$('#deetsenterpw').show();
    }
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
	sqF32Array,
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
	if (!signal[hid]) { continue; }
	gl.bufferData(
            gl.ARRAY_BUFFER,
            Float32Array.from([
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

    gl.uniform4f(glv.poly_color, 0.9, 0.7, 1.0, 1);
    yDel = hexSize * (0.25 + Math.random());
    xDel = yDel * xScale * (0.61 + Math.random());

    for (hid in hexen) {
	h = hexen[hid];
	if (signal[hid]) { continue; }
	gl.bufferData(
            gl.ARRAY_BUFFER,
            Float32Array.from([
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
        Float32Array.from([
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

function enterPhrase() {
    var inp = $('#deetspw').val();
    if (!inp) { return; }
    inp = inp.replace('&', '&amp;').replace('<', '&lt;');
    signal[loc] = inp;
    localStorage.signal = JSON.stringify(signal);
    helper = function(hid) {
	$('#deets').animate(
	    {"opacity": 0},
	    {
		duration: 1 * 1000,
		always: function() {
		    $('#deetsaud').get(0).pause();
		    $('#deetspw').val('');
		    $('#btn' + hid).addClass('signaled').html('<span class="prox">∿</span>' + inp +'<span class="prox">∿</span>')
		    $('#deets').hide();
		    $('#deets').css({"opacity": 1});
		},
	    });
	setTimeout(checkTriumph, 5 * 1000);
    };
    helper(loc);
}

function checkTriumph() {
    for (hid in hexen) {
	if (!signal[hid]) {
	    return
	}
    }
    $('#mapholder').html('<center><p>∿∿∿The time to follow maps has passed.∿∿∿ <p>&nbsp;<p>∿∿∿Listen to this:∿∿∿<p><audio id="walkaud" src="./walk.mp3" controls></center>')
}

function tick() {
    if (document.hidden) {
	return
    }
    drawMap();
}

function pace() {
    navigator.geolocation.getCurrentPosition(function(pos) {
	compeer_loc = {
	    lat: pos.coords.latitude,
	    lng: pos.coords.longitude,
	}
	$('.prox').html('∿');
	var best_hid = '';
	var best_dist = 100.0;
	for (hid in hexen) {
	    var sel = "#btnHID".replace(/HID/, hid);
	    $(sel).css({
		"font-size": "normal",
		"font-weight": "normal",
		"padding": "2px",
	    });
	    if (distanceLL(pos.coords.latitude, pos.coords.longitude, hexen[hid].lat, hexen[hid].lng) < best_dist) {
		best_hid = hid;
		best_dist = distanceLL(pos.coords.latitude, pos.coords.longitude, hexen[hid].lat, hexen[hid].lng);
	    }
	}
	if (best_hid) {
	    var sel = "#btnHID".replace(/HID/, best_hid);
	    $(sel).css({
		"font-size": "xx-large",
		"font-weight": "bold",
		"padding": "12px",
	    });
	    $(sel + ' .prox').html('<span style="color: #0a0; background-color: #dfd;">✧</span>')
	}
    });
}

$(document).ready(function() {
    if (localStorage && localStorage.signal) {
	signal = JSON.parse(localStorage.signal);
    }
    initGL();
    initChecklist();
    $(window).resize(function(e) {
	$('#glcanvas').height($('#glcanvas').width() * downtown_h / downtown_w);
    });
    $('#glcanvas').height($('#glcanvas').width() * downtown_h / downtown_w);

    $("#deetscancel").click(function() {
	$('#deets').hide();
	$('#deetsaud').get(0).pause();
    });
    $('#deetspw').keydown(function(e){
	if (e.keyCode && e.keyCode == 13) {
	    enterPhrase();
	    return false
	}
    });
    $('#deetsenterpw').click(enterPhrase);

    setInterval(tick, 1000/60);
    setInterval(pace, 10 * 1000);
    setTimeout(checkTriumph, 5 * 1000);
})
