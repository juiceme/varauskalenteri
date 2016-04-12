var websocket = require("websocket");
var http = require("http");
var fs = require("fs");
var email = require("emailjs/email");
var Aes = require('./crypto/aes.js');
Aes.Ctr = require('./crypto/aes-ctr.js');
var sha1 = require('./crypto/sha1.js');
var datastorage = require('./datastorage/datastorage.js');

var globalSalt = sha1.hash(JSON.stringify(new Date().getTime()));

function servicelog(s) {
    console.log((new Date()) + " --- " + s);
}

function setStatustoClient(cookie, status) {
    var sendable = { type: "statusData",
		     content: status };
    cookie.connection.send(JSON.stringify(sendable));
}

function sendPlainTextToClient(cookie, sendable) {
    cookie.connection.send(JSON.stringify(sendable));
}

function sendCipherTextToClient(cookie, sendable) {
    var cipherSendable = { type: sendable.type,
			   content: Aes.Ctr.encrypt(JSON.stringify(sendable.content),
						    cookie.aesKey, 128) };
    cookie.connection.send(JSON.stringify(cipherSendable));
}

function printLanguageVariable(tag, language) {
    return "var " + tag + " = \"" + getLanguageText(language, tag) + "\";"
}

function getClientVariables(language) {
    var language = mainConfig.main.language;
    return "var WEBSOCK_PORT = " + mainConfig.main.port + ";\n" +
	printLanguageVariable("CLIENT_CALENDARTEXT_FREE", language) + "\n" +
	printLanguageVariable("CLIENT_CALENDARTEXT_OWN_RESERVED", language) + "\n" +
	printLanguageVariable("CLIENT_CALENDARTEXT_OTHER_RESERVED", language) + "\n" +
	printLanguageVariable("CLIENT_CALENDARTEXT_BOTH_RESERVED", language) + "\n" +
	printLanguageVariable("CLIENT_CALENDARTEXT_OWN_CONFIRMED", language) + "\n" +
	printLanguageVariable("CLIENT_CALENDARTEXT_OTHER_CONFIRMED", language) + "\n" +
	printLanguageVariable("CLIENT_CALENDARTEXT_OWN_MARKED", language) + "\n" +
	printLanguageVariable("HELPTEXT_LOGIN_A", language) + "\n" +
	printLanguageVariable("HELPTEXT_LOGIN_B", language) + "\n" +
	printLanguageVariable("HELPTEXT_LOGIN_C", language) + "\n" +
	printLanguageVariable("HELPTEXT_EMAIL_A", language) + "\n" +
	printLanguageVariable("HELPTEXT_EMAIL_B", language) + "\n" +
	printLanguageVariable("HELPTEXT_CALENDAR_A", language) + "\n" +
	printLanguageVariable("HELPTEXT_CALENDAR_B", language) + "\n" +
	printLanguageVariable("HELPTEXT_CALENDAR_C", language) + "\n" +
	printLanguageVariable("HELPTEXT_CALENDAR_D", language) + "\n\n";
}

var webServer = http.createServer(function(request,response){
    var clienthead = fs.readFileSync("./clienthead", "utf8");
    var variables = getClientVariables();
    var clientbody = fs.readFileSync("./clientbody.js", "utf8");
    var aesjs = fs.readFileSync("./crypto/aes.js", "utf8");
    var aesctrjs = fs.readFileSync("./crypto/aes-ctr.js", "utf8");
    var sha1js = fs.readFileSync("./crypto/sha1.js", "utf8");
    var sendable = clienthead + variables + clientbody + aesjs + aesctrjs + sha1js + "</script></body></html>";
    response.writeHeader(200, {"Content-Type": "text/html"});
    response.write(sendable);
    response.end();
});

wsServer = new websocket.server({
    httpServer: webServer,
    autoAcceptConnections: false
});

var connectionCount = 0;

