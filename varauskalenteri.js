var websocket = require("websocket");
var http = require("http");
var fs = require("fs");
var email = require("emailjs/email");
var Aes = require('./crypto/aes.js');
Aes.Ctr = require('./crypto/aes-ctr.js');
var sha1 = require('./crypto/sha1.js');
var datastorage = require('./datastorage/datastorage.js');

var globalConnectionList = [];
var globalSalt = sha1.hash(JSON.stringify(new Date().getTime()));

function servicelog(s) {
    console.log((new Date()) + " --- " + s);
}

function setStatustoClient(index, status) {
    var sendable = { type: "statusData",
		     content: status };
    globalConnectionList[index].connection.send(JSON.stringify(sendable));
}

function sendPlainTextToClient(index, sendable) {
    globalConnectionList[index].connection.send(JSON.stringify(sendable));
}

function sendCipherTextToClient(index, sendable) {
    var cipherSendable = { type: sendable.type,
			   content: Aes.Ctr.encrypt(JSON.stringify(sendable.content),
						    globalConnectionList[index].aesKey, 128) };
    globalConnectionList[index].connection.send(JSON.stringify(cipherSendable));
}

var webServer = http.createServer(function(request,response){
    var clientjs = fs.readFileSync("./client.js", "utf8");
    var aesjs = fs.readFileSync("./crypto/aes.js", "utf8");
    var aesctrjs = fs.readFileSync("./crypto/aes-ctr.js", "utf8");
    var sha1js = fs.readFileSync("./crypto/sha1.js", "utf8");
    var sendable = clientjs + aesjs + aesctrjs + sha1js + "</script></body></html>";
    response.writeHeader(200, {"Content-Type": "text/html"});
    response.write(sendable);
    response.end();
});

wsServer = new websocket.server({
    httpServer: webServer,
    autoAcceptConnections: false
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

//	    servicelog("Incoming message: " + JSON.stringify(receivable));
	    var type = receivable.type;
	    var content = receivable.content;

            if(type === "clientStarted") { processClientStarted(index); }
	    if(type === "userLogin") { processUserLogin(index, content); }
	    if(type === "loginResponse") { processLoginResponse(index, content); }
	    if(type === "createAccount") { processCreateAccount(index, content); }
	    if((type === "confirmEmail") &&
	       stateIs(index, "clientStarted")) { processConfirmEmail(index, content); }
	    if((type === "validateAccount") &&
	       stateIs(index, "clientStarted")) { processValidateAccount(index, content); }
	    if((type ==="sendReservation") &&
	       stateIs(index, "loggedIn")) { processSendReservation(index, content); }
	}
    });

    connection.on('close', function(connection) {
        servicelog("client #" + index + " disconnected");
        globalConnectionList.splice(index, 1);
    });
});

function stateIs(index, state) {
    return (globalConnectionList[index].state === state);
}

function setState(index, state) {
    globalConnectionList[index].state = state;
}

function processClientStarted(index) {
    servicelog("Sending initial login view to client #" + index);
    setState(index, "clientStarted");
    globalConnectionList[index].aesKey = "";
    globalConnectionList[index].user = {};
    globalConnectionList[index].challenge = "";
    var sendable = { type: "loginView" }
    sendPlainTextToClient(index, sendable);
    setStatustoClient(index, "Login");
}

function processUserLogin(index, content) {
    var sendable;
    if(!content.username) {
	servicelog("Illegal user login message");
	processClientStarted(index);
	return;
    } else {
	var user = getUserByHashedName(content.username);
	if(user.length === 0) {
	    servicelog("Unknown user login attempt");
	    processClientStarted(index);
	    return;
	} else {
	    globalConnectionList[index].user = user[0];
	    globalConnectionList[index].aesKey = user[0].password;
	    servicelog("User " + user[0].username + " logging in");
	    var plainChallenge = getNewChallenge();
	    servicelog("plainChallenge:   " + plainChallenge);
	    globalConnectionList[index].challenge = JSON.stringify(plainChallenge);
	    sendable = { type: "loginChallenge",
			 content: plainChallenge };
	    sendCipherTextToClient(index, sendable);
	}
    }
}

