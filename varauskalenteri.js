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
					    state : "new" }) - 1;
    var sendable;
    servicelog("Client #" + index + " accepted");

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
	    try {
		var receivable = JSON.parse(message.utf8Data);
	    } catch(err) {
		servicelog("Received illegal message: " + err);
		return;
	    }
	    if(!receivable.type || !receivable.content) {
		servicelog("Received broken message: " + JSON.stringify(receivable));
		return;
	    }

	    servicelog("Incoming message: " + JSON.stringify(receivable));
	    var type = receivable.type;
	    var content = receivable.content;

            if(type === "clientStarted") {
		globalConnectionList[index].state = "clientStarted";
		servicelog("Sending initial login view to client #" + index);
		sendable = { type: "loginView" }
		connection.send(JSON.stringify(sendable));
		setStatustoClient(connection, "Login");
	    }

	    if(type === "userLogin") {
		if(!content.username) {
		    servicelog("Illegal user login message");
		    sendable = { type: "loginView" }
		    connection.send(JSON.stringify(sendable));
		    setStatustoClient(connection, "Login");
		    return;
		} else {
		    var user = getUserByHashedName(content.username);
		    if(user.length === 0) {
			servicelog("Unknown user login attempt");
			sendable = { type: "loginView" }
			connection.send(JSON.stringify(sendable));
			setStatustoClient(connection, "Login");
			return;
		    } else {
			globalConnectionList[index].user = user[0];
			servicelog("User " + user[0].username + " logging in");
			var plainChallenge = getNewChallenge();
			servicelog("plainChallenge:   " + plainChallenge);
			var cipheredChallenge = Aes.Ctr.encrypt(plainChallenge, user[0].password, 128);
			globalConnectionList[index].challenge = plainChallenge;
			sendable = { type: "loginChallenge", content: cipheredChallenge };
			connection.send(JSON.stringify(sendable));
		    }
		}
	    }

	    if(type === "loginResponse") {
		servicelog("Received response");
		var plainResponse = Aes.Ctr.decrypt(content, globalConnectionList[index].user.password, 128);

		servicelog("plainResponse: " + plainResponse);
		servicelog("challenge:     " + globalConnectionList[index].challenge);
		servicelog("aeskey:        " + globalConnectionList[index].user.password);
		servicelog("user:          " + JSON.stringify(globalConnectionList[index].user));

		if(globalConnectionList[index].challenge === plainResponse) {
		    servicelog("User login OK");
		    setStatustoClient(connection, "Login OK");
                    sendable = {type: "calendarData",
				content: getFileData().reservations };
                    connection.send(JSON.stringify(sendable));
		    
		} else {
		    servicelog("User login failed");
		    setStatustoClient(connection, "Login Failed!");
		    sendable = { type: "loginView" }
		    connection.send(JSON.stringify(sendable));
		}
		
	    }

	    if(type === "createAccount") {
		servicelog("temp passwd: " + JSON.stringify(globalConnectionList[index].key));
		account = JSON.parse(Aes.Ctr.decrypt(content, globalConnectionList[index].key, 128));
		if(globalConnectionList[index].state === "newUserValidated") {
		    servicelog("Request for new user: [" + account.username + "]");
		    if(!createAccount(account)) {
			servicelog("Account [" + account.username + "] already exists!");
			setStatustoClient(connection, "Account already exists!");
			sendable = { type: "createNewAccount" };
			connection.send(JSON.stringify(sendable));
			return
		    } else {
			globalConnectionList[index].state = "clientStarted";
			setStatustoClient(connection, "Account created!");
			sendable = { type: "loginView" }
			connection.send(JSON.stringify(sendable));
			setStatustoClient(connection, "Login");
			return;
		    }
		}
		if(globalConnectionList[index].state === "oldUserValidated") {
		    servicelog("Request account change for user: [" + account.username + "]");
		    var user = getUserByUserame(account.username);
		    if(user.length === 0) {
			globalConnectionList[index].state = "clientStarted";
			setStatustoClient(connection, "Illegal user operation!");
			sendable = { type: "loginView" }
			connection.send(JSON.stringify(sendable));
			setStatustoClient(connection, "Login");
			return;
		    } else {
			updateUserAccount(account);
			setStatustoClient(connection, "Account updated!");
			sendable = { type: "loginView" }
			connection.send(JSON.stringify(sendable));
			setStatustoClient(connection, "Login");			
			return;
		    }
		}
	    }

	    if((type === "confirmEmail") && (globalConnectionList[index].state
					     === "clientStarted")) {
		servicelog("Request for email verification: [" + content + "]");
		sendEmailVerification(content);
		sendable = { type: "loginView" }
		connection.send(JSON.stringify(sendable));
		setStatustoClient(connection, "Email sent!");
	    }

	    if((type === "validateAccount") && (globalConnectionList[index].state
						=== "clientStarted")) {
		if(!content.email || !content.challenge) {
		    servicelog("Illegal validate account message");
		    sendable = { type: "loginView" }
		    connection.send(JSON.stringify(sendable));
		    setStatustoClient(connection, "Login");
		    return;
		} else {
		    servicelog("Validation code: " + JSON.stringify(content));
		    account = validateAccountCode(content.email.toString());
		    if((account !== false) && (Aes.Ctr.decrypt(content.challenge, account.token.key, 128)
					       === "clientValidating")) {
			globalConnectionList[index].state = "newUserValidated";
			setStatustoClient(connection, "Validation code correct!");
			globalConnectionList[index].key = account.token.key;
			var newAccount = {email: account.email};
			var user = getUserByEmail(account.email);
			servicelog("user: " + JSON.stringify(user));
			if(user.length !== 0) {
			    newAccount.username = user[0].username;
			    newAccount.realname = user[0].realname;
			    newAccount.phone = user[0].phone;
			    globalConnectionList[index].state = "oldUserValidated";
			}
			var cipheredEmail =  Aes.Ctr.encrypt(JSON.stringify(newAccount), account.token.key, 128);
			sendable = { type: "createNewAccount",
				     content: cipheredEmail };
			connection.send(JSON.stringify(sendable));
			return;
		    } else {
			setStatustoClient(connection, "Validation code failed!");
			sendable = { type: "loginView" }
			connection.send(JSON.stringify(sendable));
			return;
		    }
		}
	    }


	}
    });

    connection.on('close', function(connection) {
        servicelog("client #" + index + " disconnected");
        globalConnectionList.splice(index, 1);
    });
});

