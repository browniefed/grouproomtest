require("dotenv").load();

var http = require("http");
var path = require("path");
var AccessToken = require("twilio").jwt.AccessToken;
var VideoGrant = AccessToken.VideoGrant;
var SyncGrant = AccessToken.SyncGrant;

var express = require("express");
const client = require("twilio")(process.env.TWILIO_API_KEY, process.env.TWILIO_API_SECRET, {
  accountSid: process.env.TWILIO_ACCOUNT_SID
});
var randomName = require("./randomname");

// Max. period that a Participant is allowed to be in a Room (currently 14400 seconds or 4 hours)
const MAX_ALLOWED_SESSION_DURATION = 14400;

// Create Express webapp.
var app = express();

// Set up the paths for the examples.
[
  "bandwidthconstraints",
  "codecpreferences",
  "localvideofilter",
  "localvideosnapshot",
  "mediadevices"
].forEach(function(example) {
  var examplePath = path.join(__dirname, `../examples/${example}/public`);
  app.use(`/${example}`, express.static(examplePath));
});

// Set up the path for the quickstart.
var quickstartPath = path.join(__dirname, "../quickstart/public");
app.use("/quickstart", express.static(quickstartPath));

// Set up the path for the examples page.
var examplesPath = path.join(__dirname, "../examples");
app.use("/examples", express.static(examplesPath));

/**
 * Default to the Quick Start application.
 */
app.get("/", function(request, response) {
  response.redirect("/quickstart");
});

/**
 * Generate an Access Token for a chat application user - it generates a random
 * username for the client requesting a token, and takes a device ID as a query
 * parameter.
 */

const init = async () => {
  try {
    const roomName = makeid(5);

    const room = await client.video.rooms.create({
      recordParticipantsOnConnect: true,
      statusCallback: "http://example.org",
      type: "group",
      uniqueName: roomName,
      videoCodecs: ["H264"]
    });

    app.get("/token", async function(request, response) {
      var identity = randomName();

      var token = new AccessToken(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_API_KEY,
        process.env.TWILIO_API_SECRET
      );

      // Assign the generated identity to the token.
      token.identity = identity;

      // Grant the access token Twilio Video capabilities.
      token.addGrant(
        new VideoGrant({
          room: roomName
        })
      );

      token.addGrant(
        new SyncGrant({
          serviceSid: process.env.TWILIO_SYNC_SERVICE_SID
        })
      );

      response.send({
        token: token.toJwt(),
        name: roomName
      });
    });

    // Create http server and run it.
    var server = http.createServer(app);
    var port = process.env.PORT || 8000;
    server.listen(port, function() {
      console.log("Express server running on *:" + port);
    });
  } catch (e) {
    console.log(e);
  }
};

init();

function makeid(length) {
  var result = "";
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
