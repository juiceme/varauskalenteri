var framework = require("./framework/framework.js");
var datastorage = require('./framework/datastorage/datastorage.js');


// Application specific part starts from here

function handleApplicationMessage(cookie, decryptedMessage) {
    if(decryptedMessage.type === "resetToMain") {
        processResetToMainState(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "getSeasonsForEdit") {
        processGetSeasonsForEdit(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "saveSeasonData") {
        processSaveSeasonData(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "getSeasonDataForShow") {
        processGetSeasonDataForShow(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "calendarDayClicked") {
        processCalendarDayClicked(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "checkReservations") {
        processCheckReservations(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "getReservationsForApprove") {
        processGetReservationsForApprove(cookie, decryptedMessage.content); }
}


// Administration UI panel requires application to provide needed priviliges

function createAdminPanelUserPriviliges() {
    // at least a "view" privilige is nice-to-have, add others as you need them.
    return [ { privilige: "view", code: "v" },
	     { privilige: "edit", code: "ed" },
	     { privilige: "edit-seasons", code: "se" },
	     { privilige: "approve", code: "ap" } ];
}


// Define the top button panel, always visible.
// The panel automatically contains "Logout" and "Admin Mode" buttons so no need to include those.

function createTopButtonList(cookie) {
    return [ { button: { text: "Edit Seasons", callbackMessage: "getSeasonsForEdit" },
	       priviliges: [ "edit-seasons" ] },
	     { button: { text: "Approve Reservations", callbackMessage: "getReservationsForApprove" },
	       priviliges: [ "approve" ] } ];
}


// Show up Main UI panel

function processResetToMainState(cookie, content) {
    // this shows up the first UI panel when uses login succeeds or other panels send "OK" / "Cancel" 
    framework.servicelog("User session reset to main state");
    cookie.user = datastorage.read("users").users.filter(function(u) {
	return u.username === cookie.user.username;
    })[0];
    sendMainUiPanel(cookie);
}


function sendMainUiPanel(cookie) {
    if(!framework.userHasPrivilige("view", cookie.user)) {
	var sendable = { type: "createUiPage",
			 content: { topButtonList: framework.createTopButtons(cookie), frameList: [], buttonList: [] } };
	framework.sendCipherTextToClient(cookie, sendable);
    } else {
	sendCalendarView(cookie, null);
    }
}

function processGetSeasonDataForShow(cookie, content) {
    sendCalendarView(cookie, content.buttonData);
}

// cell reservation colours
var COLOR_FREE1 = '#f0f0f0';
var COLOR_FREE2 = '#d0d0d0';
var COLOR_OWN_RESERVED = '#6698ff';
var COLOR_OTHER_RESERVED = '#f1948a';
var COLOR_BOTH_RESERVED = '#ff00FF';
var COLOR_OWN_CONFIRMED = '#0041C2';
var COLOR_OTHER_CONFIRMED = '#FF0000';
var COLOR_OWN_UNCONFIRMED = '#82e0aa';

function sendCalendarView(cookie, currentSeason) {
    var topButtonList = framework.createTopButtons(cookie);
    var seasons = datastorage.read("seasons").seasons;

    // if no seasons created or no privilige to view, just display the top buttons
    if((seasons.length === 0) || (!framework.userHasPrivilige("view", cookie.user))) {
	var sendable = { type: "createUiPage",
			 content: { topButtonList: topButtonList, frameList: [], buttonList: [] } };
	framework.sendCipherTextToClient(cookie, sendable);
	return;
    }


    // currentSeason is top-of-stack when called for the first time
    if(currentSeason === null) { currentSeason = seasons.length - 1; }

    // if season is locked, no change of reservations is possible

    var season = seasons[currentSeason];
    var weekDays = [ "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday" ];
    var currentDate = getFirstDateOfISOWeek(parseInt(season.startWeek), parseInt(season.year));
    var endDate = getLastDateOfISOWeek(parseInt(season.endWeek), parseInt(season.year));
    var weekNumber = parseInt(season.startWeek);
    var nextDay = 1000*60*60*24;
    var dayNumber = 1;
    var items = [];

    items.push([ [ framework.createUiTextNode("", "") ],
		 [ framework.createUiMessageButton("previous",
						   "getSeasonDataForShow",
						   currentSeason - 1,
						   (currentSeason > 0)) ],
		 [ framework.createUiTextNode("", "") ],
		 [ framework.createUiTextNode("", "") ],
		 [ framework.createUiTextNode("", "") ],
		 [ framework.createUiTextNode("", "") ],
		 [ framework.createUiTextNode("", "") ],
		 [ framework.createUiMessageButton("next",
						   "getSeasonDataForShow",
						   currentSeason + 1,
						   (currentSeason < (seasons.length - 1))) ] ]);

    while(weekNumber <= parseInt(season.endWeek)) {
	var week = [ [ framework.createUiTextNode("weeknumber", "W" + weekNumber) ] ];
	weekDays.forEach(function(d) {
	    var colour;
	    var script = "return;";
	    var day = currentDate.getDate();
	    var month = currentDate.getMonth() + 1;
	    var reservation = getDailyReservation(season.year, month, day, cookie.user.username);
	    if(reservation === null) {
		// empty list of reservations, assume all are free
		reservation = "free";
	    }
	    var dayProperties = formatDayProperties(reservation, season.year, month, day, currentDate.getDay());
	    week.push([ framework.createUiHtmlCell("day_" + dayNumber , day + "." + month + "<br><br><br>",
						   dayProperties.colour, dayProperties.script) ]);
	    currentDate = new Date(currentDate.valueOf() + nextDay);
	    dayNumber++;
	});
	items.push(week);
	weekNumber++;
    }

    var mainPanel = { title: "Calendar for " + season.year,
                     frameId: 0,
                     header: [ { text: "Week" }, { text: weekDays[0] }, { text: weekDays[1] }, { text: weekDays[2] },
			       { text: weekDays[3] }, { text: weekDays[4] }, { text: weekDays[5] }, { text: weekDays[6] } ],
                     items: items };

    var frameList = [ { frameType: "fixedListFrame", frame: mainPanel } ];
    var sendable = { type: "createUiPage",
                     content: { topButtonList: topButtonList,
                                frameList: frameList,
				buttonList: [ { id: 501, text: "Check my reservations", callbackMessage: "checkReservations" } ] } };
    framework.sendCipherTextToClient(cookie, sendable);
}

function formatDayProperties(reservation, year, month, day, weekday) {
    if(reservation === "free") {
	colour = getFreeDayColour(weekday);
	script = "if(this.reservation === undefined) { this.reservation = false; } ; if(this.reservation) { this.style.backgroundColor = '" + colour + "' ; this.reservation = false; } else { this.style.backgroundColor = '" + COLOR_OWN_UNCONFIRMED + "' ; this.reservation = true; } ; sendToServerEncrypted('calendarDayClicked', { userData: { date: { year: " + year + ", month: " + month + ", day: " + day + "}, value: this.reservation } } ); return false;";
    }
    if(reservation === "own-reserved") {
	colour = COLOR_OWN_RESERVED;
	script = "if(this.reservation === undefined) { this.reservation = true; } ; if(this.reservation) { this.style.backgroundColor = '" + getFreeDayColour(weekday) + "' ; this.reservation = false; } else { this.style.backgroundColor = '" + COLOR_OWN_UNCONFIRMED + "' ; this.reservation = true; } ; sendToServerEncrypted('calendarDayClicked', { userData: { date: { year: " + year + ", month: " + month + ", day: " + day + "}, value: this.reservation } } ); return false;";
    }
    if(reservation === "own-confirmed") {
	colour = COLOR_OWN_CONFIRMED;
    }
    if(reservation === "other-reserved") {
	colour = COLOR_OTHER_RESERVED;
	script = "if(this.reservation === undefined) { this.reservation = false; } ; if(this.reservation) { this.style.backgroundColor = '" + colour + "' ; this.reservation = false; } else { this.style.backgroundColor = '" + COLOR_OWN_UNCONFIRMED + "' ; this.reservation = true; } ; sendToServerEncrypted('calendarDayClicked', { userData: { date: { year: " + year + ", month: " + month + ", day: " + day + "}, value: this.reservation } } ); return false;";
    }
    if(reservation === "other-confirmed") {
	colour = COLOR_OTHER_CONFIRMED;
    }
    if(reservation === "own-other-reserved") {
	colour = COLOR_BOTH_RESERVED;
	script = "if(this.reservation === undefined) { this.reservation = true; } ; if(this.reservation) { this.style.backgroundColor = '" + COLOR_OTHER_RESERVED + "' ; this.reservation = false; } else { this.style.backgroundColor = '" + COLOR_OWN_UNCONFIRMED + "' ; this.reservation = true; } ; sendToServerEncrypted('calendarDayClicked', { userData: { date: { year: " + year + ", month: " + month + ", day: " + day + "}, value: this.reservation } } ); return false;";
    }
    return { colour: colour, script: script };
}

function processCalendarDayClicked(cookie, content) {
    var date = content.userData.date;
    var state = content.userData.value;
    var flag = false;
    var newReservations = [];

    datastorage.read("reservations").reservations.forEach(function(r) {
	if((r.date.year == date.year) &&
	   (r.date.month == date.month) &&
	   (r.date.day == date.day)) {
	    // matching date entry found
	    if(r.type === "confirmed") {
		// confirmed entries are not changed
		newReservations.push(r);
	    } else {
		if(r.user !== cookie.user.username) {
		    // if it contains other users data, dont change it
		    newReservations.push(r);
		} else {
		    if(!state) {
			// it's an own delete, just do nothing
		    }
		}
	    }
	} else {
	    // date is not a match, don't change it
	    newReservations.push(r);
	}
    });
    // if it's not a delete, add to list as none exits before
    if(state) {
	newReservations.push({ date: { year: date.year,
				       month: date.month,
				       day: date.day},
			       user: cookie.user.username,
			       type: "reserved" });
    }

    if(datastorage.write("reservations", { reservations: newReservations }) === false) {
	framework.servicelog("resrervations database write failed");
    } else {
	framework.servicelog("reservations database updated");
    }
}

function processCheckReservations(cookie, content) {
    framework.servicelog(JSON.stringify(content));
}

function getFreeDayColour(day) {
    if((day === 6) || (day === 0)) {
	return COLOR_FREE2;
    } else {
	return COLOR_FREE1;
    }
}

function getDailyReservation(year, month, day, user) {
    var reservations = datastorage.read("reservations").reservations;
    if(reservations.length === 0) { return null; }
    var res = reservations.filter(function(r) {
	if((r.date.year == year) && (r.date.month == month) && (r.date.day == day)) {
	    return true;
	}
    });
    if(res.length === 0) {
	return "free";
    }
    if(res.length > 1) {
	// the date has pending reservation for more than one user
	if(res.filter(function(r) {
	    if(r.user === user) { return true; }
	}).length === 0) {
	    return "other-reserved";
	} else {
	    return "own-other-reserved";
	}
    }
    if((res[0].user === user) && (res[0].type === "reserved")) {
	return "own-reserved";
    }
    if((res[0].user === user) && (res[0].type === "confirmed")) {
	return "own-confirmed";
    }
    if((res[0].user !== user) && (res[0].type === "reserved")) {
	return "other-reserved";
    }
    if((res[0].user !== user) && (res[0].type === "confirmed")) {
	return "other-confirmed";
    }
    // this should not be reached
    return "free";
}

function processGetSeasonsForEdit(cookie, content) {
    framework.servicelog("Client #" + cookie.count + " requests editing seasons");
    if(framework.userHasPrivilige("edit-seasons", cookie.user)) {
	var sendable;
	var topButtonList = framework.createTopButtons(cookie);
	var items = [];
	datastorage.read("seasons").seasons.forEach(function(t) {
	    items.push([ [ framework.createUiTextArea("year", t.year, 20) ],
			 [ framework.createUiTextArea("startweek", t.startWeek, 20) ],
			 [ framework.createUiTextArea("endweek", t.endWeek, 20) ],
			 [ framework.createUiCheckBox("locked", t.locked, "locked") ] ]);
	});

	var itemList = { title: "Seasons",
			 frameId: 0,
			 header: [ { text: "Name" }, { text: "start date" }, { text: "end date" },
				   { text: "Locked" },  { text: "Edit" }],
			 items: items,
			 newItem: [ [ framework.createUiTextArea("year", "<year>", 20) ],
				    [ framework.createUiTextArea("startweek", "<startweek>", 20) ],
				    [ framework.createUiTextArea("endweek", "<endweek>", 20) ],
				    [ framework.createUiCheckBox("locked", false, "locked") ] ] };

	var frameList = [ { frameType: "editListFrame", frame: itemList } ];

	sendable = { type: "createUiPage",
		     content: { topButtonList: topButtonList,
				frameList: frameList,
				buttonList: [ { id: 501, text: "OK", callbackMessage: "saveSeasonData" },
					      { id: 502, text: "Cancel",  callbackMessage: "resetToMain" } ] } };

	framework.sendCipherTextToClient(cookie, sendable);
	framework.servicelog("Sent NEW seasonData to client #" + cookie.count);	
    } else {
	framework.servicelog("User " + cookie.user.username + " does not have priviliges to edit seasons");
    }
}

function processSaveSeasonData(cookie, content) {
    framework.servicelog("Client #" + cookie.count + " requests saving seasons data");
    if(framework.userHasPrivilige("edit-seasons", cookie.user)) {
	var seasonsData = extractSeasonsDataFromInputData(content);
	if(seasonsData === null) {
	    sendTournamentMainData(cookie);
	    return;
	}
	if(datastorage.write("seasons", { seasons: seasonsData }) === false) {
	    framework.servicelog("seasons database write failed");
	} else {
	    framework.servicelog("seasons database updated");
	}
    } else {
	framework.servicelog("User " + cookie.user.username + " does not have priviliges to save seasons data");
    }
    sendMainUiPanel(cookie);
}

function processGetReservationsForApprove(cookie, content) {

}

// helpers

function getFirstDateOfISOWeek(w, y) {
    var simple = new Date(y, 0, 1 + (w - 1) * 7);
    var dow = simple.getDay();
    var ISOweekStartDay = simple;
    if (dow <= 4) {
	ISOweekStartDay.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
	ISOweekStartDay.setDate(simple.getDate() + 8 - simple.getDay());
    }
    return ISOweekStartDay;
}

function getLastDateOfISOWeek(w, y) {
    var nextDAy = 1000*60*60*24;
    return new Date(getFirstDateOfISOWeek(w, y).valueOf() + (nextDAy * 6));
}


// input data verification and formatters

function inputItemsFailVerification(data) {
    if(data.items === undefined) {
	framework.servicelog("inputData does not contain items");
	return true;
    }
    if(data.buttonList === undefined) {
	framework.servicelog("inputData does not contain buttonList");
	return true;
    }
    return false;
}

function extractSeasonsDataFromInputData(data) {
    if(inputItemsFailVerification(data)) {
	return null;
    }
    var seasons = [];
    data.items.forEach(function(i) {
	i.frame.forEach(function(s) {
	    seasons.push({ year: s[0][0].value,
			   startWeek: s[1][0].value,
			   endWeek: s[2][0].value,
			   locked: s[3][0].checked });
	});
    });
    return seasons;
}


// Push callbacks to framework

framework.setCallback("datastorageRead", datastorage.read);
framework.setCallback("datastorageWrite", datastorage.write);
framework.setCallback("datastorageInitialize", datastorage.initialize);
framework.setCallback("handleApplicationMessage", handleApplicationMessage);
framework.setCallback("processResetToMainState", processResetToMainState);
framework.setCallback("createAdminPanelUserPriviliges", createAdminPanelUserPriviliges);
framework.setCallback("createTopButtonList", createTopButtonList);


// Initialize application-specific datastorages

framework.initializeDataStorages();
datastorage.initialize("seasons", { seasons: [] }, true);
datastorage.initialize("reservations", { reservations: [] }, true);


// Start the web interface

framework.setApplicationName("Varauskalenteri");
framework.startUiLoop();

