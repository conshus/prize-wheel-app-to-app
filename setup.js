require("dotenv").config();
const fs = require("fs");
const hostname = require("os").hostname;
const PORT = 8080;
const previewUrl = `https://${hostname}-${PORT}.csb.app`;

// const Vonage = require("@vonage/server-sdk");
const Vonage = require("nexmo");

let step = "SET_ADMIN_NAME";
console.log('Vonage setup utility for CodeSandbox.io -- press "q" to exit');
console.log(
  "This utility will need your Vonage API key and API secret. They will be saved to your .env file,",
);
console.log(
  "where they will be visible only to you and collaborators on this project.",
);
console.log(
  "Find your API key and secret at: https://dashboard.nexmo.com/getting-started-guide",
);
// console.log("process.env.PROJECT_DOMAIN: ", process.env.PROJECT_DOMAIN);
// console.log("previewUrl: ", previewUrl);
console.log("1)  Enter your Admin Name (NOT YOUR VONAGE USERNAME!):");
let input = process.stdin;
input.on("data", (data) => {
  if (data.toString().trim() === "q") {
    // exit
    return process.exit();
  }

  switch (step) {
    case "SET_ADMIN_NAME":
      return setAdminName(data);
      break;
    case "SET_ADMIN_PASSWORD":
      return setAdminPassword(data);
      break;
    case "SET_API_KEY":
      return setApiKey(data);
      break;
    case "SET_API_SECRET":
      return setApiSecret(data);
      break;
    case "SET_APP_NAME":
      return setAppName(data);
      break;
    default:
  }
});

function setAdminName(data) {
  if (
    data.toString().replace(/\n/g, "").length === 0 ||
    data.toString().replace(/\n/g, "") === " "
  ) {
    console.log("(Can not be blank.) Enter your Admin Name:");
  } else {
    process.env.ADMIN_NAME = data.toString().replace(/\n/g, "");
    step = "SET_ADMIN_PASSWORD";
    console.log("2) Enter you Admin password (NOT YOUR VONAGE PASSWORD!):");
  }
  return true;
}

function setAdminPassword(data) {
  if (
    data.toString().replace(/\n/g, "").length === 0 ||
    data.toString().replace(/\n/g, "") === " "
  ) {
    console.log("(Can not be blank.) Enter you Admin Password:");
  } else {
    process.env.ADMIN_PASSWORD = data.toString().replace(/\n/g, "");
    step = "SET_API_KEY";
    console.log("3) Enter you API key:");
  }
  return true;
}

function setApiKey(data) {
  if (
    data.toString().replace(/\n/g, "").length === 0 ||
    data.toString().replace(/\n/g, "") === " "
  ) {
    console.log("(Can not be blank.) Enter your API key:");
  } else {
    process.env.API_KEY = data.toString().replace(/\n/g, "");
    step = "SET_API_SECRET";
    console.log("2) Enter your API secret:");
  }
  return true;
}

function setApiSecret(data) {
  if (
    data.toString().replace(/\n/g, "").length === 0 ||
    data.toString().replace(/\n/g, "") === " "
  ) {
    console.log("(Can not be blank.) Enter you API secret:");
  } else {
    process.env.API_SECRET = data.toString().replace(/\n/g, "");
    step = "SET_APP_NAME";
    console.log("3) Enter a name for your Application:");
  }
  return true;
}

function setAppName(data) {
  if (
    data.toString().replace(/\n/g, "").length === 0 ||
    data.toString().replace(/\n/g, "") === " "
  ) {
    console.log("(Can not be blank.) Enter a name for your Application:");
  } else {
    createApp(data);
  }
  return true;
}

function createApp(data) {
  console.log("Creating your Application...");
  const vonage = new Vonage(
    {
      apiKey: process.env.API_KEY,
      apiSecret: process.env.API_SECRET,
    },
    {
      debug: false,
    },
  );

  vonage.applications.create(
    {
      name: data.toString().replace(/\n/g, ""),
      capabilities: {
        voice: {
          webhooks: {
            answer_url: {
              address: `https://${hostname}-${PORT}.csb.app/webhooks/answer`,
              http_method: "GET",
            },
            event_url: {
              address: `https://${hostname}-${PORT}.csb.app/webhooks/event`,
              http_method: "POST",
            },
          },
        },
        messages: {
          webhooks: {
            inbound_url: {
              address: `https://${hostname}-${PORT}.csb.app/webhooks/inbound`,
              http_method: "POST",
            },
            status_url: {
              address: `https://${hostname}-${PORT}.csb.app/webhooks/status`,
              http_method: "POST",
            },
          },
        },
        rtc: {
          webhooks: {
            event_url: {
              address: `https://${hostname}-${PORT}.csb.app/webhooks/rtcevent`,
              http_method: "POST",
            },
          },
        },
      },
    },
    (error, result) => {
      if (error) {
        console.error("Error creating Application: ", error);
        process.exit();
      } else {
        console.log("Application created with ID: ", result.id);
        process.env.APP_ID = result.id;
        fs.writeFile(
          __dirname + "/private.key",
          result.keys.private_key,
          (err) => {
            if (err) {
              console.log("Error writing private key: ", err);
              process.exit();
            } else {
              console.log("Private key saved to /private.key");
              writeEnv();
            }
          },
        );
      }
    },
  );
  return true;
}

function writeEnv() {
  const contents = `ADMIN_NAME="${process.env.ADMIN_NAME}"
ADMIN_PASSWORD="${process.env.ADMIN_PASSWORD}"
API_KEY="${process.env.API_KEY}"
API_SECRET="${process.env.API_SECRET}"
APP_ID="${process.env.APP_ID}"
PRIVATE_KEY="/private.key"`;

  fs.writeFile(__dirname + "/.env", contents, (err) => {
    if (err) {
      console.log("Error writing .env file: ", err);
      process.exit();
    } else {
      console.log("Environment variables saved to .env");
      process.exit();
    }
  });
}