wsServer.on('request', function(request) {
    servicelog("Connection from origin " + request.origin);
    var connection = request.accept(null, request.origin);
    var cookie = { count:connectionCount++, connection:connection, state:"new" };
    var sendable;
    servicelog("Client #" + cookie.count  + " accepted");

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

            if(type === "clientStarted") { processClientStarted(cookie); }
	    if(type === "userLogin") { processUserLogin(cookie, content); }
	    if(type === "loginResponse") { processLoginResponse(cookie, content); }
	    if(type === "createAccount") { processCreateAccount(cookie, content); }
	    if((type === "confirmEmail") &&
	       stateIs(cookie, "clientStarted")) { processConfirmEmail(cookie, content); }
	    if((type === "validateAccount") &&
	       stateIs(cookie, "clientStarted")) { processValidateAccount(cookie, content); }
	    if((type === "sendReservation") &&
	       stateIs(cookie, "loggedIn")) { processSendReservation(cookie, content); }
	    if((type === "adminRequest") &&
	       stateIs(cookie, "loggedIn")) { processSendAdminView(cookie, content); }
	}
    });

    connection.on('close', function(connection) {
	servicelog("Client #" + cookie.count  + " disconnected");
        cookie = {};
    });
});

function stateIs(cookie, state) {
    return (cookie.state === state);
}

function setState(cookie, state) {
    cookie.state = state;
}

function processClientStarted(cookie) {
    if(cookie["user"] !== undefined) {
	if(cookie.user["username"] !== undefined) {
	    servicelog("User " + cookie.user.username + " logged out");
	}
    }
    servicelog("Sending initial login view to client #" + cookie.count);
    setState(cookie, "clientStarted");
    cookie.aesKey = "";
    cookie.user = {};
    cookie.challenge = "";
    var sendable = { type: "loginView" }
    sendPlainTextToClient(cookie, sendable);
    setStatustoClient(cookie, "Login");
}

function processUserLogin(cookie, content) {
    var sendable;
    if(!content.username) {
	servicelog("Illegal user login message");
	processClientStarted(cookie);
	return;
    } else {
	var user = getUserByHashedName(content.username);
	if(user.length === 0) {
	    servicelog("Unknown user login attempt");
	    processClientStarted(cookie);
	    return;
	} else {
	    cookie.user = user[0];
	    cookie.aesKey = user[0].password;
	    servicelog("User " + user[0].username + " logging in");
	    var plainChallenge = getNewChallenge();
	    servicelog("plainChallenge:   " + plainChallenge);
	    cookie.challenge = JSON.stringify(plainChallenge);
	    sendable = { type: "loginChallenge",
			 content: plainChallenge };
	    sendCipherTextToClient(cookie, sendable);
	}
    }
}

function processLoginResponse(cookie, content) {
    var sendable;
    var plainResponse = Aes.Ctr.decrypt(content, cookie.user.password, 128);
    if(cookie.challenge === plainResponse) {
	servicelog("User login OK");
	setState(cookie, "loggedIn");
	setStatustoClient(cookie, "Login OK");
        sendable = { type: "calendarData",
		     content: createUserCalendarSendable(cookie.user.username) };
	sendCipherTextToClient(cookie, sendable);
	if(isUserAdministrator(cookie.user)) {
	    sendable = { type: "enableAdminButton", content:"none" };
	    sendCipherTextToClient(cookie, sendable);
	}
    } else {
	servicelog("User login failed");
	processClientStarted(cookie);
    }
}

function processCreateAccount(cookie, content) {
    var sendable;
    servicelog("temp passwd: " + JSON.stringify(cookie.aesKey));
    var account = JSON.parse(Aes.Ctr.decrypt(content, cookie.aesKey, 128));

    if(typeof(account) !== "object") {
	servicelog("Received illegal account creation data");
	return false;
    }
    if(account["username"] === undefined) {
	servicelog("Received account creation data without username");
	return false;
    }

    if(stateIs(cookie, "newUserValidated")) {
	servicelog("Request for new user: [" + account.username + "]");
	if(!createAccount(account)) {
	    servicelog("Cannot create account " + account.username);
	    // there are more possible reasons than already existing account, however user needs
	    // not know about that, hence display only "Account already exists!" in client...
	    setStatustoClient(cookie, "Account already exists!");
	    sendable = { type: "createNewAccount" };
	    sendPlainTextToClient(cookie, sendable);
	    return;
	} else {
	    processClientStarted(cookie);
	    setStatustoClient(cookie, "Account created!");
	    var emailSubject = getLanguageText(mainConfig.main.language, "NEW_ACCOUNT_CONFIRM_SUBJECT");
	    var emailAdminSubject = getLanguageText(mainConfig.main.language, "NEW_ACCOUNT_CONFIRM_ADMIN_SUBJECT");
	    var emailBody = fillTagsInText(getLanguageText(mainConfig.main.language,
							   "NEW_ACCOUNT_CONFIRM_GREETING"),
					   account.username,
					   mainConfig.main.siteFullUrl);
	    var emailAdminBody = fillTagsInText(getLanguageText(mainConfig.main.language,
								"NEW_ACCOUNT_CONFIRM_ADMIN_GREETING"),
						account.username);
	    sendEmail(cookie, emailSubject, emailBody, account.email);
	    sendEmail(cookie, emailAdminSubject, emailAdminBody, mainConfig.main.adminEmailAddess);
	    return;
	}
    }
    if(stateIs(cookie, "oldUserValidated")) {
	servicelog("Request account change for user: [" + account.username + "]");
	var user = getUserByUserName(account.username);
	if(user.length === 0) {
	    processClientStarted(cookie);
	    setStatustoClient(cookie, "Illegal user operation!");
	    return;
	} else {
	    if(updateUserAccount(cookie, account)) {
		setStatustoClient(cookie, "Account updated!");
	    } else {
		setStatustoClient(cookie, "Account update failed!");
	    }
	    processClientStarted(cookie);
	    return;
	}
    }
}

