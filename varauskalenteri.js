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

            if(receivable.type == "clientStarted") {
		servicelog("Sending login challenge to client #" + index);
		sendable = { type: "loginRequest",
			     content: "encryptedChallenge" };
		connection.send(JSON.stringify(sendable));
		setStatustoClient(connection, "Logging in");
	    }
	}
    });

    connection.on('close', function(connection) {
        servicelog("client #" + index + " disconnected");
        globalConnectionList.splice(index, 1);
    });
});

servicelog("Waiting for client connection to port 8080...");
serveClientPage();
