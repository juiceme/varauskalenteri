var websocket = require("websocket");
var http = require("http");
var fs = require("fs");
var Aes = require('./crypto/aes.js');
Aes.Ctr = require('./crypto/aes-ctr.js');

var globalConnectionList = [];

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
	var sendable = clientjs + aesjs + aesctrjs + "</script></body></html>";
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
    var index = globalConnectionList.push({ connection: connection });
    var sendable;
    servicelog("Client #" + index + " accepted");

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            var receivable = JSON.parse(message.utf8Data);
	    servicelog(receivable);

            if(receivable.type === "clientStarted") {
/*
		servicelog("Sending login challenge to client #" + index);
		sendable = { type: "loginRequest",
			     content: "encryptedChallenge" };
		connection.send(JSON.stringify(sendable));
		setStatustoClient(connection, "Logging in");
*/

                servicelog("Sending initial data to client #" + index);
                setStatustoClient(connection, "Forms are up to date");
                sendable = {type: "calendarData",
                            content: getFileData().reservations };
                connection.send(JSON.stringify(sendable));

	    }

	    if(receivable.type === "userLogin") {
		servicelog("User " + receivable.content.username + " logging in with password " +
			   receivable.content.password);
	    }

	    if(receivable.type === "createAccount") {
		servicelog("Request for new user: [" + receivable.content.username + "]");
		if(!createAccount(receivable.content)) {
		    servicelog("Account [" + receivable.content.username + "] already exists!");
		    setStatustoClient(connection, "Account already exists!");
		} else {
		    setStatustoClient(connection, "Account created!");
		}
	    }
	}
    });

    connection.on('close', function(connection) {
        servicelog("client #" + index + " disconnected");
        globalConnectionList.splice(index, 1);
    });
});

function createAccount(account) {
    try {
	var userData = JSON.parse(fs.readFileSync("./configuration/users.json"));
    } catch(err) {
	console.log(err.message);
	process.exit(1);
    }

    if(userData.users.filter(function(u) {
	return u.username === account.username;
    }).length !== 0) {
	return false;
    } else {
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
