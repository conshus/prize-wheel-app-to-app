// client-side js, loaded by index.html
// run by the browser each time the page is loaded

import { faker } from "https://cdn.jsdelivr.net/npm/@faker-js/faker@8.4.0/+esm";
import confetti from "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/+esm";

console.log(
  "hello world :o",
  window.location.href.toLowerCase().split("participant/")[1],
);

const conversationId =
  "CON-" + window.location.href.toLowerCase().split("participant/")[1];

const loginContainer = document.querySelector("#loginContainer");
const loginForm = document.querySelector("form");
const errorStatus = document.querySelector("#errorStatus");

const appToAppContainer = document.querySelector("#appToAppContainer");
const answerButton = document.getElementById("answer");
const hangupButton = document.getElementById("hangup");
const statusElement = document.getElementById("status");
const usernameElement = document.getElementById("username-placeholder");

const audioElement = new Audio(
  "https://onhold2go.co.uk/song-demos/free/a-new-life-preview.mp3",
);

let client;
let callId;

loginForm.elements.username.value = faker.person.fullName();
console.log(
  "loginForm.elements.username.value: ",
  loginForm.elements.username.value,
);

async function postData(url = "", data = {}) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return response.json(); // parses JSON response into native JavaScript objects
  } catch (error) {
    console.error("Error: ", error);
  }
}

async function setup(jwt, conversationId) {
  client = new vonageClientSDK.VonageClient();
  callId = null;
  try {
    await client.createSession(jwt);

    client.on("callInvite", (_callId, from, channelType) => {
      console.log("from: ", from);
      console.log("channelType: ", channelType);
      // play audio
      audioElement.play();
      confetti({
        particleCount: 200,
        spread: 70,
        origin: { y: 0.6 },
      });
      callId = _callId;
      statusElement.textContent = "You are receiving a call";
      answerButton.disabled = false;
      answerButton.style.display = "inline";
    });

    client.on("callHangup", (callId, callQuality, reason) => {
      // callId = null;
      statusElement.textContent = "Congrats!";
      answerButton.style.display = "none";
      answerButton.disabled = true;
      hangupButton.style.display = "none";

      console.log("callHangup callId: ", callId);
      console.log("callHangup callQuality: ", callQuality);
      console.log("callHangup reason: ", reason);
      if (reason.name == "LOCAL_HANGUP") {
        console.log(`Call ${callId} was hung up locally`);
      } else if (reason.name == "REMOTE_HANGUP") {
        console.log(`Call ${callId} was hung up remotely`);
      } else if (reason.name == "REMOTE_REJECT") {
        console.log(`Call ${callId} was rejected remotely`);
      } else if (reason.name == "REMOTE_NO_ANSWER_TIMEOUT") {
        console.log(`Call ${callId} timed out`);
      } else if (reason.name == "MEDIA_TIMEOUT") {
        console.log(`Call ${callId} timed out`);
      } else {
        console.log("reason.name: ", reason.name);
      }
    });
  } catch (error) {
    console.error("error in setup: ", error);
  }
}

// Answer the call.
answerButton.addEventListener("click", () => {
  client
    .answer(callId)
    .then(() => {
      // stop audio
      audioElement.pause();
      statusElement.textContent = "You are on a call";
      answerButton.style.display = "none";
      hangupButton.style.display = "inline";
    })
    .catch((error) => {
      console.error("Error answering call: ", error);
    });
});

// Hang up the call.
hangupButton.addEventListener("click", () => {
  console.log("Hanging up...");
  client
    .hangup(callId)
    .then(() => {
      console.log("Hang up's success!");
    })
    .catch((error) => {
      statusElement.textContent = `Error hanging up call: ${error}`;
    });
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorStatus.textContent = "";
  try {
    const data = await postData("/getJWT", {
      username: loginForm.elements.username.value,
      conversationId,
    });
    if (data.code !== 200) {
      errorStatus.textContent = data.error;
    } else {
      console.log("data: ", data);
      await setup(data.jwt);
      loginContainer.style.display = "none";
      appToAppContainer.style.display = "block";
      usernameElement.innerText = loginForm.elements.username.value;
    }
  } catch (error) {
    console.error("error logging in: ", error);
  }
});