function processConfirmEmail(cookie, content) {
    servicelog("Request for email verification: [" + content + "]");
    sendVerificationEmail(cookie, content);
    processClientStarted(cookie);
    setStatustoClient(cookie, "Email sent!");
}

function processValidateAccount(cookie, content) {
    if(!content.email || !content.challenge) {
	servicelog("Illegal validate account message");
	processClientStarted(cookie);
	return;
    } else {
	servicelog("Validation code: " + JSON.stringify(content));
	account = validateAccountCode(content.email.toString());
	if((account !== false) && (Aes.Ctr.decrypt(content.challenge, account.token.key, 128)
				   === "clientValidating")) {
	    setState(cookie, "newUserValidated");
	    setStatustoClient(cookie, "Validation code correct!");
	    cookie.aesKey = account.token.key;
	    var newAccount = {email: account.email};
	    newAccount.buttonText = "Create Account!";
	    var user = getUserByEmail(account.email);
	    if(user.length !== 0) {
		newAccount.username = user[0].username;
		newAccount.realname = user[0].realname;
		newAccount.phone = user[0].phone;
		newAccount.buttonText = "Save Account!"
		setState(cookie, "oldUserValidated");
	    }
	    sendable = { type: "createNewAccount",
			 content: newAccount };
	    sendCipherTextToClient(cookie, sendable);
	    return;
	} else {
	    processClientStarted(cookie);
	    setStatustoClient(cookie, "Validation code failed!");
	    return;
	}
    }
}

function processSendReservation(cookie, content) {
    var reservation = JSON.parse(Aes.Ctr.decrypt(content, cookie.aesKey, 128));
    servicelog("received reservation: " + JSON.stringify(reservation));
    var reservationData = datastorage.read("reservations");
    var newReservations = reservationData.reservations.filter(function(r) {
	return ((r.user !== cookie.user.username) || (r.state === "reserved"));
    });
    if(reservation.reservation.length !== 0) {
	newReservations.push({ user: cookie.user.username,
			       reservation: reservation.reservation,
			       state: "pending" });
    }
    if(datastorage.write("reservations", { reservations: newReservations }) === false) {
	servicelog("Reservation database write failed");
    } else {
	servicelog("Updated reservation database: " + JSON.stringify(reservationData));
    }
    setStatustoClient(cookie, "Reservation sent");
    sendable = { type: "calendarData",
		 content: createUserCalendarSendable(cookie.user.username) };
    sendCipherTextToClient(cookie, sendable);
    var reservationTotals = calculateReservationTotals(reservation);
    sendReservationEmail(cookie, reservationTotals);
}

function processSendAdminView(cookie, content) {
    if(!isUserAdministrator(cookie.user)) {
	servicelog("User " + cookie.user.username + " is not an administrator");
	processClientStarted(cookie);
	setStatustoClient(cookie, "Admin validation failed!");
	return;
    } else {
	servicelog("User " + cookie.user.username + " entering administrator mode");
	setStatustoClient(cookie, "Admin validation OK!");
	var reservationData = datastorage.read("reservations");
	var sendable = { type: "adminView",
			 content: createAdminCalendarSendable() };
	sendCipherTextToClient(cookie, sendable);
    }
}

