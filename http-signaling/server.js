
var server = new HTTPServer(8080);

server.addEventListener('request', function(evt) {
  var response = evt.response;
  var request = evt.request;

  debug('request', request);

  var json = JSON.parse(request.body);
  var offer = new mozRTCSessionDescription(json);

  debug('got offer', json, offer);

  rtc.setRemoteDescription(offer, function() {}, function() {});
  rtc.createAnswer(function(answer) {
    debug('created answer', answer);
    rtc.setLocalDescription(answer);
    rtc.onicecandidate = function(e) {
      debug('onicecandidate', e);
      if (e.candidate === null) {
        response.send(JSON.stringify(rtc.localDescription));
      }
    };
  }, function(err) {});
});

window.addEventListener('beforeunload', function() {
  server.stop();
});

server.start();
debug('server listening');
