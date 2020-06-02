const express = require("express");
const bodyParser = require("body-parser");
const ngrok = require("ngrok");
const decodeJWT = require("did-jwt").decodeJWT;
const { Credentials, SimpleSigner } = require("uport-credentials");
const transports = require("uport-transports").transport;
const message = require("uport-transports").message.util;

const DidResolver = require("did-resolver");
const EthrDidResolver = require("ethr-did-resolver");

console.log(DidResolver);
console.log(EthrDidResolver);

let endpoint = "";
const app = express();
app.use(bodyParser.json({ type: "*/*" }));

const providerConfig = { rpcUrl: "https://rinkeby.infura.io/v3/18c0c6beb5764a6fbd1e8a71ec841e8a" };
const resolver = new DidResolver.Resolver(EthrDidResolver.getResolver(providerConfig));

const { did, privateKey } = Credentials.createIdentity();

const credentials = new Credentials({
	appName: "Persol Server",
	did,
	privateKey,
	resolver,
});

app.get("/", (req, res) => {
	credentials
		.createDisclosureRequest({
			requested: ["name"],
			notifications: true,
			callbackUrl: endpoint + "/callback",
		})
		.then((requestToken) => {
			console.log(decodeJWT(requestToken)); // log request token to console
			const uri = message.paramsToQueryString(message.messageToURI(requestToken), { callback_type: "post" });
			const qr = transports.ui.getImageDataURI(uri);
			res.send(`<div><img src="${qr}"/></div>`);
		});
});

app.post("/callback", (req, res) => {
	const jwt = req.body.access_token;

	console.log(req.body);
	console.log(jwt);
	// authenticateDisclosureResponse which will verify the signature of the response payload
	// and the signatures of credentials included in the response
	credentials
		.authenticateDisclosureResponse(jwt)
		.then((credentials) => {
			console.log(credentials);
			// Validate the information and apply authorization logic
		})
		.catch((err) => {
			console.log(err);
		});
});

// run the app server and tunneling service
const server = app.listen(8088, () => {
	ngrok.connect(8088).then((ngrokUrl) => {
		endpoint = ngrokUrl;
		console.log(`Login Service running, open at ${endpoint}`);
	});
});
