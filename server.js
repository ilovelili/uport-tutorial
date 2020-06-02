const express = require("express");
const ngrok = require("ngrok");
const path = require("path");

//setup boilerplate
let endpoint = "";
const app = express();

app.get("/connect", function (req, res) {
	// res.sendFile(path.join(__dirname + "/uport.html"));
	res.sendFile(path.join(__dirname + "/uport-connection.html"));
});

app.get("/create", function (req, res) {
	// res.sendFile(path.join(__dirname + "/uport.html"));
	res.sendFile(path.join(__dirname + "/uport-create-verification.html"));
});

app.get("/request", function (req, res) {
	// res.sendFile(path.join(__dirname + "/uport.html"));
	res.sendFile(path.join(__dirname + "/uport-request-verification.html"));
});

app.use(express.static("lib"));

// run the app server and tunneling service
const server = app.listen(8088, () => {
	ngrok.connect(8088).then((ngrokUrl) => {
		endpoint = ngrokUrl;
		console.log(`Your dApp is being served!, open at ${endpoint} and scan the QR to login!`);
	});
});
