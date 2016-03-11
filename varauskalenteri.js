var websocket = require("websocket");
var http = require("http");
var fs = require("fs");
var Aes = require('./crypto/aes.js');
Aes.Ctr = require('./crypto/aes-ctr.js');
var sha1 = require('./crypto/sha1.js');

var globalConnectionList = [];
var globalSalt = sha1.hash(JSON.stringify(new Date().getTime()));

function servicelog(s) {
    console.log((new Date()) + " --- " + s);
}

function setStatustoClient(connection, status) {
    var sendable = { type:"statusData",
		     content: status };
    connection.send(JSON.stringify(sendable));
}

function serveClientPage() {
    http.createServer(function(request,response){
	var clientjs = fs.readFileSync("./client.js", "utf8");
	var aesjs = fs.readFileSync("./crypto/aes.js", "utf8");
	var aesctrjs = fs.readFileSync("./crypto/aes-ctr.js", "utf8");
	var sha1js = fs.readFileSync("./crypto/sha1.js", "utf8");
	var sendable = clientjs + aesjs + aesctrjs + sha1js + "</script></body></html>";
	response.writeHeader(200, {"Content-Type": "text/html"});
	response.write(sendable);
	response.end();
    }).listen(8080);
}

var server = http.createServer(function(request, response) {
    // process HTTP request. Since we're writing just WebSockets server
    // we don't have to implement anything.
});

server.listen(8081, function() {});

wsServer = new websocket.server({
    httpServer: server
});

wsServer.on('request', function(request) {
    servicelog("Connection from origin " + request.origin);
    var connection = request.accept(null, request.origin);
    var index = globalConnectionList.push({ connection: connection,
					    user : "",
					    login : false }) - 1;
    var sendable;
    servicelog("Client #" + index + " accepted");

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            var receivable = JSON.parse(message.utf8Data);
	    servicelog(receivable);

            if(receivable.type === "clientStarted") {
		servicelog("Sending initial login view to client #" + index);
		sendable = { type: "loginView" }
		connection.send(JSON.stringify(sendable));
		setStatustoClient(connection, "Login");
	    }

	    if(receivable.type === "userLogin") {
		var user = getUserName(receivable.content.username);
		if(user.length === 0) {
		    servicelog("Unknown user login attempt");
		    setStatustoClient(connection, "Login failed!");
		} else {
		    globalConnectionList[index].user = user[0];
		    servicelog("User " + user[0].username + " logging in");
		    var plainChallenge = getNewChallenge();
		    var cipheredChallenge = Aes.Ctr.encrypt(plainChallenge, user[0].password, 128);
		    globalConnectionList[index].challenge = plainChallenge;
		    sendable = { type: "loginChallenge", content:  cipheredChallenge };
		    connection.send(JSON.stringify(sendable));
		}
	    }


	    

/*
		servicelog("Sending login challenge to client #" + index);
		sendable = { type: "loginRequest",
			     content: "encryptedChallenge" };
		connection.send(JSON.stringify(sendable));
		setStatustoClient(connection, "Logging in");


                servicelog("Sending initial data to client #" + index);
                setStatustoClient(connection, "Forms are up to date");
                sendable = {type: "calendarData",
                            content: getFileData().reservations };
                connection.send(JSON.stringify(sendable));

	    }

*/

	    if(receivable.type === "createAccount") {
		servicelog("Request for new user: [" + receivable.content.username + "]");
		if(!createAccount(receivable.content)) {
		    servicelog("Account [" + receivable.content.username + "] already exists!");
		    setStatustoClient(connection, "Account already exists!");
		} else {
		    setStatustoClient(connection, "Account created!");
		}
	    }

	    if(receivable.type === "confirmEmail") {
		servicelog("Request for email verification: [" + receivable.content + "]");
		sendEmailVerification(receivable.content);
		setStatustoClient(connection, "Email sent!");
	    }

	    if(receivable.type === "validateAccount") {
		servicelog("Validation code: [" + receivable.content + "]");
		if(validateAccountCode(receivable.content)) {
		    setStatustoClient(connection, "Validation code correct!");
		} else {
		    setStatustoClient(connection, "Validation code failed!");
		}
	    }

	}
    });

    connection.on('close', function(connection) {
        servicelog("client #" + index + " disconnected");
        globalConnectionList.splice(index, 1);
    });
});

function getUserName(hash) {
    try {
	var userData = JSON.parse(fs.readFileSync("./configuration/users.json"));
    } catch(err) {
	if(err.code === "ENOENT") {
	    // If file is not found, no problem. Just return empty.
	    servicelog("Empty user database, bailing out");
	    return "";
	} else {
	    // If some other problem, then exit.
	    servicelog("Error processing used database: " + err.message);
	    process.exit(1);
	}
    }
    return userData.users.filter(function(u) {
	return u.hash == hash;
    });
}

function createAccount(account) {
    try {
	var userData = JSON.parse(fs.readFileSync("./configuration/users.json"));
    } catch(err) {
	if(err.code === "ENOENT") {
	    // If file is not found, no problem. Just create a new one.
	    servicelog("Empty user database, creating new");
	    var userData = { users : [] };
	    fs.writeFileSync("./configuration/users.json", JSON.stringify(userData));
	} else {
	    // If some other problem, then exit.
	    servicelog("Error processing used database: " + err.message);
	    process.exit(1);
	}
    }

    if(userData.users.filter(function(u) {
	return u.username === account.username;
    }).length !== 0) {
	return false;
    } else {
	account.hash = sha1.hash(account.username);
	account.status = "pending";
	userData.users.push(account);
	try {
	    fs.writeFileSync("./configuration/users.json", JSON.stringify(userData));
	} catch(err) {
	    servicelog("User database write failed: " + err.message);
	}
	return true;
    }
}

function sendEmailVerification(email) {
    try {
	var userData = JSON.parse(fs.readFileSync("./configuration/pending.json"));
    } catch(err) {
	if(err.code === "ENOENT") {
	    // If file is not found, no problem. Just create a new one.
	    servicelog("Empty pending requests database, creating new");
	    var userData = { pending : [] };
	    fs.writeFileSync("./configuration/pending.json", JSON.stringify(userData));
	} else {
	    // If some other problem, then exit.
	    servicelog("Error processing pending requests database: " + err.message);
	    process.exit(1);
	}
    }
    var request = { email: email, token: generateEmailToken(email) };
    userData.pending.push(request);
    try {
	fs.writeFileSync("./configuration/pending.json", JSON.stringify(userData));
    } catch(err) {
	servicelog("Pending requests database write failed: " + err.message);
    }
}

function generateEmailToken() {
    return (sha.hash(email).slice(0, 16) +
	    sha1.hash(globalSalt + JSON.stringify(new Date().getTime())).slice(0, 16));
}

function getNewChallenge() {
    return ("challenge_" + sha1.hash(globalSalt + JSON.stringify(new Date().getTime())) + "1");
}

function getFileData() {
    try {
        var reservationData = JSON.parse(fs.readFileSync("./configuration/reservations.json"));
    } catch (err) {
        console.log(err.message);
        process.exit(1);
    }
    return { reservations : reservationData };
}

servicelog("Waiting for client connection to port 8080...");
serveClientPage();