function processLoginResponse(index, content) {
    var sendable;
    var plainResponse = Aes.Ctr.decrypt(content, globalConnectionList[index].user.password, 128);
    if(globalConnectionList[index].challenge === plainResponse) {
	servicelog("User login OK");
	setState(index, "loggedIn");
	setStatustoClient(index, "Login OK");
        sendable = {type: "calendarData",
		    content: createCalendarSendable(globalConnectionList[index].user.username) };
	sendCipherTextToClient(index, sendable);
    } else {
	servicelog("User login failed");
	processClientStarted(index);
    }
}

function processCreateAccount(index, content) {
    var sendable;
    servicelog("temp passwd: " + JSON.stringify(globalConnectionList[index].aesKey));
    var account = JSON.parse(Aes.Ctr.decrypt(content, globalConnectionList[index].aesKey, 128));
    if(stateIs(index, "newUserValidated")) {
	servicelog("Request for new user: [" + account.username + "]");
	if(!createAccount(account)) {
	    servicelog("Account [" + account.username + "] already exists!");
	    setStatustoClient(index, "Account already exists!");
	    sendable = { type: "createNewAccount" };
	    sendPlainTextToClient(index, sendable);
	    return;
	} else {
	    processClientStarted(index);
	    setStatustoClient(index, "Account created!");
	    return;
	}
    }
    if(stateIs(index, "oldUserValidated")) {
	servicelog("Request account change for user: [" + account.username + "]");
	var user = getUserByUserame(account.username);
	if(user.length === 0) {
	    processClientStarted(index);
	    setStatustoClient(index, "Illegal user operation!");
	    return;
	} else {
	    processClientStarted(index);
	    if(updateUserAccount(account)) {
		setStatustoClient(index, "Account updated!");
	    } else {
		setStatustoClient(index, "Account update failed!");
	    }
	    return;
	}
    }
}

function processConfirmEmail(index, content) {
    servicelog("Request for email verification: [" + content + "]");
    sendVerificationEmail(index, content);
    processClientStarted(index);
    setStatustoClient(index, "Email sent!");
}

function processValidateAccount(index, content) {
    if(!content.email || !content.challenge) {
	servicelog("Illegal validate account message");
	processClientStarted(index);
	return;
    } else {
	servicelog("Validation code: " + JSON.stringify(content));
	account = validateAccountCode(content.email.toString());
	if((account !== false) && (Aes.Ctr.decrypt(content.challenge, account.token.key, 128)
				   === "clientValidating")) {
	    setState(index, "newUserValidated");
	    setStatustoClient(index, "Validation code correct!");
	    globalConnectionList[index].aesKey = account.token.key;
	    var newAccount = {email: account.email};
	    newAccount.buttonText = "Create Account!";
	    var user = getUserByEmail(account.email);
	    if(user.length !== 0) {
		newAccount.username = user[0].username;
		newAccount.realname = user[0].realname;
		newAccount.phone = user[0].phone;
		newAccount.buttonText = "Save Account!"
		setState(index, "oldUserValidated");
	    }
	    sendable = { type: "createNewAccount",
			 content: newAccount };
	    sendCipherTextToClient(index, sendable);
	    return;
	} else {
	    processClientStarted(index);
	    setStatustoClient(index, "Validation code failed!");
	    return;
	}
    }
}

function processSendReservation(index, content) {
    var reservation = JSON.parse(Aes.Ctr.decrypt(content, globalConnectionList[index].aesKey, 128));
    servicelog("received reservation: " + JSON.stringify(reservation));
    var reservationData = datastorage.read("reservations");
    var newReservations = reservationData.reservations.filter(function(r) {
	return ((r.user !== globalConnectionList[index].user.username) || (r.state === "reserved"));
    });
    if(reservation.reservation.length !== 0) {
	newReservations.push({ user: globalConnectionList[index].user.username,
			       reservation: reservation.reservation,
			       state: "pending" });
    }
    if(datastorage.write("reservations", { reservations: newReservations }) === false) {
	servicelog("Reservation database write failed");
    } else {
	servicelog("Updated reservation database: " + JSON.stringify(reservationData));
    }
    setStatustoClient(index, "Reservation sent");
    sendable = {type: "calendarData",
		content: createCalendarSendable(globalConnectionList[index].user.username) };
    sendCipherTextToClient(index, sendable);
    var reservationTotals = calculateReservationTotals(reservation);
    sendReservationEmail(index, reservationTotals);
}

