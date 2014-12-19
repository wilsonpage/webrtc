/*jshint esnext:true*/

var RTCPeerConnection = window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

var els = {
  input: document.querySelector('input'),
  buttons: { connect: document.querySelector('#connect') },
  ip: document.querySelector('h1'),
  videos: {
    self: document.querySelector('#self'),
    remote: document.querySelector('#remote')
  }
};

var rtc = new RTCPeerConnection({ iceservers: [] });
var channel;

els.buttons.connect.addEventListener('click', onSubmit);

IPUtils.getAddresses(function(ip) {
  debug('got ip address');
  els.ip.textContent = ip;
});

function onSubmit() {
  var address = 'http://' + els.input.value;

  channel = rtc.createDataChannel('test', { reliable: true });

  channel.onopen = function (e) { debug('onopen', e); };
  channel.onmessage = function (e) { debug('onmessage', e); };

  rtc.createOffer(function(offer) {
    debug('created offer', offer);

    rtc.onicecandidate = function(e) {
      debug('onicecandidate', e);
      if (e.candidate === null) {

        var json = JSON.stringify(rtc.localDescription);
        var xhr = new XMLHttpRequest({ mozSystem: true });

        xhr.open('POST', address);
        xhr.send(json);
        xhr.onload = function(e) {
          var json = JSON.parse(this.response);
          submitAnswer(json);
        };

        xhr.onerror = function(err) {
          debug('xhr.onerror');
          console.log(err);
        };

        console.log('sent POST to: ' + address);
      }
    };

    rtc.setLocalDescription(offer, function() {}, function() {});
  }, function(err) {});
}

rtc.ondatachannel = function(e) {
  debug('ondatachannel', e);

  channel = e.channel || e; // Chrome sends event, FF sends raw channel

  channel.onopen = function (e) {
    debug('onopen', e);
  };

  channel.onmessage = function (e) {
    debug('onmessage', e);
  };
};

// once remote stream arrives, show it in the remote video element
rtc.onaddstream = function(e) {
  els.videos.remote.mozSrcObject = e.stream;
  els.videos.remote.play();
};

// get a local stream, show it in a self-view and add it to be sent
navigator.mozGetUserMedia({ video: true }, stream => {
  console.log('got stream', stream);
  // els.videos.self.mozSrcObject = stream;
  // els.videos.self.play();
  rtc.addStream(stream);
}, err => {});

function createOffer() {
  channel = rtc.createDataChannel('test', { reliable: true });

  channel.onopen = function (e) {
    debug('onopen', e);
  };

  channel.onmessage = function (e) {
    debug('onmessage', e);
  };

  rtc.createOffer(function(offer) {
    rtc.setLocalDescription(offer, function() {}, function() {});
    var json = JSON.stringify(offer);
    debug('created offer', offer);
  }, function(err) {});
}

function submitOffer() {
  var json = JSON.parse(els.textarea.value);
  var offer = new mozRTCSessionDescription(json);
  debug('submit offer', json, offer);
  rtc.setRemoteDescription(offer, function() {}, function() {});
  rtc.createAnswer(function(answer) {
    rtc.setLocalDescription(answer);
    debug('created answer', answer);
  }, function(err) {});
}

function submitAnswer(json) {
  var offer = new mozRTCSessionDescription(json);
  rtc.setRemoteDescription(offer, function() {}, function() {});
  debug('submitted answer', offer);
}

function debug() {
  var output = document.querySelector('.debug');
  var li = document.createElement('li');
  arguments[0] = '[debug]  ' + arguments[0];
  console.log.apply(console, arguments);
  li.textContent = arguments[0];
  if (output) output.appendChild(li);
}
