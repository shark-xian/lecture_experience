window.onload = () => {
    let peer = new Peer();
    const url = window.location.pathname;
    const last_slash = url.lastIndexOf('/');
    const room_id = url.substr(last_slash + 1);

    peer.on('open', peer_id => {
        let socket = io('/', {
            query: `id=${room_id}&peer_id=${peer_id}`
        });

        socket.on('ready', room => {
            console.log(room)
        });

        socket.on('disconnect', (e) => {
            console.log(e)
        })

        socket.on('updateNumOfStudents', num => {
            document.getElementById('specs').innerHTML = num
        });

        socket.on('notifyPeerIdToManager', manager_socket_id => {
            socket.emit('notify', manager_socket_id)
        })

        peer.on('call', call => {
            call.on('stream', stream => {
                let speaker = document.getElementById('speaker')
                let whiteboard = document.getElementById('whiteboard')
                startStream(speaker, stream.getAudioTracks()[0])
                startStream(whiteboard, stream.getVideoTracks()[0])
            })
            call.answer(null)
        })
    });
}

function startStream(html_elem, stream_track){
    let stream = new MediaStream()
    stream.addTrack(stream_track)
    if ("srcObject" in html_elem) {
        html_elem.srcObject = stream;
    } else {
        html_elem.src = window.URL.createObjURL(stream);
    }
}
