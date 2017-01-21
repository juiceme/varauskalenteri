var websocket = require("websocket");
var http = require("http");
var fs = require("fs");
var datastorage = require('./datastorage/datastorage.js');
var userauth = require('./userauth/userauth.js');

function servicelog(s) {
    console.log((new Date()) + " --- " + s);
}

function printLanguageVariable(tag, language) {
    return "var " + tag + " = \"" + userauth.getLanguageText(language, tag) + "\";"
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
    var uabody = userauth.getClientBody();
    var clientbody = fs.readFileSync("./clientbody.js", "utf8");
    var sendable = clienthead + variables + clientbody + uabody + "</script></body></html>";
    response.writeHeader(200, { "Content-Type": "text/html",
                                "X-Frame-Options": "deny",
                                "X-XSS-Protection": "1; mode=block",
                                "X-Content-Type-Options": "nosniff" });
    response.write(sendable);
    response.end();
    servicelog("Respond with client to: " + JSON.stringify(request.headers));
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
    var defaultUserRights = { priviliges : "user" };
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

	    servicelog("Incoming message: " + JSON.stringify(receivable));
	    var type = receivable.type;
	    var content = receivable.content;

            if(type === "clientStarted") { userauth.processClientStarted(cookie); }
	    if(type === "userLogin") { userauth.processUserLogin(cookie, content); }
	    if(type === "createAccount") { userauth.processCreateAccount(cookie, defaultUserRights, content); }
	    if((type === "confirmEmail") &&
	       userauth.stateIs(cookie, "clientStarted")) { userauth.processConfirmEmail(cookie, content); }
	    if((type === "validateAccount") &&
	       userauth.stateIs(cookie, "clientStarted")) { userauth.processValidateAccount(cookie, content); }

	    if(type === "loginResponse") { processLoginResponse(cookie, content); }
	    if((type === "sendReservation") &&
	       userauth.stateIs(cookie, "loggedIn")) { processSendReservation(cookie, content); }
	    if((type === "adminRequest") &&
	       userauth.stateIs(cookie, "loggedIn")) { processSendAdminView(cookie, content); }
	    if((type === "userRequest") &&
	       userauth.stateIs(cookie, "loggedIn")) { processSendUserView(cookie, content); }
	    if((type === "adminChange") &&
	       userauth.stateIs(cookie, "loggedIn")) { processAdminChange(cookie, content); }
	}
    });

    connection.on('close', function(connection) {
	servicelog("Client #" + cookie.count  + " disconnected");
        cookie = {};
    });
});

function processLoginResponse(cookie, content) {
    var sendable;
    var plainResponse = userauth.decrypt(content, cookie);
    if(cookie.challenge === plainResponse) {
	servicelog("User login OK");
	userauth.setState(cookie, "loggedIn");
	userauth.setStatustoClient(cookie, "Login OK");
        sendable = { type: "calendarData",
		     content: createUserCalendarSendable(cookie.user.username) };
	userauth.sendCipherTextToClient(cookie, sendable);
	if(isUserAdministrator(cookie.user)) {
	    sendable = { type: "enableAdminButton", content:"none" };
	    userauth.sendCipherTextToClient(cookie, sendable);
	}
    } else {
	servicelog("User login failed");
	processClientStarted(cookie);
    }
}

function processSendReservation(cookie, content) {
    var reservation = JSON.parse(userauth.decrypt(content, cookie));
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
    userauth.setStatustoClient(cookie, "Reservation sent");
    sendable = { type: "calendarData",
		 content: createUserCalendarSendable(cookie.user.username) };
    userauth.sendCipherTextToClient(cookie, sendable);
    var reservationTotals = calculateReservationTotals(reservation);
    sendReservationEmail(cookie, reservationTotals);
}

