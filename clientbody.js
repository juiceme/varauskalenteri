function handleApplicationRequests(receivable) {
    if(receivable.type == "calendarData") {
	var calendarData = receivable.content;
	document.body.replaceChild(createLogoutButton(),
				   document.getElementById("myLogoutButton"));
	document.body.replaceChild(createCalendarView(calendarData),
				   document.getElementById("myDiv1"));
	document.body.replaceChild(createCheckReservationButton(),
				   document.getElementById("myConfirmButton"));
	document.body.replaceChild(createCalendarHelpText(), document.getElementById("myHelpText"));
	return;
    }

    if(receivable.type == "enableAdminButton") {
	document.body.replaceChild(createAdminButton(),
				   document.getElementById("myAdminButton"));
	return;
    }

    if(receivable.type == "adminView") {
	var calendarData = receivable.content;
	document.body.replaceChild(createLogoutButton(),
				   document.getElementById("myLogoutButton"));
	document.body.replaceChild(createUserButton(),
				   document.getElementById("myAdminButton"));
	document.body.replaceChild(createCalendarView(calendarData, 1),
				   document.getElementById("myDiv1"));
	document.body.replaceChild(createCheckAdminButton(),
				   document.getElementById("myConfirmButton"));
	return;
    }
}


function createCalendarHelpText() {
    var helpTextBox = document.createElement("fieldset");
    helpTextBox.appendChild(document.createTextNode(decodeURIComponent(escape(HELPTEXT_CALENDAR_A))))
    helpTextBox.appendChild(document.createElement("br"));
    helpTextBox.appendChild(document.createElement("br"));
    helpTextBox.appendChild(document.createTextNode(decodeURIComponent(escape(HELPTEXT_CALENDAR_B))))
    helpTextBox.appendChild(document.createElement("br"));
    helpTextBox.appendChild(document.createElement("br"));
    helpTextBox.appendChild(document.createTextNode(decodeURIComponent(escape(HELPTEXT_CALENDAR_C))))
    helpTextBox.appendChild(document.createElement("br"));
    helpTextBox.appendChild(document.createElement("br"));
    helpTextBox.appendChild(document.createTextNode(decodeURIComponent(escape(HELPTEXT_CALENDAR_D))))
    helpTextBox.id = "myHelpText";

    return helpTextBox;
}




function createCalendarView(calendarData, admin) {
    var clearText = JSON.parse(Aes.Ctr.decrypt(calendarData, sessionPassword, 128));
    var table = document.createElement('table');
    var tableHeader = document.createElement('thead');
    tableHeader.appendChild(createHeader(clearText.year));
    var tableBody = document.createElement('tbody');
    tableBody.id = "myCalendar";

    clearText.season.forEach(function(week) {
	var row = createWeek(clearText.year, week, admin);
	tableBody.appendChild(row);
    });

    table.appendChild(tableHeader);
    table.appendChild(tableBody);
    table.id= "myDiv1";

    return table;
}

function createAdminButton() {
    var button = document.createElement("button");  
    button.onclick = function() { sendToServer("adminRequest", "none"); }
    var text = document.createTextNode("Administration Mode");
    button.appendChild(text);
    button.id = "myAdminButton";
    return button;
}

function createUserButton() {
    var button = document.createElement("button");  
    button.onclick = function() { sendToServer("userRequest", "none"); }
    var text = document.createTextNode("User Mode");
    button.appendChild(text);
    button.id = "myAdminButton";
    return button;
}

var dayList;

function createHeader(year) {
    dayList = [];
    var days = ["Season " + year , "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" ];
    var row = document.createElement('tr');
    days.forEach(function(day) {
	var cell = document.createElement('td');
	cell.innerHTML = "<b>" + day + "</b>";
	row.appendChild(cell);
    });
    return row;
}

function createWeek(year, week, admin) {
    var row = document.createElement('tr');
    var cell = document.createElement('td');
    cell.innerHTML = "<b>week " + week.week + "</b>";
    row.appendChild(cell);
    week.days.forEach(function(day) {
	var cell = createDay(year, day, admin);
	row.appendChild(cell);
    });
    return row;
}

