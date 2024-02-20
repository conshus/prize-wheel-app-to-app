// client-side js, loaded by index.html
// run by the browser each time the page is loaded

const loginContainer = document.querySelector("#loginContainer");
const loginForm = document.querySelector("form");
const adminContainer = document.querySelector("#adminContainer");
const errorStatus = document.querySelector("#errorStatus");
const createChatBtn = document.querySelector("#createChat");
const linkEl = document.querySelector("#link");

let conversation;

async function postData(url = "", data = {}) {
  try {
    const response = await fetch(url, {
      method: "POST", // *GET, POST, PUT, DELETE, etc.
      // mode: 'no-cors', // no-cors, *cors, same-origin
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data), // body data type must match "Content-Type" header
    });
    if (!response.ok) {
      throw new Error("error getting data!");
    }
    console.log("response.status: ", response.status);
    return response.json(); // parses JSON response into native JavaScript objects
  } catch (error) {
    console.error("Error: ", error);
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorStatus.textContent = "";

  try {
    const data = await postData("/login", {
      username: loginForm.elements.username.value,
      password: loginForm.elements.password.value,
    });
    if (data.code !== 200) {
      errorStatus.textContent = data.error;
    } else {
      console.log("data.status: ", data.status);
      loginContainer.style.display = "none";
      adminContainer.style.display = "block";
    }
  } catch (error) {
    console.error("error logging in: ", error);
    errorStatus.textContent = error;
  }
});

createChatBtn.addEventListener("click", async (event) => {
  try {
    const data = await postData("/createChat", { username: "admin" });
    if (data.code !== 200) {
      errorStatus.textContent = data.error;
    } else {
      console.log("data: ", data);
      const chatId = data.conversationId.split("CON-")[1];
      linkEl.innerHTML = `<br><a href="${window.location.href}prizewheel/${chatId}" target="_blank">${window.location.href}prizewheel/${chatId}</a>
      <br><br><a href="${window.location.href}participant/${chatId}" target="_blank">${window.location.href}participant/${chatId}</a>
      `;
    }
  } catch (error) {
    console.error("error creating quiz: ", error);
  }
});