function applyAdminReservationChange(cookie, userData) {
    var account = userauth.getUserByUserName(userData.user)[0];
    if(account.length === 0) {
	servicelog("Illegal username in reservation state change");
	return false;
    }

    // add pending and reserved entries to database

    userauth.setStatustoClient(cookie, "Reservation state changed");
    var sendable = { type: "adminView",
		     content: createAdminCalendarSendable() };
    userauth.sendCipherTextToClient(cookie, sendable);

    var dayList = "";
    if(userData.reserved.length !==0) {
	dayList += "     RESERVED: " + JSON.stringify(userData.reserved) + "\r\n";
    }
    if(userData.pending.length !==0) {
	dayList += "     PENDING:  " + JSON.stringify(userData.pending);
    }

    var emailSubject = userauth.getLanguageText(mainConfig.main.language, "RESERVATION_STATE_CHANGE_SUBJECT");
    var emailAdminSubject = userauth.getLanguageText(mainConfig.main.language, "RESERVATION_STATE_CHANGE_ADMIN_SUBJECT");
    var emailBody = userauth.fillTagsInText(userauth.getLanguageText(mainConfig.main.language,
						   "RESERVATION_STATE_CHANGE_GREETING"),
				   account.username,
				   dayList);
    var emailAdminBody = userauth.fillTagsInText(userauth.getLanguageText(mainConfig.main.language,
							"RESERVATION_STATE_CHANGE_ADMIN_GREETING"),
					account.username);
    userauth.sendEmail(cookie, emailSubject, emailBody, account.email, "reservation admin");
    userauth.sendEmail(cookie, emailAdminSubject, emailAdminBody, mainConfig.main.adminEmailAddess, "reservation admin");
}

function processSendAdminView(cookie, content) {
    if(!isUserAdministrator(cookie.user)) {
	servicelog("User " + cookie.user.username + " is not an administrator");
	processClientStarted(cookie);
	userauth.setStatustoClient(cookie, "Admin validation failed!");
	return;
    } else {
	servicelog("User " + cookie.user.username + " entering administrator mode");
	userauth.setStatustoClient(cookie, "Admin validation OK!");
	var sendable = { type: "adminView",
			 content: createAdminCalendarSendable() };
	userauth.sendCipherTextToClient(cookie, sendable);
    }
}

function processAdminChange(cookie, content) {
    if(!isUserAdministrator(cookie.user)) {
	servicelog("User " + cookie.user.username + " is not an administrator");
	processClientStarted(cookie);
	userauth.setStatustoClient(cookie, "Admin validation failed!");
	return;
    } else {
	var adminChange = JSON.parse(userauth.decrypt(content, cookie));
	servicelog("Administrative change by " + cookie.user.username + ": " +
		   JSON.stringify(adminChange));
	adminChange.change.forEach(function(userData) {
	    applyAdminReservationChange(cookie, userData);
	});
    }
}

function processSendUserView(cookie, content) {
    var sendable = { type: "calendarData",
		     content: createUserCalendarSendable(cookie.user.username) };
    userauth.sendCipherTextToClient(cookie, sendable);
    sendable = { type: "enableAdminButton", content:"none" };
    userauth.sendCipherTextToClient(cookie, sendable);
    servicelog("User " + cookie.user.username + " exiting administrator mode");
    userauth.setStatustoClient(cookie, "User validation OK!");
}

function isUserAdministrator(user) {
    return user.applicationData.priviliges === "admin";
}

function getDayType(day) {
    var targetDay = new Date();
    targetDay.setDate(day.split(".")[0]);
    targetDay.setMonth(day.split(".")[1]-1);
    targetDay.setYear(day.split(".")[2]);
    return (targetDay.getDay() > 0 && targetDay.getDay() < 6) ? "weekday" : "weekend";
}

