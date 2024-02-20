// var express = require("express");
// var path = require("path");
// var cookieParser = require("cookie-parser");
// var logger = require("morgan");

// var indexRouter = require("./routes/index");
// var usersRouter = require("./routes/users");

// var app = express();

// app.use(logger("dev"));
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());
// app.use(express.static(path.join(__dirname, "public")));

// app.use("/", indexRouter);
// app.use("/users", usersRouter);

// var listener = app.listen(8080, function() {
//   console.log("Listening on port " + listener.address().port);
// });
// server.js
// where your node app starts

// we've started you off with Express (https://expressjs.com/)
// but feel free to use whatever libraries or frameworks you'd like through `package.json`.
require("dotenv").config();
const express = require("express");
const app = express();
const Nexmo = require("nexmo");

console.log("process.env.API_KEY: ", process.env.API_KEY);

const vonage = new Nexmo(
  {
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET,
    applicationId: process.env.APP_ID,
    privateKey: __dirname + process.env.PRIVATE_KEY,
  },
  { debug: false },
);

// console.log("vonage: ", vonage);

app.use(express.json());

// make all the files in 'public' available
// https://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));
app.use(express.static("node_modules/nexmo-client/dist"));

async function createUser(display_name) {
  console.log("display_name: ", display_name);
  // const name = `${display_name}-${Date.now()}`;
  const name = display_name;
  console.log("name: ", name);
  return new Promise((resolve, reject) => {
    vonage.users.create({ name, display_name }, (error, result) => {
      if (error) {
        console.error("error creating user", error);
        reject({ error });
      } else {
        console.log("created user: ", result);
        resolve({ ...result, name });
      }
    });
  });
}

async function createConversation() {
  console.log("createConversation");
  return new Promise((resolve, reject) => {
    vonage.conversations.create(
      { name: `logs-${Date.now()}`, display_name: `Event Logs` },
      (error, result) => {
        if (error) {
          console.error("error creating conversation", error);
          reject({ error });
        } else {
          console.log("created conversation: ", result);
          resolve(result);
        }
      },
    );
  });
}

async function getUser(display_name) {
  console.log("getUser display_name: ", display_name);
  // const name = `${display_name}-${Date.now()}`;
  const name = display_name;
  // let vonage;
  // try {
  //     vonage = await initializeVonage();
  // } catch (error) {
  //     console.log('error initializing Vonage ', error);
  //     return { error };
  // }
  return new Promise((resolve, reject) => {
    vonage.users.get({ name }, (error, result) => {
      if (error) {
        console.error("error getting user", error);
        reject({ error });
      } else {
        console.log("user found!!!: ", result._embedded.data.users[0]);
        resolve(result._embedded.data.users[0]);
      }
    });
  });
}

async function createMember(conversationId, userId) {
  console.log("createMember!");
  return new Promise((resolve, reject) => {
    vonage.conversations.members.create(
      conversationId,
      { action: "join", user_id: userId, channel: { type: "app" } },
      (error, result) => {
        if (error) {
          console.error("error creating member", error);
          reject({ error });
        } else {
          console.log("created member: ", result);
          resolve(result);
        }
      },
    );
  });
}

async function generateJWT(sub) {
  console.log("generate JWT");
  return new Promise((resolve, reject) => {
    const jwt = vonage.generateJwt({
      application_id: process.env.APP_ID,
      sub: sub,
      exp: Math.round(new Date().getTime() / 1000) + 86400,
      acl: {
        paths: {
          "/*/users/**": {},
          "/*/conversations/**": {},
          "/*/sessions/**": {},
          "/*/devices/**": {},
          "/*/image/**": {},
          "/*/media/**": {},
          "/*/applications/**": {},
          "/*/push/**": {},
          "/*/knocking/**": {},
          "/*/legs/**": {},
        },
      },
    });
    console.log("jwt: ", jwt);
    resolve(jwt);
  });
}

// https://expressjs.com/en/starter/basic-routing.html
// app.get("/", (request, response) => {
//   response.sendFile(__dirname + "/views/index.html");
// });

app.get("/receive", (request, response) => {
  response.sendFile(__dirname + "/views/index2.html");
});

app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/admin.html");
});

app.get("/host/:id", (request, response) => {
  response.sendFile(__dirname + "/views/host.html");
});

app.get("/viewer/:id", (request, response) => {
  response.sendFile(__dirname + "/views/viewer.html");
});

