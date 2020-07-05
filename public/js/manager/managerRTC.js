/* eslint-disable import/extensions */
/* eslint-disable no-undef */
import { getJanusUrl, addStream } from '../utility.js';

export default function initializeManagerRTC(roomId, stream) {
  const janusUrl = getJanusUrl();
  let janus;
  let janusHandler;

  Janus.init({
    debug: 'all',
    callback() {
      janus = new Janus({
        server: janusUrl,
        success() {
          janus.attach({
            plugin: 'janus.plugin.videoroom',
            success(pluginHandle) {
              janusHandler = pluginHandle;
              janusHandler.send({
                message: {
                  request: 'join', ptype: 'publisher', room: roomId,
                },
              });
            },
            onmessage(msg, jsep) {
              if (jsep && jsep.type === 'answer') {
                janusHandler.handleRemoteJsep({ jsep });
              }
              if (msg.videoroom === 'joined') {
                janusHandler.createOffer({
                  stream,
                  success(offerJsep) {
                    janusHandler.send({
                      message: { request: 'configure', video: true, audio: true },
                      jsep: offerJsep,
                    });
                  },
                });
              }
            },
            onlocalstream(localStream) {
              const videoTracks = localStream.getTracks().filter((track) => track.kind === 'video');
              videoTracks.forEach((video) => {
                if (typeof video.canvas === 'undefined') {
                  const webcamOutput = document.querySelector('#webcam');
                  addStream(webcamOutput, video);
                }
              });
            },
          });
        },
      });
    },
  });

  $('#minimize-webcam-view').click(() => {
    $('#active-webcam-view').fadeOut(() => $('#inactive-webcam-view').fadeIn());
  });

  $('#inactive-webcam-view img').click(function () {
    $(this).parent().fadeOut(() => $('#active-webcam-view').fadeIn());
  });
}
