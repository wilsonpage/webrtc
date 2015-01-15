/*jshint esnext:true*/
/*jshint browser:true*/
/*global MozNDEFRecord*/
/*global mozRTCSessionDescription*/
/*global TextEncoder*/
/*global console*/

'use strict';

var RTCPeerConnection = window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
var rtc = new RTCPeerConnection({ iceservers: [] });
var debug = console.log.bind(console);
var mozCamera;
var channel;
var peer;

var els = {
  body: document.body,
  steps: {
    tapToCall: document.querySelector('.step-tap-to-call'),
    touchDevices: document.querySelector('.step-touch-devices')
  },
  videos: {
    self: document.querySelector('.video-self'),
    remote: document.querySelector('.video-remote')
  },
};

// Run when devices touch
navigator.mozNfc.onpeerfound = function(e) {
  debug('onpeerfound', e);
  els.body.addEventListener('click', sendOffer);
  els.steps.touchDevices.hidden = true;
  els.steps.tapToCall.hidden = false;
  peer = e.peer;
};

// This callback isn't firing
navigator.mozNfc.onpeerlost = function(e) {
  debug('onpeerlost', e);
  els.body.removeEventListener('click', sendOffer);
  els.steps.touchDevices.hidden = false;
  els.steps.tapToCall.hidden = true;
  peer = null;
};

// get a local stream, show it in a self-view and add it to be sent
navigator.mozCameras.getCamera('back', {})
  .then((result) => {
    debug('got camera', result);
    mozCamera = result.camera;
    els.videos.self.mozSrcObject = mozCamera;
    els.videos.self.play();
    rtc.addStream(mozCamera);
  })
  .catch((err) => {
    console.error(err);
  });

// Run when connection is established
rtc.ondatachannel = function(e) {
  debug('ondatachannel', e);
  channel = e;
  onChannel(channel);
};

// Once remote stream arrives, show
// it in the remote video element
rtc.onaddstream = function(e) {
  debug('on add stream', e);
  els.videos.remote.mozSrcObject = e.stream;
  els.videos.remote.play();
  els.steps.tapToCall.hidden = true;
  els.steps.touchDevices.hidden = true;
};

function sendOffer() {
  createOffer(function(offer) {
    debug('sending offer');
    peer.sendNDEF([new MozNDEFRecord({
      tnf: 'well-known',
      type: fromUtf8('T'),
      payload: fromUtf8(JSON.stringify(offer))
    })]);
  });
}

navigator.mozSetMessageHandler('activity', function(e) {
  debug('activity', e);

  var record = e.source.data.records[0];
  var json = JSON.parse(toUtf8(record.payload));
  var desc = new mozRTCSessionDescription(json);

  els.body.removeEventListener('click', sendOffer);

  // Prevent further NFC events callbacks firing
  navigator.mozNfc.onpeerfound = null;
  navigator.mozNfc.onpeerlost = null;

  switch(json.type) {
    case 'offer': return onOffer(desc);
    case 'answer': return onAnswer(desc);
  }
});

function onOffer(offer) {
  debug('on offer', offer);
  acceptOffer(offer, function(answer) {
    peer.sendNDEF([new MozNDEFRecord({
      tnf: 'well-known',
      type: fromUtf8('T'),
      payload: fromUtf8(JSON.stringify(answer))
    })]);
  });
}

function onAnswer(answer) {
  debug('on answer', answer);
  rtc.setRemoteDescription(answer, function() {}, function() {});
}

function createOffer(done) {
  channel = rtc.createDataChannel('test', { reliable: true });
  onChannel(channel);

  rtc.createOffer(function(offer) {
    debug('created offer', offer);

    rtc.onicecandidate = function(e) {
      debug('onicecandidate', e);
      if (e.candidate === null) done(rtc.localDescription);
    };

    rtc.setLocalDescription(offer, function() {}, function() {});
  }, function(err) {});
}

function acceptOffer(offer, done) {
  debug('accept offer', offer);

  rtc.setRemoteDescription(offer, function() {}, function() {});
  rtc.createAnswer(function(answer) {
    debug('created answer', answer);

    rtc.onicecandidate = function(e) {
      debug('onicecandidate', e);
      if (e.candidate === null) done(rtc.localDescription);
    };

    rtc.setLocalDescription(answer, function() {}, function() {});
  }, function(err) {});
}

function onChannel(channel) {
  channel.onopen = function (e) { debug('onopen', e); };
  channel.onmessage = function (e) { debug('onmessage', e); };
}

/**
 * Utils
 */

function fromUtf8(str) {
  var enc = new TextEncoder('utf-8');
  return enc.encode(str);
}

function toUtf8(str) {
  var dec = new TextDecoder('utf-8');
  return dec.decode(str);
}