app.get("/prizewheel/:id", (request, response) => {
  response.sendFile(__dirname + "/views/prizewheel.html");
});

app.get("/participant/:id", (request, response) => {
  response.sendFile(__dirname + "/views/participant.html");
});

app.post("/login", (request, response) => {
  if (
    request.body.username === process.env.ADMIN_NAME &&
    request.body.password === process.env.ADMIN_PASSWORD
  ) {
    response.status(200).send({ code: 200, status: "logged in" });
  } else {
    response.status(500).send({ code: 500, error: "incorrect login" });
  }
});

app.post("/getJWT", async (request, response) => {
  console.log("/getJWT: ", request.body.username);

  try {
    //create user
    const user = await createUser(request.body.username);
    console.log("user.id: ", user.id);
    //create conversation
    // const conversation = await createConversation();
    // process.env.LOGS_ID = conversation.id;
    //add user as a member to conversation
    const member = await createMember(request.body.conversationId, user.id);
    //create a JWT and return it
    console.log("user created: ", user);
    const jwt = await generateJWT(user.name);
    response.status(200).send({
      code: 200,
      jwt,
      user,
      member,
      // conversationId: process.env.LOGS_ID,
    });
  } catch (error) {
    console.error("error creating JWT: ", error.error);
    // if get error because user already exists, generate JWT
    if (error.error.body.code === "user:error:duplicate-name") {
      try {
        console.log("user already exists! ", request.body.username);
        const userFound = await getUser(request.body.username);
        console.log("userFound!!!: ", userFound);
        await createMember(request.body.conversationId, userFound.id);
        const jwt = await generateJWT(request.body.username);
        response.status(200).send({
          code: 200,
          jwt,
          // user: userFound,
          // member,
          // conversationId: process.env.LOGS_ID,
        });
        // return { jwt };
      } catch (error) {
        console.log("Got yet another error!", error.error);
        if (
          error.error.body.code === "conversation:error:member-already-joined"
        ) {
          const jwt = await generateJWT(request.body.username);
          response.status(200).send({
            code: 200,
            jwt,
            // user: userFound,
            // member,
            // conversationId: process.env.LOGS_ID,
          });
          // return { jwt };
        }
      }
    } else {
      console.log("Got another error!", error.error);
      return { error };
    }

    // response.status(500).send({ code: 500, error });
  }
});

app.post("/getJWT2", async (request, response) => {
  console.log("/getJWT: ", request.body.username);
  try {
    //create user
    const user = await createUser(request.body.username);
    //create conversation
    // const conversation = await createConversation();
    // process.env.LOGS_ID = conversation.id
    //add user as a member to conversation
    // const member = await createMember(user.id);
    //create a JWT and return it
    console.log("user created: ", user);
    const jwt = await generateJWT(user.name);
    response.status(200).send({ code: 200, jwt, user });
  } catch (error) {
    response.status(500).send({ code: 500, error });
  }
});

app.post("/createChat", async (request, response) => {
  try {
    //create conversation
    const conversation = await createConversation();
    response.status(200).send({ code: 200, conversationId: conversation.id });
  } catch (error) {
    response.status(500).send({ code: 500, error });
  }
});

app.get("/webhooks/answer", async (request, response) => {
  console.log("webhooks/answer request: ", request.query.to);
  const ncco = [
    {
      action: "talk",
      text: `Please wait while we connect you to ${request.query.to}.`,
    },
    {
      action: "connect",
      endpoint: [
        {
          type: "app",
          user: request.query.to,
        },
      ],
    },
  ];
  response.json(ncco);
});

app.post("/webhooks/event", async (request, response) => {
  console.log("webhooks/event request: ", request.body);
  vonage.conversations.events.create(
    process.env.LOGS_ID,
    {
      type: "custom:log_event",
      from: "SYSTEM", // see if I need to create a member at setup
      body: request.body,
    },
    (error, result) => {
      if (error) {
        console.error("Error sending log event: ", error);
      } else {
        console.log("Log event sent: ", result);
      }
    },
  );
});
const hostname = require("os").hostname;
const port = process.env.PORT;
const previewUrl = `https://${hostname}-${port}.csb.app`;

// listen for requests :)
const PORT = 8080;
const listener = app.listen(PORT, () => {
  console.log("previewUrl: ", previewUrl);
  console.log("Your app is listening on port " + listener.address().port);
});
