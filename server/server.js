const express = require("express");
const bodyParser = require("body-parser");
const ngrok = require("ngrok");
const decodeJWT = require("did-jwt").decodeJWT;
const { Credentials } = require("uport-credentials");
const transports = require("uport-transports").transport;
const message = require("uport-transports").message.util;

const Resolver = require("did-resolver").Resolver;
const getResolver = require("ethr-did-resolver").getResolver;

let endpoint = "";
const app = express();
app.use(bodyParser.json({ type: "*/*" }));

const providerConfig = { rpcUrl: "https://rinkeby.infura.io/v3/18c0c6beb5764a6fbd1e8a71ec841e8a" };
const resolver = new Resolver(getResolver(providerConfig));

const { did, privateKey } = Credentials.createIdentity();

// did:ethr:0xa3f4bfa95c0d0efd9f4cbc8e27efceba98f38815
// 5de4c8fe1209e7f41d1b9f1fba7da424bc57d696f6e19b871496ea0a9e4fc227

const credentials = new Credentials({
	appName: "Persol Server",
	did: "did:ethr:0xa3f4bfa95c0d0efd9f4cbc8e27efceba98f38815", //did
	privateKey: "5de4c8fe1209e7f41d1b9f1fba7da424bc57d696f6e19b871496ea0a9e4fc227",
	resolver,
});

app.get("/login", (req, res) => {
	// createDisclosureRequest: The disclosure request is a JWT, signed by our newly created identity,
	// that requests specific information from the user
	credentials
		.createDisclosureRequest({
			requested: ["name", "country"],
			verified: ["name"],
			notifications: true,
			callbackUrl: endpoint + "/callback1",
		})
		.then((requestToken) => {
			console.log(decodeJWT(requestToken)); // log request token to console
			const uri = message.paramsToQueryString(message.messageToURI(requestToken), { callback_type: "post" });

			// transports provide helpers available for using QR codes, push notifications, mobile-specific URLs,
			// custom messaging servers, and others. In the above endpoint, we present the request to the user in the form of a QR code, using transports.ui.getImageDataURI,
			const qr = transports.ui.getImageDataURI(uri);
			res.send(`<div><img src="${qr}"/></div>`);
		});
});

// This is exactly similar to login example,
// only in this situation we are not requesting specific examples.
// For the purposes of this exercise we need the user's DID to create the verification
app.get("/create", (req, res) => {
	credentials
		.createDisclosureRequest({
			requested: ["name", "country", "avatar"],
			notifications: true,
			callbackUrl: endpoint + "/callback2",
		})
		.then((requestToken) => {
			console.log(decodeJWT(requestToken)); // log request token to console
			const uri = message.paramsToQueryString(message.messageToURI(requestToken), { callback_type: "post" });
			const qr = transports.ui.getImageDataURI(uri);
			res.send(`<div><img src="${qr}"/></div>`);
		});
});

// including a request for a verified claim with the verified array. Changing the keys in this array will request different pieces of data from the user, and they’ll be prompted to approve the verifications that you request
app.get("/request", (req, res) => {
	credentials
		.createDisclosureRequest({
			verified: ["Identity"],
			callbackUrl: endpoint + "/callback3",
		})
		.then((requestToken) => {
			console.log(decodeJWT(requestToken)); //log request token to console
			const uri = message.paramsToQueryString(message.messageToURI(requestToken), { callback_type: "post" });
			const qr = transports.ui.getImageDataURI(uri);
			res.send(`<div><img src="${qr}"/></div>`);
		});
});

app.get("/transaction", (req, res) => {
	// specifically ask for a keypair account, and we are making sure to specify the Rinkeby network id 0x4.
	credentials
		.createDisclosureRequest({
			notifications: true,
			accountType: "keypair",
			network_id: "0x4",
			callbackUrl: endpoint + "/callback4",
		})
		.then((requestToken) => {
			console.log(requestToken);
			console.log(decodeJWT(requestToken)); //log request token to console
			const uri = message.paramsToQueryString(message.messageToURI(requestToken), { callback_type: "post" });
			const qr = transports.ui.getImageDataURI(uri);
			res.send(`<div><img src="${qr}"/></div>`);
		});
});