function getDayType(day) {
    var calendarData = datastorage.read("calendar");
    var targetDay;
    calendarData.season.forEach(function(w) {
	w.days.forEach(function(d) {
	    if (d.date === day) { targetDay = d; }
	});
    });
    return targetDay;
}

function calculateReservationTotals(reservation) {
    if(reservation.reservation.length === 0) {
	return false;
    }
    var weekDays = reservation.reservation
	.filter(function(d) { return getDayType(d).type === "weekday"; }).length;
    var weekendDays = reservation.reservation
	.filter(function(d) { return getDayType(d).type === "weekend"; }).length;
    var discount = 0;
    if(((weekDays + weekendDays) > 7) && (weekendDays > 1)) { discount = 100; }
    if(((weekDays + weekendDays) > 14) && (weekendDays > 3)) { discount = 200; }
    if(((weekDays + weekendDays) > 21) && (weekendDays > 5)) { discount = 300; }
    if(((weekDays + weekendDays) > 28) && (weekendDays > 7)) { discount = 400; }
    var totalPrice = (weekDays * 75) + (weekendDays * 150);
    return "     Days: " + JSON.stringify(reservation.reservation) + "\r\n" +
    "     Reservation for " + weekDays + "+" + weekendDays + " days: " + (totalPrice - discount) +
	" euros, including discount of " + discount + " euros.";
}

function readUserData() {
    userData = datastorage.read("users");
    if(userData === false) {
	servicelog("User database read failed");
    } 
    return userData;
}

function updateUserAccount(account) {
    var userData = readUserData();
 
    if(userData.users.filter(function(u) {
	return u.username === account.username;
    }).length === 0) {
	return false;
    } else {
	var newUserData = { users : [] };
	newUserData.users = userData.users.filter(function(u) {
	    return u.username !== account.username;
	});
	account.hash = sha1.hash(account.username);
	newUserData.users.push(account);
	if(datastorage.write("users", newUserData) === false) {
	    servicelog("User database write failed");
	} else {
	    servicelog("Updated User Account: " + JSON.stringify(account));
	}
	return true;
    }
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
	userData.users.push(account);
	if(datastorage.write("users", userData) === false) {
	    servicelog("User database write failed");
	    return false;
	} else {
	    return true;
	}
    }
}

function validateAccountCode(code) {
    var userData = datastorage.read("pending");
    if(Object.keys(userData).length === 0) {
	servicelog("Empty pending requests database, bailing out");
	return false;
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

	if(datastorage.write("pending", newUserData) === false) {
	    servicelog("Pending requests database write failed");
	} else {
	    servicelog("Removed pending request from database");
	}
	return target[0];
    }
}

function sendVerificationEmail(index, recipientAddress) {
    var userData = datastorage.read("pending");
    var request = { email: recipientAddress,
		    token: generateEmailToken(recipientAddress),
		    date: new Date().getTime() };
    userData.pending.push(request);
    if(datastorage.write("pending", userData) === false) {
	servicelog("Pending database write failed");
    }
    var emailData = datastorage.read("email");
    var emailBody = "You have requested a new account or password reset of Varauskalenteri.\r\n\r\n" +
	"Copy the following code to the \"validation code\" field and push \"Validate Account!\" button\r\n" +
	"Your validation code: " + request.token.mail +  request.token.key + "\r\n\r\n" +
	"   -Administrator-\r\n";
    if(emailData.blindlyTrust) {
	servicelog("Trusting self-signed certificates");
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }
    email.server.connect({
	user: emailData.user,
	password: emailData.password,
	host: emailData.host,
	ssl: emailData.ssl
    }).send({ text: emailBody,
	      from: emailData.sender,
	      to: recipientAddress,
	      subject: "Your password for Varauskalenteri" }, function(err, message) {
		  if(err) {
		      servicelog(err + " : " + JSON.stringify(message));
		      setStatustoClient(index, "Failed sending email!");
		  } else {
		      servicelog("Sent password reset email to " + recipientAddress);
		      setStatustoClient(index, "Sent email");
		  }
	      });
}