function createDay(year, day, admin) {
    var cell = document.createElement('td');
    cell.width="12%"
    cell.innerHTML = day.date + "<br><br>"
    cell.daytype = day.type;
    cell.id = day.date + "." + year;

    if (admin === 1) {
	cell.adminState = 0;
	cell.items = day.items;
	cell.newItem = {};
	cell.title = getAdminCellTitle(cell.items);
	cell.style.backgroundColor = colorAdminCellState(cell.items, cell.daytype);
	cell.onclick = function () { calendarAdminCellClicked(this); };
    } else {
	cell.state = day.items.state;
	cell.title = getUserCellTitle(day.items.state);
	cell.style.backgroundColor = colorUserCellState(cell.state, cell.daytype);
	cell.onclick = function () { calendarUserCellClicked(this); };
    }
    dayList.push({ date: cell.id, type: cell.daytype });
    return cell;
}

var COLOR_FREE1 = "#f0f0f0";
var COLOR_FREE2 = "#d0d0d0";
var COLOR_OWN_RESERVED = "#6698ff";
var COLOR_OTHER_RESERVED = "#f1948a";
var COLOR_BOTH_RESERVED = "#ff00FF";
var COLOR_OWN_CONFIRMED = "#0041C2";
var COLOR_OTHER_CONFIRMED = "#FF0000";
var COLOR_OWN_UNCONFIRMED = "#82e0aa";

function colorUserCellState(state, daytype) {
    if(state === "free" && daytype === "weekend") { return COLOR_FREE2; }
    if(state === "free" && daytype === "weekday") { return COLOR_FREE1; }
    if(state === "own_reserved") { return COLOR_OWN_RESERVED; }
    if(state === "other_reserved") { return COLOR_OTHER_RESERVED; }
    if(state === "both_reserved") { return COLOR_BOTH_RESERVED; }    
    if(state === "own_confirmed") { return COLOR_OWN_CONFIRMED; }
    if(state === "other_confirmed") { return COLOR_OTHER_CONFIRMED; }
    if(state === "unconfirmed") { return COLOR_OWN_UNCONFIRMED; }    
    if(state === "unconfirmed_conditional") { return COLOR_OWN_UNCONFIRMED; }    
}

function colorAdminCellState(items, daytype) {
    var color = COLOR_FREE1;
    if(items.length === 0) {
	if(daytype === "weekend") { return COLOR_FREE2; }
	else  { return COLOR_FREE1; }
    }
    items.forEach(function(f) {
	if(f.state === "reserved") { color = COLOR_OWN_CONFIRMED; }
    });
    if(color === COLOR_OWN_CONFIRMED) { return color; }
    else { return COLOR_OWN_RESERVED; }
}

function getUserCellTitle(state) {
    if(state === "free") { return CLIENT_CALENDARTEXT_FREE; }
    if(state === "own_reserved") { return CLIENT_CALENDARTEXT_OWN_RESERVED; }
    if(state === "other_reserved") { return CLIENT_CALENDARTEXT_OTHER_RESERVED; }
    if(state === "both_reserved") { return CLIENT_CALENDARTEXT_BOTH_RESERVED; }    
    if(state === "own_confirmed") { return CLIENT_CALENDARTEXT_OWN_CONFIRMED; }
    if(state === "other_confirmed") { return CLIENT_CALENDARTEXT_OTHER_CONFIRMED; }
    if(state === "unconfirmed") { return CLIENT_CALENDARTEXT_OWN_MARKED; }    
    if(state === "unconfirmed_conditional") { return CLIENT_CALENDARTEXT_OWN_MARKED; }    
}

function getAdminCellTitle(items) {
    var label = "";
    if(items.length === 0) { return "free"; }
    items.forEach(function(f) {
	if(f.state === "pending") { label += "reserved for " + f.user + "\n"; }
	if(f.state === "reserved") { label += "confirmed for " + f.user + "\n"; }	    
    });
    return label;
}

