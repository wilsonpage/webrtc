/*jshint esnext:true*/

var RTCPeerConnection = window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

var els = {
  textarea: document.querySelector('textarea'),
  buttons: {
    createOffer: document.querySelector('#create-offer'),
    submitAnswer: document.querySelector('#submit-answer'),
    submitOffer: document.querySelector('#submit-offer')
  },
  videos: {
    self: document.querySelector('#self'),
    remote: document.querySelector('#remote')
  },
};

var rtc = new RTCPeerConnection({ iceservers: [] });
var channel;

rtc.onicecandidate = function(e) {
  debug('onicecandidate', e);
  if (e.candidate === null) {
    els.textarea.value = JSON.stringify(rtc.localDescription);
  }
};

rtc.onnegotiationneeded = function(e) {
  debug('onnegotiationneeded', e);
};

rtc.oniceconnectionstatechange = function(e) {
  debug('oniceconnectionstatechange', e);
};

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

els.buttons.createOffer.addEventListener('click', createOffer);
els.buttons.submitOffer.addEventListener('click', submitOffer);
els.buttons.submitAnswer.addEventListener('click', submitAnswer);

// get a local stream, show it in a self-view and add it to be sent
navigator.mozGetUserMedia({ video: true }, stream => {
  console.log('got stream', stream);
  els.videos.self.mozSrcObject = stream;
  els.videos.self.play();
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

function submitAnswer() {
  var json = JSON.parse(els.textarea.value);
  var offer = new mozRTCSessionDescription(json);
  rtc.setRemoteDescription(offer, function() {}, function() {});
  debug('submitted answer', offer);
}

function debug() {
  arguments[0] = '[gaia-picker-date]  ' + arguments[0];
  console.log.apply(console, arguments);
}