function sendReservationEmail(index, reservationTotals) {
    var recipientAddress = globalConnectionList[index].user.email;
    var emailData = datastorage.read("email");
    if(reservationTotals === false) {
	var emailBody = "You have cancelled all pending reservations to Varauskalenteri.\r\n\r\n" +
	    "   -Administrator-\r\n";
    } else {
	var emailBody = "You have made following reservation to Varauskalenteri.\r\n\r\n" +
	    reservationTotals + "\r\n\r\n" +
	    "The administrator will contact you soon to confirm the reservation.\r\n\r\n" +
	    "   -Administrator-\r\n";
    }
    if(emailData.blindlyTrust) {
	servicelog("Trusting self-signed certificates");
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }
    email.server.connect({
	user: emailData.user,
	password: emailData.password,
	host: emailData.host,
	ssl: emailData.ssl
    }).send({ text: emailBody,
	      from: emailData.sender,
	      to: recipientAddress,
	      subject: "Your new reservation to Varauskalenteri" }, function(err, message) {
		  if(err) {
		      servicelog(err + " : " + JSON.stringify(message));
		      setStatustoClient(index, "Failed sending email!");
		  } else {
		      servicelog("Sent reservation confirm email to " + recipientAddress);
		      setStatustoClient(index, "Sent email");
		  }
	      });
}

function generateEmailToken(email) {
    return { mail: sha1.hash(email).slice(0, 8),
	     key: sha1.hash(globalSalt + JSON.stringify(new Date().getTime())).slice(0, 16) };
}

function getNewChallenge() {
    return ("challenge_" + sha1.hash(globalSalt + new Date().getTime().toString()) + "1");
}

function createCalendarSendable(user) {
    var calendarData = datastorage.read("calendar");
    var weeks = [];
    calendarData.season.forEach(function(w) {
	var days = [];
	w.days.forEach(function(d) {
	    days.push({ date: d.date,
			type: d.type,
			items: getReservationsForDay(d, user) });
	});
	weeks.push({ week: w.week, days: days });
    });

    return { year: calendarData.year, season: weeks };
}

function getReservationsForDay(day, user) {
    var itemData = datastorage.read("rentables");
    var reservationData = datastorage.read("reservations");
    var reservation = [];
    reservationData.reservations.forEach(function(r) {
	if(r.reservation.filter(function(f) {
	    return f === day.date
	}).length !== 0 ) {
	    if(r.user === user) {
		reservation.push({user: r.user, state: r.state});
	    } else {
		reservation.push({user: "", state: r.state});
	    }
	}
    });

    // if there is a confirmed registration return it
    var result = reservation.filter(function(r) { return r.state === "reserved"; });
    if(result.length !== 0) {
	if(result[0].user === user) { return { state: "own_confirmed" }; }
	else { return { state: "other_confirmed" }; }
    }

    // check and return pending registrations
    var ownReservation = reservation.filter(function(r) { return r.user === user; }).length;
    var otherReservation = reservation.filter(function(r) { return r.user !== user; }).length;
    if((ownReservation === 0) && (otherReservation === 0)) return { state: "free" };
    if(ownReservation === 0) return { state: "other_reserved" };
    if(otherReservation === 0) return { state: "own_reserved" };
    return { state: "both_reserved" };
}

// datastorage.setLogger(servicelog);
datastorage.initialize("users", { users : [] });
datastorage.initialize("pending", { pending : [] });
datastorage.initialize("calendar", { year : "2016", season : [] });
datastorage.initialize("reservations", { reservations : [] });
datastorage.initialize("rentables", { rentables : [] });
datastorage.initialize("language", { language : [ "finnish" , "english" ], substitution : [] });
datastorage.initialize("email", { host : "smtp.your-email.com",
				  user : "username",
				  password : "password",
				  sender : "you <username@your-email.com>",
				  ssl : true,
				  blindlyTrust : true });

webServer.listen(8080, function() {
    servicelog("Waiting for client connection to port 8080...");
});