app.post("/callback1", (req, res) => {
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

app.post("/callback2", (req, res) => {
	const jwt = req.body.access_token;
	credentials.authenticateDisclosureResponse(jwt).then((creds) => {
		// take this time to perform custom authorization steps... then,
		// set up a push transport with the provided
		// push token and public encryption key (boxPub)
		const push = transports.push.send(creds.pushToken, creds.boxPub);

		console.log(creds);

		// The createVerification() function returns a promise that resolves to a JWT like the following.
		// A push notification will appear in the mobile app of the user who has just scanned the QR code,
		// containing the verification below:
		// {
		// 	"header": {
		// 		"typ": "JWT",
		// 		"alg": "ES256K-R"
		// 	},
		// 	"payload": {
		// 		"iat": 1541137834,
		// 		"sub": "did:ethr:0xcf311e53e3b7b27c4a7ccd9a0f31b68f659e8291",
		// 		"claim": {
		// 			"Example": {
		// 				"Last Seen": "Fri Nov 02 2018 01:50:34 GMT-0400 (EDT)"
		// 			}
		// 		},
		// 		"exp": 1543729834,
		// 		"iss": "did:ethr:0x31486054a6ad2c0b685cd89ce0ba018e210d504e"
		// 	},
		// 	"signature": "Fm3_0Bh-5YrEeHOVSCQbukYfFRphJqL07IEWZb7RvH7S7_EFF8YsdsV31c58qyS8jO-ML24ursVl_dZ4ikQSTgA",
		// 	"data": "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NkstUiJ9.eyJpYXQiOjE1NDExMzc4MzQsInN1YiI6ImRpZDpldGhyOjB4Y2YzMTFlNTNlM2I3YjI3YzRhN2NjZDlhMGYzMWI2OGY2NTllODI5MSIsImNsYWltIjp7IkV4YW1wbGUiOnsiTGFzdCBTZWVuIjoiRnJpIE5vdiAwMiAyMDE4IDAxOjUwOjM0IEdNVC0wNDAwIChFRFQpIn19LCJleHAiOjE1NDM3Mjk4MzQsImlzcyI6ImRpZDpldGhyOjB4MzE0ODYwNTRhNmFkMmMwYjY4NWNkODljZTBiYTAxOGUyMTBkNTA0ZSJ9"
		// }

		credentials
			.createVerification({
				sub: creds.did,
				exp: Math.floor(new Date().getTime() / 1000) + 30 * 24 * 60 * 60,

				// todo: image check
				claim: { Avatar: { "Last Seen": `${new Date()}`, Uri: `${creds.avatar.uri}` } },
				// Note, the above is a complex (nested) claim.
				// Also supported are simple claims:  claim: {'Key' : 'Value'}
			})
			.then((attestation) => {
				console.log(`Encoded JWT sent to user: ${attestation}`);
				console.log(`Decodeded JWT sent to user: ${JSON.stringify(decodeJWT(attestation))}`);
				return push(attestation); // *push* the notification to the user's uPort mobile app.
			})
			.then((res) => {
				console.log(res);
				console.log("Push notification sent and should be recieved any moment...");
				console.log("Accept the push notification in the uPort mobile application");
				ngrok.disconnect();
			});
	});
});

app.post("/callback3", (req, res) => {
	const jwt = req.body.access_token;
	console.log(jwt);
	console.log(decodeJWT(jwt));
	credentials
		.authenticateDisclosureResponse(jwt)
		.then((creds) => {
			//validate specific data per use case
			console.log(creds);
			console.log(creds.verified[0]);
		})
		.catch((err) => {
			console.log("oops");
		});
});

app.post("/callback4", (req, res) => {
	const jwt = req.body.access_token;
	credentials.authenticateDisclosureResponse(jwt).then((creds) => {
		// take this time to perform custom authorization steps... then,
		// set up a push transport with the provided
		// push token and public encryption key (boxPub)
		const push = transports.push.send(creds.pushToken, creds.boxPub);

		// send to same account, while Gas will be deducted
		const txObject = {
			to: creds.mnid,
			value: "10000000000000000", // WEI
		};

		/**
		 * const txObject = {
   			to: '0xc3245e75d3ecd1e81a9bfb6558b6dafe71e9f347',
   			value: '0.1',
   			fn: "setStatus(string 'hello', bytes32 '0xc3245e75d3ecd1e81a9bfb6558b6dafe71e9f347')",
			}
			connect.createTxRequest(txObject, {callbackUrl: 'http://mycb.domain'}).then(jwt => {
				...
			})
		 * 
		 */

		credentials
			.createTxRequest(txObject, { callbackUrl: `${endpoint}/txcallback`, callback_type: "post" })
			.then((attestation) => {
				console.log(`Encoded JWT sent to user: ${attestation}`);
				return push(attestation); // *push* the notification to the user's uPort mobile app.
			})
			.then((res) => {
				console.log(res);
				console.log("Push notification sent and should be recieved any moment...");
				console.log("Accept the push notification in the uPort mobile application");
			});
	});
});

app.post("/txcallback", (req, res) => {
	console.log("txCallback hit");
	console.log(req.body);
	ngrok.disconnect();
});

// run the app server and tunneling service
const server = app.listen(8088, () => {
	ngrok.connect(8088).then((ngrokUrl) => {
		endpoint = ngrokUrl;
		console.log(`Login Service running, open at ${endpoint}`);
	});
});
