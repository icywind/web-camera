// JS reference to the container where the remote feeds belong
let remoteContainer= document.getElementById("remote-container");

/**
 * @name addVideoContainer
 * @param uid - uid of the user
 * @description Helper function to add the video stream to "remote-container"
 */
function addVideoContainer(uid){
    let streamDiv=document.createElement("div"); // Create a new div for every stream
    streamDiv.id=uid;                       // Assigning id to div
    streamDiv.style.transform="rotateY(180deg)"; // Takes care of lateral inversion (mirror image)
    remoteContainer.appendChild(streamDiv);      // Add new div to container
}
/**
 * @name removeVideoContainer
 * @param uid - uid of the user
 * @description Helper function to remove the video stream from "remote-container"
 */
function removeVideoContainer (uid) {
    let remDiv=document.getElementById(uid);
    remDiv && remDiv.parentNode.removeChild(remDiv);
}



document.getElementById("start").onclick = async function () {
    // Client Setup
    // Defines a client for RTC
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    const client2 = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    // Get credentials from the form
    let appId = document.getElementById("app-id").value;
    let channelId = document.getElementById("channel").value;
    let token = document.getElementById("token").value || null;

    // Create local tracks
    // const [localAudioTrack, localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
    const localVideoTrack = await AgoraRTC.createCameraVideoTrack();

    // Initialize the stop button
    initStop(client, localVideoTrack);
    initSend(client);
    initShareScreen(client2);
    
    // Play the local track
    localVideoTrack.play('me');
    // localVideoTrack.play('remote-container');

    // Set up event listeners for remote users publishing or unpublishing tracks
    client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType); // subscribe when a user publishes
        if (mediaType === "video") {
          addVideoContainer(String(user.uid)) // uses helper method to add a container for the videoTrack
          user.videoTrack.play(String(user.uid));
        }
        if (mediaType === "audio") {
          user.audioTrack.play(); // audio does not need a DOM element
        }
    });
    client.on("user-unpublished",  async (user, mediaType) => {
        if (mediaType === "video") {
            removeVideoContainer(user.uid) // removes the injected container
        }
    });

    client.on("stream-message", (uid, payload) => {
        const string = utf8ArrayToString(payload);
        console.log(uid+ " stream message:" + string);
        client.sendMetadata(payload);
    });

    client.on("receive-metadata", (uid, data) => {
        const string = utf8ArrayToString(data);
        console.log(uid+ " meta message:" + string ); 
    });

    // Join a channnel and retrieve the uid for local user
    const _uid = await client.join(appId, channelId, token, null); 
    await client.publish([localVideoTrack]);
};

function initStop(client, localVideoTrack){
    const stopBtn = document.getElementById('stop');
    stopBtn.disabled = false; // Enable the stop button
    stopBtn.onclick = null; // Remove any previous event listener
    stopBtn.onclick = function () {
        client.unpublish(); // stops sending audio & video to agora
        localVideoTrack.stop(); // stops video track and removes the player from DOM
        localVideoTrack.close(); // Releases the resource
        // localAudioTrack.stop();  // stops audio track
        // localAudioTrack.close(); // Releases the resource
        client.remoteUsers.forEach(user => {
            if (user.hasVideo) {
                removeVideoContainer(user.uid) // Clean up DOM
            }
            client.unsubscribe(user); // unsubscribe from the user
        });
        client.removeAllListeners(); // Clean up the client object to avoid memory leaks
        stopBtn.disabled = true;
    }
}

function initSend(client) {
    const sendBtn = document.getElementById('send');
    sendBtn.disabled = false; // Enable the stop button
    sendBtn.onclick = null; // Remove any previous event listener
    sendBtn.onclick = function () {
        var msg = document.getElementById("message").value;
        console.log("sending msg:" + msg);
        client.sendStreamMessage(msg, true);
    }

}

var isSharingScreen = false;
var screenShareTrack = null;

function initShareScreen(client) {
    const shareBtn = document.getElementById('share');
        // Get credentials from the form
        let appId = document.getElementById("app-id").value;
        let channelId = document.getElementById("channel").value;
        let token = document.getElementById("token").value || null;

    shareBtn.disabled = false; // Enable the share button
    shareBtn.onclick = function() {
        shareBtn.textContent = isSharingScreen ? "Share Screen" : "Stop Sharing";
        isSharingScreen = !isSharingScreen;
        if (isSharingScreen) {
            AgoraRTC.createScreenVideoTrack({
                encoderConfig: "1080p_1", optimizationMode: "detail"}
                ).then(localVideoTrack => { 
                    screenShareTrack = localVideoTrack; 
                    client.join(appId, channelId, token, null).then(uid => {
                        client.publish(screenShareTrack);
                    });
                });
        } else {
            if (screenShareTrack) {
                client.unpublish(screenShareTrack);
                client.leave().then();
                screenShareTrack.stop();
                screenShareTrack.close();
                screenShareTrack = null;
            }
        }
    }
}


//meta data
// let b = df(a.metadata);
// this.emit(R.RECEIVE_METADATA, a.uid, b)
// "receive-metadata"
// SEND_METADATA send_metadata

function utf8ArrayToString(aBytes) {
    var sStr = "";
    
    for (var nPart, nLen = aBytes.length, nIdx = 0; nIdx < nLen; nIdx++) {
        nPart = aBytes[nIdx];
        
        sStr += String.fromCharCode(
            nPart > 251 && nPart < 254 && nIdx + 5 < nLen ? /* six bytes */
                /* (nPart - 252 << 30) may be not so safe in ECMAScript! So...: */
                (nPart - 252) * 1073741824 + (aBytes[++nIdx] - 128 << 24) + (aBytes[++nIdx] - 128 << 18) + (aBytes[++nIdx] - 128 << 12) + (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
            : nPart > 247 && nPart < 252 && nIdx + 4 < nLen ? /* five bytes */
                (nPart - 248 << 24) + (aBytes[++nIdx] - 128 << 18) + (aBytes[++nIdx] - 128 << 12) + (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
            : nPart > 239 && nPart < 248 && nIdx + 3 < nLen ? /* four bytes */
                (nPart - 240 << 18) + (aBytes[++nIdx] - 128 << 12) + (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
            : nPart > 223 && nPart < 240 && nIdx + 2 < nLen ? /* three bytes */
                (nPart - 224 << 12) + (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
            : nPart > 191 && nPart < 224 && nIdx + 1 < nLen ? /* two bytes */
                (nPart - 192 << 6) + aBytes[++nIdx] - 128
            : /* nPart < 127 ? */ /* one byte */
                nPart
        );
    }
    
    return sStr;
}

function stringToUtf8ByteArray (str) {
    // TODO(user): Use native implementations if/when available
    var out = [], p = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 128) {
        out[p++] = c;
      } else if (c < 2048) {
        out[p++] = (c >> 6) | 192;
        out[p++] = (c & 63) | 128;
      } else if (
          ((c & 0xFC00) == 0xD800) && (i + 1) < str.length &&
          ((str.charCodeAt(i + 1) & 0xFC00) == 0xDC00)) {
        // Surrogate Pair
        c = 0x10000 + ((c & 0x03FF) << 10) + (str.charCodeAt(++i) & 0x03FF);
        out[p++] = (c >> 18) | 240;
        out[p++] = ((c >> 12) & 63) | 128;
        out[p++] = ((c >> 6) & 63) | 128;
        out[p++] = (c & 63) | 128;
      } else {
        out[p++] = (c >> 12) | 224;
        out[p++] = ((c >> 6) & 63) | 128;
        out[p++] = (c & 63) | 128;
      }
    }
    return out;
  }

