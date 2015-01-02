(function() {
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
  console.log('onpeerfound', e);
  els.body.addEventListener('click', sendOffer);
  els.steps.touchDevices.hidden = true;
  els.steps.tapToCall.hidden = false;
  peer = e.peer;
};

// This callback isn't firing
navigator.mozNfc.onpeerlost = function(e) {
  console.log('onpeerlost', e);
  els.body.removeEventListener('click', sendOffer);
  els.steps.touchDevices.hidden = false;
  els.steps.tapToCall.hidden = true;
  peer = null;
};

// get a local stream, show it in a self-view and add it to be sent
navigator.mozGetUserMedia({ video: true }, function(stream) {
  console.log('got stream', stream);
  els.videos.self.mozSrcObject = stream;
  els.videos.self.play();
  rtc.addStream(stream);
}, function(err) {});

// Run when connection is established
rtc.ondatachannel = function(e) {
  debug('ondatachannel', e);
  channel = e.channel || e; // Chrome sends event, FF sends raw channel
  channel.onopen = function (e) { debug('onopen', e); };
  channel.onmessage = function (e) { debug('onmessage', e); };
};

// Once remote stream arrives, show
// it in the remote video element
rtc.onaddstream = function(e) {
  els.videos.remote.mozSrcObject = e.stream;
  els.videos.remote.play();
  els.steps.tapToCall.hidden = true;
};

function sendOffer() {
  createOffer(function(offer) {
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
  channel.onopen = function (e) { debug('onopen', e); };
  channel.onmessage = function (e) { debug('onmessage', e); };

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

})();