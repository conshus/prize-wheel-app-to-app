// client-side js, loaded by index.html
// run by the browser each time the page is loaded

// const VonageClient = window.NexmoClient;

console.log("vonageClientSDK: ", vonageClientSDK);

console.log(
  "hello world :o",
  window.location.href.toLowerCase().split("prizewheel/")[1],
);
const conversationId =
  "CON-" + window.location.href.toLowerCase().split("prizewheel/")[1];

const loginContainer = document.querySelector("#loginContainer");
const loginForm = document.querySelector("form");
const errorStatus = document.querySelector("#errorStatus");

const appToAppContainer = document.querySelector("#appToAppContainer");
const hangupButton = document.getElementById("hangup");
const statusElement = document.getElementById("status");

const logs = document.getElementById("logs");

import confetti from "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/+esm";
const qrCode = document.querySelector("sl-qr-code");
const qrCodeButton = document.querySelector("#qr-code-button");
const qrCodeDialog = document.querySelector("#qr-code-dialog");

const prizeWheelEl = document.querySelector("prize-wheel");
const spinBtn = document.querySelector("#spin");
const resetBtn = document.querySelector("#reset");

const winnerDialog = document.querySelector("#winner-dialog");
const winnerName = document.querySelector("#winner-name");

let participants = [];

let client;
let callId;
let winner;

let acceptingSubmissions = false;

loginForm.elements.username.value = "admin";
qrCode.value = window.location.href.replace("prizewheel", "participant");

async function postData(url = "", data = {}) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    // console.log('response.status: ',response.status)
    // console.dir('response: ',response)
    return response.json(); // parses JSON response into native JavaScript objects
  } catch (error) {
    console.error("Error: ", error);
  }
}

function handleEvent(event) {
  let formattedMessage;
  switch (event.kind) {
    case "member:joined":
      console.log("member joined: ", event.body.user.name);
      if (acceptingSubmissions) {
        participants = [...participants, { name: event.body.user.name }];
      }
      break;
    case "member:left":
      console.log("member left: ", event.body.user.name);
      break;
  }
  prizeWheelEl.panels = participants;
}

async function setup(jwt, conversationId) {
  client = new vonageClientSDK.VonageClient();
  callId = null;
  try {
    await client.createSession(jwt);

    // Check for member events
    client.on("conversationEvent", (event) => {
      handleEvent(event);
    });

    // Call stuff
    client.on("legStatusUpdate", (callId, legId, status) => {
      console.log("status: ", status);
      switch (status.name) {
        case "RINGING":
          console.log(`Leg ${legId} is RINGING`);
          statusElement.innerText = "ringing...";
          break;
        case "ANSWERED":
          console.log(`Leg ${legId} is ANSWERED`);
          statusElement.innerText = "answered";
          hangupButton.style.display = "inline";
          break;
        case "COMPLETED":
          console.log(`Leg ${legId} is COMPLETED`);
          statusElement.innerText = "completed";
          break;
      }
    });
    client.on("callHangup", (callId, callQuality, reason) => {
      console.log("callHangup callId: ", callId);
      console.log("callHangup callQuality: ", callQuality);
      console.log("callHangup reason: ", reason);
      hangupButton.style.display = "none";

      if (reason.name == "LOCAL_HANGUP") {
        console.log(`Call ${callId} was hung up locally`);
        statusElement.innerText = "hung up locally";
      } else if (reason.name == "REMOTE_HANGUP") {
        console.log(`Call ${callId} was hung up remotely`);
        statusElement.innerText = "hung up remotely";
      } else if (reason.name == "REMOTE_REJECT") {
        console.log(`Call ${callId} was rejected remotely`);
        statusElement.innerText = "rejected remotely";
      } else if (reason.name == "REMOTE_NO_ANSWER_TIMEOUT") {
        console.log(`Call ${callId} timed out`);
        statusElement.innerText = "no answer timeout";
      } else if (reason.name == "MEDIA_TIMEOUT") {
        console.log(`Call ${callId} timed out`);
        statusElement.innerText = "timed out";
      } else {
        console.log("reason.name: ", reason.name);
        statusElement.innerText = "ended because " + reason.name;
      }
    });
  } catch (error) {
    console.error("error in setup: ", error);
  }
}

qrCodeButton.addEventListener("click", () => {
  qrCodeDialog.showModal();
  acceptingSubmissions = true;
});

qrCodeDialog.addEventListener("close", (e) => {
  console.log("qrCodeDialog closed");
  acceptingSubmissions = false;
});

spinBtn.addEventListener("click", () => {
  console.log("spin!");
  prizeWheelEl.spin();
  spinBtn.style.display = "none";
  resetBtn.style.display = "inline";
});

resetBtn.addEventListener("click", () => {
  console.log("reset!");
  prizeWheelEl.reset();
  resetBtn.style.display = "none";
  spinBtn.style.display = "inline";
});

// Listen for Winner Selected event from Web Component
prizeWheelEl.addEventListener("winner-selected", (e) => {
  console.log("winner selected: ", e);
  winner = e.detail.winner;
  winnerName.innerText = winner.name;
  winnerDialog.showModal();
  confetti({
    particleCount: 200,
    spread: 70,
    origin: { y: 0.6 },
  });
  console.log("Calling ...");
  client.serverCall({ to: winner.name }).then((_callId) => {
    console.log("serverCall!");
    callId = _callId;
  });
});

winnerDialog.addEventListener("close", (e) => {
  console.log("winnerDialog closed");
  const filteredParticipants = participants.filter(
    (participant) => participant.name !== winner.name,
  );
  participants = filteredParticipants;
  prizeWheelEl.panels = participants;
  prizeWheelEl.reset();
  resetBtn.style.display = "none";
  spinBtn.style.display = "inline";
  winner = null;
  winnerName.innerText = "";
  statusElement.innerText = "";
});

hangupButton.addEventListener("click", () => {
  console.log("Hanging up...");
  statusElement.innerText = "hanging up...";
  client
    .hangup(callId)
    .then(() => {
      console.log("Hang up success!");
    })
    .catch((error) => {
      statusElement.textContent = `Error hanging up call: ${error}`;
    });
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorStatus.textContent = "";
  console.log(
    "username: ",
    `${loginForm.elements.username.value}-${Date.now()}`,
  );
  console.log("conversationId: ", conversationId);
  try {
    const data = await postData("/getJWT", {
      username: `${loginForm.elements.username.value}-${Date.now()}`,
      conversationId,
    });
    if (data.code !== 200) {
      errorStatus.textContent = data.error;
    } else {
      // console.log('data: ',data);
      await setup(data.jwt, data.conversationId);
      loginContainer.style.display = "none";
      appToAppContainer.style.display = "block";
    }
  } catch (error) {
    console.error("error logging in: ", error);
  }
});