function calculateReservationTotals(reservation) {
    if(reservation.reservation.length === 0) {
	return false;
    }
    var weekDays = reservation.reservation
	.filter(function(d) { return getDayType(d) === "weekday"; }).length;
    var weekendDays = reservation.reservation
	.filter(function(d) { return getDayType(d) === "weekend"; }).length;
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

function sendReservationEmail(cookie, reservationTotals) {
    var recipientAddress = cookie.user.email;
    var emailData = datastorage.read("email");
    if(reservationTotals === false) {
	var emailSubject = userauth.getLanguageText(mainConfig.main.language, "RESERVATION_CANCEL_SUBJECT");
	var emailAdminSubject = userauth.getLanguageText(mainConfig.main.language, "RESERVATION_CANCEL_ADMIN_SUBJECT");
	var emailBody = userauth.fillTagsInText(userauth.getLanguageText(mainConfig.main.language,
						       "RESERVATION_CANCEL_GREETING"),
				       userauth.getUserByEmail(recipientAddress)[0].username);
	var emailAdminBody = userauth.fillTagsInText(userauth.getLanguageText(mainConfig.main.language,
						       "RESERVATION_CANCEL_ADMIN_GREETING"),
				       userauth.getUserByEmail(recipientAddress)[0].username);
    } else {
	var emailSubject = userauth.getLanguageText(mainConfig.main.language, "RESERVATION_CONFIRM_SUBJECT");
	var emailAdminSubject = userauth.getLanguageText(mainConfig.main.language, "RESERVATION_CONFIRM_ADMIN_SUBJECT");
	var emailBody = userauth.fillTagsInText(userauth.getLanguageText(mainConfig.main.language,
						       "RESERVATION_CONFIRM_GREETING"),
				       userauth.getUserByEmail(recipientAddress)[0].username,
				       reservationTotals);
	var emailAdminBody = userauth.fillTagsInText(userauth.getLanguageText(mainConfig.main.language,
							    "RESERVATION_CONFIRM_ADMIN_GREETING"),
					    userauth.getUserByEmail(recipientAddress)[0].username);
    }
    userauth.sendEmail(cookie, emailSubject, emailBody, recipientAddress, "reservation update");
    userauth.sendEmail(cookie, emailAdminSubject, emailAdminBody, mainConfig.main.adminEmailAddess, "reservation update");
}

function createAdminCalendarSendable() {
    return createCalendarSendable(null, 1);
}

function createUserCalendarSendable(user) {
    return createCalendarSendable(user);
}

function createCalendarSendable(user, admin) {
    var calendarData = datastorage.read("calendar");
    var currentDay = new Date(calendarData.startDay);
    var weeks = [];
    for(var w = calendarData.startWeek; w < (calendarData.endWeek + 1); w++) {
	var days = [];
	for( var d = 1; d < 8; d++) {
	    dayDate = currentDay.getDate() + "." + (currentDay.getMonth() + 1);
	    if(admin === 1) { var items = getAllReservationsForDay(dayDate + "." + calendarData.year); }
	    else { var items = getReservationsForDay(dayDate + "." + calendarData.year, user); }
	    days.push({ date: dayDate,
			type: (currentDay.getDay() > 0 && currentDay.getDay() < 6) ? "weekday" : "weekend",
			items: items });
	    currentDay.setDate(currentDay.getDate()+1);
	}
	weeks.push({ week: w, days: days });
    }

    return { year: calendarData.year, season: weeks };
}


function getReservationsForDay(date, user) {
    var itemData = datastorage.read("rentables");
    var reservationData = datastorage.read("reservations");
    var reservation = [];
    reservationData.reservations.forEach(function(r) {
	if(r.reservation.filter(function(f) {
	    return f === date
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

function getAllReservationsForDay(date) {
    var reservationData = datastorage.read("reservations");
    var reservation = [];
    reservationData.reservations.forEach(function(r) {
	if(r.reservation.filter(function(f) {
	    return f === date
	}).length !== 0 ) {
	    reservation.push({user: r.user, state: r.state});
	}
    });
    return reservation;
}



// datastorage.setLogger(servicelog);
datastorage.initialize("main", { main : { port : 8080, language : "english",
					  adminEmailAddess : "you <username@your-email.com>",
					  siteFullUrl : "http://url.to.varauskalenteri/" } });
datastorage.initialize("users", { users : [] }, true);
datastorage.initialize("calendar", { year : "2016", startDay: "5/2/2016", startWeek: 18, endWeek: 35 });
datastorage.initialize("reservations", { reservations : [] }, true);
datastorage.initialize("rentables", { rentables : [] });
datastorage.initialize("language", { language : [ "finnish" , "english" ], substitution : [] });
datastorage.initialize("email", { host : "smtp.your-email.com",
				  user : "username",
				  password : "password",
				  sender : "you <username@your-email.com>",
				  ssl : true,
				  blindlyTrust : true });

// userauth needs to access datastorage and servicelog;
userauth.initialize(datastorage, servicelog);

var mainConfig = datastorage.read("main");

webServer.listen(mainConfig.main.port, function() {
    servicelog("Waiting for client connection to port " + mainConfig.main.port + "...");
});