function isUserAdministrator(user) {
    return user.priviliges === "administrator";
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

function updateUserAccount(cookie, account) {
    var userData = readUserData();
    var oldUserAccount = getUserByUserName(account.username);
    if(oldUserAccount.length === 0) {
	return false;
    } else {
	var newUserData = { users : [] };
	newUserData.users = userData.users.filter(function(u) {
	    return u.username !== account.username;
	});
	var newUserAccount = { username: account.username,
			       hash: sha1.hash(account.username),
			       password: account.password,
			       priviliges: oldUserAccount[0].priviliges };
	if(account["realname"] !== undefined) { newUserAccount.realname = account.realname; }
	if(account["email"] !== undefined) { newUserAccount.email = account.email; }
	if(account["phone"] !== undefined) { newUserAccount.phone = account.phone; }
	newUserData.users.push(newUserAccount);
	if(datastorage.write("users", newUserData) === false) {
	    servicelog("User database write failed");
	} else {
	    servicelog("Updated User Account: " + JSON.stringify(newUserAccount));
	}
	var emailSubject = getLanguageText(mainConfig.main.language, "PASSWORD_RESET_CONFIRM_SUBJECT");
	var emailAdminSubject = getLanguageText(mainConfig.main.language, "PASSWORD_RESET_CONFIRM_ADMIN_SUBJECT");
	var emailBody = fillTagsInText(getLanguageText(mainConfig.main.language,
						       "PASSWORD_RESET_CONFIRM_GREETING"),
				       account.username,
				       mainConfig.main.siteFullUrl);
	var emailAdminBody = fillTagsInText(getLanguageText(mainConfig.main.language,
							    "PASSWORD_RESET_CONFIRM_ADMIN_GREETING"),
					    account.username);
	sendEmail(cookie, emailSubject, emailBody, account.email);
	sendEmail(cookie, emailAdminSubject, emailAdminBody, mainConfig.main.adminEmailAddess);
	return true;
    }
}

function getUserByUserName(username) {
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
    if(account["password"] === undefined) {
	servicelog("Received account creation data without password");
	return false;
    }
    var userData = readUserData();
    if(userData.users.filter(function(u) {
	return u.username === account.username;
    }).length !== 0) {
	servicelog("Cannot create an existing user account");
	return false;
    } else {
	var newAccount = { username: account.username,
			   hash: sha1.hash(account.username),
			   password: account.password,
			   priviliges:"user" };
	if(account["realname"] !== undefined) { newAccount.realname = account.realname; }
	if(account["email"] !== undefined) { newAccount.email = account.email; }
	if(account["phone"] !== undefined) { newAccount.phone = account.phone; }
	userData.users.push(newAccount);
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

function sendVerificationEmail(cookie, recipientAddress) {
    var pendingData = datastorage.read("pending");
    var emailData = datastorage.read("email");
    var request = { email: recipientAddress,
		    token: generateEmailToken(recipientAddress),
		    date: new Date().getTime() };
    pendingData.pending.push(request);
    if(datastorage.write("pending", pendingData) === false) {
	servicelog("Pending database write failed");
    }
    if(getUserByEmail(recipientAddress).length === 0) {
	var emailSubject = getLanguageText(mainConfig.main.language, "NEW_ACCOUNT_REQUEST_SUBJECT");
	var emailBody = fillTagsInText(getLanguageText(mainConfig.main.language,
						       "NEW_ACCOUNT_REQUEST_GREETING"),
				       (request.token.mail + request.token.key));
    } else {
	var emailSubject = getLanguageText(mainConfig.main.language, "PASSWORD_RESET_SUBJECT");
	var emailBody = fillTagsInText(getLanguageText(mainConfig.main.language,
						       "PASSWORD_RESET_GREETING"),
				       getUserByEmail(recipientAddress)[0].username,
				       (request.token.mail + request.token.key));
    }
    sendEmail(cookie, emailSubject, emailBody, recipientAddress);
}


function sendReservationEmail(cookie, reservationTotals) {
    var recipientAddress = cookie.user.email;
    var emailData = datastorage.read("email");
    if(reservationTotals === false) {
	var emailSubject = getLanguageText(mainConfig.main.language, "RESERVATION_CANCEL_SUBJECT");
	var emailAdminSubject = getLanguageText(mainConfig.main.language, "RESERVATION_CANCEL_ADMIN_SUBJECT");
	var emailBody = fillTagsInText(getLanguageText(mainConfig.main.language,
						       "RESERVATION_CANCEL_GREETING"),
				       getUserByEmail(recipientAddress)[0].username);
	var emailAdminBody = fillTagsInText(getLanguageText(mainConfig.main.language,
						       "RESERVATION_CANCEL_ADMIN_GREETING"),
				       getUserByEmail(recipientAddress)[0].username);
    } else {
	var emailSubject = getLanguageText(mainConfig.main.language, "RESERVATION_CONFIRM_SUBJECT");
	var emailAdminSubject = getLanguageText(mainConfig.main.language, "RESERVATION_CONFIRM_ADMIN_SUBJECT");
	var emailBody = fillTagsInText(getLanguageText(mainConfig.main.language,
						       "RESERVATION_CONFIRM_GREETING"),
				       getUserByEmail(recipientAddress)[0].username,
				       reservationTotals);
	var emailAdminBody = fillTagsInText(getLanguageText(mainConfig.main.language,
							    "RESERVATION_CONFIRM_ADMIN_GREETING"),
					    getUserByEmail(recipientAddress)[0].username);
    }
    sendEmail(cookie, emailSubject, emailBody, recipientAddress);
    sendEmail(cookie, emailAdminSubject, emailAdminBody, mainConfig.main.adminEmailAddess);
}

function sendEmail(cookie, emailSubject, emailBody, recipientAddress) {
    var emailData = datastorage.read("email");
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
	      subject: emailSubject }, function(err, message) {
		  if(err) {
		      servicelog(err + " : " + JSON.stringify(message));
		      setStatustoClient(cookie, "Failed sending email!");
		  } else {
		      servicelog("Sent reservation confirm email to " + recipientAddress);
		      setStatustoClient(cookie, "Sent email");
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

function createAdminCalendarSendable() {
    return createCalendarSendable(null, 1);
}

function createUserCalendarSendable(user) {
    return createCalendarSendable(user);
}

function createCalendarSendable(user, admin) {
    var calendarData = datastorage.read("calendar");
    var weeks = [];
    calendarData.season.forEach(function(w) {
	var days = [];
	w.days.forEach(function(d) {
	    if(admin === 1) { var items = getAllReservationsForDay(d); }
	    else { var items = getReservationsForDay(d, user); }
	    days.push({ date: d.date,
			type: d.type,
			items: items });
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

function getAllReservationsForDay(day) {
    var reservationData = datastorage.read("reservations");
    var reservation = [];
    reservationData.reservations.forEach(function(r) {
	if(r.reservation.filter(function(f) {
	    return f === day.date
	}).length !== 0 ) {
	    reservation.push({user: r.user, state: r.state});
	}
    });
    return reservation;
}

function getLanguageText(language, tag) {
    var langData = datastorage.read("language");
    var langIndex = langData.language.indexOf(language);
    if(++langIndex === 0) { return false; }
    if(langData.substitution.filter(function(f) { return f.tag === tag }).length === 0) { return false; }
    return langData.substitution.filter(function(f) { return f.tag === tag })[0]["LANG" + langIndex];
}

function fillTagsInText(text) {
    for(var i = 1; i < arguments.length; i++) {
	var substituteString = "_SUBSTITUTE_TEXT_" + i + "_";
	text = text.replace(substituteString, arguments[i]);
    }
    return text;
}

// datastorage.setLogger(servicelog);
datastorage.initialize("main", { main : { port : 8080, language : "english",
					  adminEmailAddess : "you <username@your-email.com>",
					  siteFullUrl : "http://url.to.varauskalenteri/" } });
datastorage.initialize("users", { users : [] }, true);
datastorage.initialize("pending", { pending : [] }, true);
datastorage.initialize("calendar", { year : "2016", season : [] });
datastorage.initialize("reservations", { reservations : [] }, true);
datastorage.initialize("rentables", { rentables : [] });
datastorage.initialize("language", { language : [ "finnish" , "english" ], substitution : [] });
datastorage.initialize("email", { host : "smtp.your-email.com",
				  user : "username",
				  password : "password",
				  sender : "you <username@your-email.com>",
				  ssl : true,
				  blindlyTrust : true });

var mainConfig = datastorage.read("main");

webServer.listen(mainConfig.main.port, function() {
    servicelog("Waiting for client connection to port " + mainConfig.main.port + "...");
});
