import { TOOL_CIRCLE, TOOL_LINE, 
    TOOL_BRUSH, TOOL_ERASER, 
    TOOL_PAINT_BUCKET, TOOL_PENCIL, 
    TOOL_SQUARE, TOOL_TRIANGLE } from './tools.js'; 
import Whiteboard from './classes/whiteboard.js';

import { CONFIG } from './peerConfig.js'


window.onload = () => {
    let peer = new Peer(CONFIG);
    let calls = [];
    const url = window.location.pathname;
    const last_slash = url.lastIndexOf('/');
    const manager_id = url.substr(last_slash + 1);
    const messageContainer = document.getElementById("message-container");
    const sendContainer = document.getElementById("send-container");
    const messageInput = document.getElementById("message-input");

    peer.on('open', () => {
        const getUserMedia = navigator.mediaDevices.getUserMedia || 
                             navigator.getUserMedia ||
                             navigator.webkitGetUserMedia ||
                             navigator.mozGetUserMedia ||
                             navigator.msGetUserMedia;

        getUserMedia({ audio: true })
            .then(startLecture)
    })

    function startLecture(stream){
        let whiteboard = new Whiteboard("canvas");
        stream.addTrack(whiteboard.getStream().getTracks()[0])
        let socket = io('/', { query: `id=${manager_id}` });
        socket.on('call', remote_peer_id => {
            let call = peer.call(remote_peer_id, stream)
            calls.push(call)
        });

        socket.on('updateNumOfStudents', num => {
            document.getElementById('specs').innerHTML = num
        });

        socket.on('currentBoard', studentSocketId => {
            socket.emit('currentBoard', {
                board: whiteboard.getImage(),
                studentSocket: studentSocketId
            })
        })

        socket.on('attemptToConnectMultipleManagers', () => {
            stream.getTracks().forEach(function (track) {
                track.stop();
            });
            alert('There is already a manager')
        });

        socket.on('send-to-manager', message => {
            appendMessage(message);
        })

        socket.on('ready', room => {
            whiteboard.initialize();
            const { boards, boardActive } = room.lecture_details
            if(boards.length > 0){
                boards.forEach((boardImg, i) => {
                    createNonActiveBoardElem(boardImg, i === boardActive)
                })
            }else{
                createNonActiveBoardElem(whiteboard.getImage(), true)
            }

            let sharable_url = window.location.href
            sharable_url = sharable_url.substr(0, sharable_url.lastIndexOf('/') + 1)
            sharable_url += room.lecture_details.id
            document.getElementById("copy-share-link").addEventListener('click', e=>{
                let tmp_input = document.createElement('input');
                tmp_input.value = sharable_url;
                document.body.appendChild(tmp_input);
                tmp_input.select()
                document.execCommand("copy");
                document.body.removeChild(tmp_input);
            })

            sendContainer.addEventListener("submit", (e) => {
                e.preventDefault();
            
                const message = messageInput.value;
                appendMessage(`You: ${message}`);
                socket.emit("send-to-guests", room.lecture_details.id, message);
                messageInput.value = "";
            });

            document.querySelector("button#end-lecture").addEventListener('click', e => {
                calls.forEach(call => {
                    call.close()
                })
                calls = []
                socket.emit('lectureEnd')
                window.location = '/';
            })

            // case "download":
            //     var link = document.createElement("a");
            //     link.download = "my-image.png";
            //     link.href = whiteboard.getImage();
            //     link.click();
            //     break;

            document.querySelectorAll("[data-command]").forEach(item => {
                item.addEventListener("click", e => {
                    let command = item.getAttribute("data-command"); // not doing shit here still
                    let currImage = whiteboard.getImage()
                    switch(command){
                        case "undo":
                            whiteboard.undoPaint();
                            break;
                        case "save":
                            whiteboard.boards[whiteboard.currentBoard] = currImage
                            $("[data-page=page]").eq(`${whiteboard.currentBoard}`).find('img').attr('src', currImage)
                            emitBoards()
                            break;
                        case "add-page":
                            whiteboard.boards[whiteboard.currentBoard] = currImage
                            $("[data-page=page]").eq(`${whiteboard.currentBoard}`).find("img").attr('src', currImage)
                            $("[data-page=page]").eq(`${whiteboard.currentBoard}`).show()
                            whiteboard.clearCanvas();
                            createNonActiveBoardElem(whiteboard.getImage(), true)  
                            emitBoards()
                            break;
                        case "remove-page":
                            whiteboard.clearCanvas();
                            if(whiteboard.boards.length > 1){
                                whiteboard.boards.splice(whiteboard.currentBoard, 1);
                                $("[data-page=page]").eq(`${whiteboard.currentBoard}`).remove()
                                whiteboard.currentBoard = whiteboard.boards.length - 1;
                                let newBoardImg = document.createElement("img");
                                newBoardImg.setAttribute("src", whiteboard.boards[whiteboard.currentBoard]);
                                whiteboard.setCurrentBoard(newBoardImg)
                                $("[data-page=page]").eq(`${whiteboard.currentBoard}`).hide()
                            }
                            emitBoards()
                            break;
                        case "clear-page":
                            whiteboard.clearCanvas();
                            break;
                    }
                })
            });
            document.querySelectorAll("[data-tool]").forEach(
                item => (
                    item.addEventListener("click", e => {
                        document.querySelector("[data-tool].active").classList.toggle("active"); // remove the previous active function from the active class
                        
                        item.classList.add("active"); // we add the element we clicked on to the active class
                        
                        //with the tool.class.js created:
                        let selectedTool = item.getAttribute("data-tool");
                        whiteboard.activeTool = selectedTool;

                        switch(selectedTool){
                            //activate shape or line widths group
                            case TOOL_CIRCLE:
                            case TOOL_LINE:
                            case TOOL_SQUARE:
                            case TOOL_TRIANGLE:
                        // case TOOL_PAINT_BUCKET:
                            case TOOL_PENCIL:
                                //make pencil shapes visible
                                document.querySelector(".group.for-shapes").style = "display: block;";
                                //make brush sizes invisible
                                document.querySelector(".group.for-brush").style = "display: none;";
                                break;

                            case TOOL_BRUSH:
                            case TOOL_ERASER:
                                //make pencil shapes invisible
                                document.querySelector(".group.for-shapes").style.display = "none";
                                //make brush selection visible
                                document.querySelector(".group.for-brush").style.display = "block";
                                break;
                            default:
                                //make both line groups invisible
                                document.querySelector(".group.for-shapes").style.display = "none";
                                document.querySelector(".group.for-brush").style.display = "none";
                        }

                    }
                ))
            );

            document.querySelectorAll("[data-line-width]").forEach(
                item => {
                    item.addEventListener("click", e => {
                        document.querySelector("[data-line-width].active").classList.toggle("active"); // remove the previous active function from the active class
                        item.classList.add("active"); // we add the element we clicked on to the active class

                        let lineWidth = item.getAttribute("data-line-width");
                        whiteboard.lineWidth = lineWidth;
                    });
                }
            );

            document.querySelectorAll("[data-brush-size]").forEach(
                item => {
                    item.addEventListener("click", e => {
                        document.querySelector("[data-brush-size].active").classList.toggle("active"); // remove the previous active function from the active class
                        item.classList.add("active"); // we add the element we clicked on to the active class

                        let brushSize = item.getAttribute("data-brush-size");
                        whiteboard.brushSize = brushSize;
                    });
                }
            );

            document.querySelectorAll("[data-color]").forEach(
                item => {
                    item.addEventListener("click", e => {
                        document.querySelector("[data-color].active").classList.toggle("active"); // remove the previous active function from the active class
                        item.classList.add("active"); // we add the element we clicked on to the active class

                        let color = item.getAttribute("data-color");

                        whiteboard.selectedColor = color;
                    });
                }
            );
            
            console.log(room)
        });



        function onClickNonActiveBoardElem(){
            const currentBoardImage = whiteboard.getImage()
            whiteboard.boards[whiteboard.currentBoard] = currentBoardImage
            $("[data-page=page]").eq(`${whiteboard.currentBoard}`).find('img').attr('src', currentBoardImage)
            $("[data-page=page]").eq(`${whiteboard.currentBoard}`).show()

            const clickedBoardIndex = $(this).index()
            whiteboard.currentBoard = clickedBoardIndex
            emitBoards()
            $("[data-page=page]").eq(`${clickedBoardIndex}`).hide()
            let newBoardImg = document.createElement("img");
            newBoardImg.setAttribute("src", whiteboard.boards[clickedBoardIndex]);
            whiteboard.setCurrentBoard(newBoardImg)
        }
    
        function createNonActiveBoardElem(img, isActive){
            //making the new page image
            let newBoardImg = document.createElement("img");
            newBoardImg.setAttribute("src", img);
            //setting the class to item and active
            let outer = document.createElement("div");
            outer.classList.add('item');
            
            outer.setAttribute("data-page", "page");
       
            let inner = document.createElement("div");
            inner.classList.add('swatch');
            inner.style.backgroundColor = "#ffffff";
            
            inner.appendChild(newBoardImg);
            outer.appendChild(inner);
            document.getElementById("pagelist").appendChild(outer);
            whiteboard.boards[whiteboard.boards.length] = img
            outer.addEventListener('click', onClickNonActiveBoardElem.bind(outer))
            if(isActive){
                $(outer).hide();
                whiteboard.currentBoard = whiteboard.boards.length - 1;
                //must defer function to work when opening on new tab
                setTimeout(()=>{
                    whiteboard.setCurrentBoard(newBoardImg);
                }, 0)
             }
       }

       function emitBoards(){
            socket.emit('updateBoards', {
                boards: whiteboard.boards,
                activeBoardIndex: whiteboard.currentBoard
            })
       }

       function appendMessage(message) {
            const messageElement = document.createElement("tr");
            const tableData = document.createElement("td");
            tableData.innerText = message;
      
            messageElement.append(tableData);
            messageContainer.append(messageElement);
        }
    }
}