function calendarUserCellClicked(cell) {
    document.getElementById("myStatusField").value = "Editing reservation";

    document.body.replaceChild(createCheckReservationButton(),
			       document.getElementById("myConfirmButton"));

    if(cell.state === "free") {
	cell.state = "unconfirmed";
	cell.style.backgroundColor = COLOR_OWN_UNCONFIRMED;
	cell.title = getUserCellTitle(cell.state);
	return;
    }
    if(cell.state === "unconfirmed") {
	cell.state = "free";
	if(cell.daytype === "weekday") {
	    cell.style.backgroundColor = COLOR_FREE1;
	} else {
	    cell.style.backgroundColor = COLOR_FREE2;
	}
	cell.title = getUserCellTitle(cell.state);
	return;
    }
    if (cell.state === "own_reserved") {
	cell.state = "free";
	if(cell.daytype === "weekday") {
	    cell.style.backgroundColor = COLOR_FREE1;
	} else {
	    cell.style.backgroundColor = COLOR_FREE2;
	}
	cell.title = getUserCellTitle(cell.state);
	return;
    }
    if (cell.state === "other_reserved") {
	cell.state = "unconfirmed_conditional";
	cell.style.backgroundColor = COLOR_OWN_UNCONFIRMED;
	cell.title = getUserCellTitle(cell.state);
	return;
    }
    if (cell.state === "unconfirmed_conditional") {
	cell.state = "other_reserved";
	cell.style.backgroundColor = COLOR_OTHER_RESERVED;
	cell.title = getUserCellTitle(cell.state);
	return;
    }
    if (cell.state === "both_reserved") {
	cell.state = "other_reserved";
	cell.style.backgroundColor = COLOR_OTHER_RESERVED;
	cell.title = getUserCellTitle(cell.state);
	return;
    }
}

function calendarAdminCellClicked(cell) {
    if(cell.items.length === 0) { return; }

    document.getElementById("myStatusField").value = "Editing reservation";

    document.body.replaceChild(createCheckAdminButton(),
			       document.getElementById("myConfirmButton"));

    if(cell.adminState < cell.items.length) {
	cell.adminState++;
	cell.style.backgroundColor = COLOR_OWN_UNCONFIRMED;
	if(cell.items[0].state === "reserved") {
	    cell.newItem = { user : cell.items[0].user,
			     state : "pending" };
	    cell.title = "OLD: " + getAdminCellTitle(cell.items) +
		"\nNEW: reserved for " + cell.items[0].user;
	} else {
	    cell.newItem = { user : cell.items[cell.adminState-1].user,
			     state : "reserved" };
	    cell.title = "OLD: " + getAdminCellTitle(cell.items) +
		"\nNEW: confirmed for " + cell.items[cell.adminState-1].user;
	}
	return;
    } else {
	cell.adminState = 0;
	cell.style.backgroundColor = colorAdminCellState(cell.items, cell.daytype);
	cell.newItem = {};
	cell.title = getAdminCellTitle(cell.items);
	return;
    }

}

function createConfirmButton(adminMode) {
    var table = document.createElement('table');
    var tHeader = document.createElement('thead');
    var tBody = document.createElement('tbody');
    var hRow = document.createElement('tr');
    var hCell = document.createElement('td');
    var bRow = document.createElement('tr');
    var bCell1 = document.createElement('td');
    var bCell2 = document.createElement('td');
    var totalsField = document.createElement("textarea");
    var button = document.createElement("button");

    setElementStyle(hCell);
    hRow.appendChild(hCell);
    setElementStyle(hRow);
    tHeader.appendChild(hRow);
    table.appendChild(tHeader);

    if(adminMode) {
	button.onclick = function() { confirmAdminChange(); }
	var text = document.createTextNode("Confirm change");
    } else {
	button.onclick = function() { confirmReservation(); }
	var text = document.createTextNode("Confirm reservation");
    }
    button.appendChild(text);
    totalsField.rows = "1";
    totalsField.cols = "70";

    totalsField.id = "myTotalsField";

    setElementStyle(bCell1);
    setElementStyle(bCell2);

    bCell1.appendChild(button);
    bCell2.appendChild(totalsField);
    
    bRow.appendChild(bCell1);
    bRow.appendChild(bCell2);
    tBody.appendChild(bRow);
    table.appendChild(tBody);
    table.id = "myConfirmButton";
    return table;
}