function readUserData() {
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
    servicelog(JSON.stringify(userData.users));
    return userData;
}

function updateUserAccount(account) {
    servicelog("Update User Account: " + JSON.stringify(account));
}

function getUserByUserame(username) {
    return readUserData().users.filter(function(u) {
	return u.username === username;
    });
}

function getUserByEmail(email) {
    return readUserData().users.filter(function(u) {
	return u.email === email;
    });
}

function getUserByHashedName(hash) {
    return readUserData().users.filter(function(u) {
	return u.hash === hash;
    });
}

function createAccount(account) {
    var userData = readUserData();

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

function validateAccountCode(code) {
    try {
	var userData = JSON.parse(fs.readFileSync("./configuration/pending.json"));
    } catch(err) {
	if(err.code === "ENOENT") {
	    // If file is not found, nothing to verify.
	    servicelog("Empty pending requests database, bailing out");
	    return false;
	} else {
	    // If some other problem, then exit.
	    servicelog("Error processing pending requests database: " + err.message);
	    process.exit(1);
	}
    }
    var target = userData.pending.filter(function(u) {
	return u.token.mail === code.slice(0, 8);
    });
    if(target.length === 0) {
	return false;
    } else {
	var newUserData = { pending : [] };
	newUserData.pending = userData.pending.filter(function(u) {
	    return u.token.mail !== code.slice(0, 8);
	});
	try {
	    fs.writeFileSync("./configuration/pending.json", JSON.stringify(newUserData));
	} catch(err) {
	    servicelog("Pending requests database write failed: " + err.message);
	}
	servicelog("Removed pending request from database");
	return target[0];
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
    var request = { email: email,
		    token: generateEmailToken(email),
		    date: new Date().getTime() };
    userData.pending.push(request);
    try {
	fs.writeFileSync("./configuration/pending.json", JSON.stringify(userData));
    } catch(err) {
	servicelog("Pending requests database write failed: " + err.message);
    }
}

function generateEmailToken(email) {
    return { mail: sha1.hash(email).slice(0, 8),
	     key: sha1.hash(globalSalt + JSON.stringify(new Date().getTime())).slice(0, 16) };
}

function getNewChallenge() {
    return ("challenge_" + sha1.hash(globalSalt + new Date().getTime().toString()) + "1");
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
