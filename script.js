let peerConnection;
let dataChannel;
let isBro = false;

const broButton = document.getElementById("bro-button");
const raaButton = document.getElementById("raa-button");
const connectButton = document.getElementById("connect-button");
const sendButton = document.getElementById("send-button");

const codeOutput = document.getElementById("code-output");
const codeInput = document.getElementById("code-input");

const messageInput = document.getElementById("message-input");
const chatBox = document.getElementById("chat-box");
const statusIndicator = document.getElementById("status-indicator");

// Utility to wait for ICE gathering to finish
function waitForIceGathering(pc) {
    return new Promise((resolve) => {
        if (pc.iceGatheringState === "complete") {
            resolve();
        } else {
            const checkState = () => {
                if (pc.iceGatheringState === "complete") {
                    pc.removeEventListener("icegatheringstatechange", checkState);
                    resolve();
                }
            };
            pc.addEventListener("icegatheringstatechange", checkState);
        }
    });
}

// Utility to add chat messages
function addMessage(sender, message) {
    const p = document.createElement("p");
    p.innerHTML = `<strong>${sender}:</strong> ${message}`;
    chatBox.appendChild(p);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Update status indicator
function updateStatus(color) {
    statusIndicator.style.backgroundColor = color;
}

// Setup data channel events
function setupDataChannel(channel) {
    dataChannel = channel;

    dataChannel.onopen = () => {
        updateStatus("green");
        addMessage("System", "Connection opened.");
    };

    dataChannel.onmessage = (event) => {
        const sender = isBro ? "Raa" : "Bro";
        addMessage(sender, event.data);
    };

    dataChannel.onclose = () => {
        updateStatus("red");
        addMessage("System", "Connection closed.");
    };
}

// BRO: Create offer and data channel
broButton.onclick = async () => {
    isBro = true;
    updateStatus("red");

    peerConnection = new RTCPeerConnection();
    const channel = peerConnection.createDataChannel("chat");
    setupDataChannel(channel);

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    await waitForIceGathering(peerConnection);
    const offerSDP = JSON.stringify(peerConnection.localDescription);
    const encodedOffer = btoa(offerSDP);
    codeOutput.value = encodedOffer;

    peerConnection.oniceconnectionstatechange = () => {
        if (peerConnection.iceConnectionState === "connected") {
            updateStatus("green");
        }
    };
};

// RAA: Accept offer and create answer
connectButton.onclick = async () => {
    isBro = false;
    updateStatus("red");

    const offer = JSON.parse(atob(codeInput.value));
    peerConnection = new RTCPeerConnection();

    peerConnection.ondatachannel = (event) => {
        setupDataChannel(event.channel);
    };

    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    await waitForIceGathering(peerConnection);
    const answerSDP = JSON.stringify(peerConnection.localDescription);
    const encodedAnswer = btoa(answerSDP);
    codeOutput.value = encodedAnswer;

    peerConnection.oniceconnectionstatechange = () => {
        if (peerConnection.iceConnectionState === "connected") {
            updateStatus("green");
        }
    };
};

// BRO: Finish connection by pasting RAA's answer
raaButton.onclick = async () => {
    if (!peerConnection) return;
    const answer = JSON.parse(atob(codeInput.value));
    await peerConnection.setRemoteDescription(answer);
};

// Send chat message
sendButton.onclick = () => {
    const message = messageInput.value.trim();
    if (message && dataChannel && dataChannel.readyState === "open") {
        dataChannel.send(message);
        addMessage("You", message);
        messageInput.value = "";
    }
};