function createCheckReservationButton() {
    var button = document.createElement("button");
    button.onclick = function() { checkReservation(); }
    var text = document.createTextNode("Check reservation");
    button.appendChild(text);
    button.id = "myConfirmButton";
    return button;
}

function createCheckAdminButton() {
    var button = document.createElement("button");
    button.onclick = function() { checkAdminFunction(); }
    var text = document.createTextNode("Check admin function");
    button.appendChild(text);
    button.id = "myConfirmButton";
    return button;
}

function getReservedDays() {
    return dayList.filter(function(day) {
	return ((document.getElementById(day.date).state === "own_reserved") ||
		(document.getElementById(day.date).state === "both_reserved") ||
		(document.getElementById(day.date).state === "unconfirmed") ||
		(document.getElementById(day.date).state === "unconfirmed_conditional"));
    });
}

function getAdminModifiedDays() {
    return dayList.map(function(day) {
	if(Object.getOwnPropertyNames(document.getElementById(day.date).newItem).length !== 0) {
	    return { date : day.date,
		     user : document.getElementById(day.date).newItem.user,
		     state : document.getElementById(day.date).newItem.state };
	}
    }).filter(function(f) { return f; });
}

function checkAdminFunction() {
    list = getAdminDays();
    if(list.length === 0) { return; }

    document.body.replaceChild(createConfirmButton(true),
			       document.getElementById("myConfirmButton"));

    var prettyList = "";
    list.forEach(function(user) {
	prettyList += user.user + ":\n   Confirmed: " + JSON.stringify(user.reserved) +
	    "\n   Reserved:  " + JSON.stringify(user.pending) + "\n\n";
    });
    document.getElementById("myTotalsField").value = prettyList;
}

function getAdminDays() {
    var adminDays = getAdminModifiedDays();
    var users = [];
    adminDays.forEach(function(day) {
	if(users.filter(function(f) {
	    return f === day.user;
	}).length === 0) {
	    users.push(day.user);
	}
    });
    if(users.length === 0) { return []; }

    var list = [];
    users.forEach(function(user) {
	var pending = [];
	var reserved = [];
	adminDays.forEach(function(day) {
	    if((user === day.user) && (day.state === "pending")) {
		pending.push(day.date);
	    }
	    if((user === day.user) && (day.state === "reserved")) {
		reserved.push(day.date);
	    }
	});
	list.push({ user: user, pending: pending, reserved: reserved });
    });

    return list;
}

function checkReservation() {
    var weekDays = getReservedDays().filter(function(d) { return d.type === "weekday"; }).length;
    var weekendDays = getReservedDays().filter(function(d) { return d.type === "weekend"; }).length;
    var discount = 0;
    if(((weekDays + weekendDays) > 7) && (weekendDays > 1)) { discount = 100; }
    if(((weekDays + weekendDays) > 14) && (weekendDays > 3)) { discount = 200; }
    if(((weekDays + weekendDays) > 21) && (weekendDays > 5)) { discount = 300; }
    if(((weekDays + weekendDays) > 28) && (weekendDays > 7)) { discount = 400; }
    document.body.replaceChild(createConfirmButton(false),
			       document.getElementById("myConfirmButton"));
    document.getElementById("myTotalsField").value = showTotals(weekDays, weekendDays, discount);
}

function showTotals(weekDays, weekendDays, discount) {
    var totalPrice = (weekDays * 75) + (weekendDays * 150);
    return "Reservation for " + weekDays + "+" + weekendDays + " days: " + (totalPrice - discount) +
	" euros, including discount of " + discount + " euros.";
}

function confirmReservation() {
    var sendable = { reservation: getReservedDays().map(function(d) { return d.date; }) };
    sendToServerEncrypted("sendReservation", sendable);
}

function confirmAdminChange() {
    var sendable = { change: getAdminDays() };
    sendToServerEncrypted("adminChange", sendable);
}

