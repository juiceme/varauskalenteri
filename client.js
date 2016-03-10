<!DOCTYPE html>
<html>
<head>
<style>
    table, th, td { border:1px solid black; border-collapse: collapse; }
    th, td { padding: 10px; }
</style>
</head>
<body>
<form> status: <input type="text" id="myStatusField" value="" disabled></form>
<br>
<div id= "myDiv1"> </div>
<br>
<div id = "myConfirmButton"> </div>

<script language="javascript" type="text/javascript">

var site = window.location.hostname;
var mySocket = new WebSocket("ws://" + site + ":8081/");

mySocket.onopen = function (event) {
    var sendable = {type:"clientStarted"};
    mySocket.send(JSON.stringify(sendable));
    document.getElementById("myStatusField").value = "started";
};

mySocket.onmessage = function (event) {
    var receivable = JSON.parse(event.data);
    console.log(JSON.stringify(receivable));
    if(receivable.type == "calendarData") {
	var calendarData = receivable.content;
	document.body.replaceChild(createLoginView(), document.getElementById("myDiv1"));
/*	document.body.replaceChild(createCalendarView(calendarData),
				   document.getElementById("myDiv1"));
	document.body.replaceChild(createConfirmButton(),
				   document.getElementById("myConfirmButton")); */
    }
}

function createLoginView() {
    var fieldset = document.createElement('fieldset');
    var usernameField = document.createElement("input");
    var passwordField = document.createElement("input");
    var loginButton = document.createElement("button");
    var createAccountButton = document.createElement("button");

    usernameField.name="username";
    usernameField.type="text"
    passwordField.name="password";
    passwordField.type="password";

    loginButton.appendChild(document.createTextNode("Login"));
    loginButton.onclick = function() { sendLogin(usernameField.value, passwordField.value); }
    createAccountButton.appendChild(document.createTextNode("Create Account"));
    createAccountButton.onclick = function() { createAccountQuery(); }

    fieldset.appendChild(document.createTextNode("Please login or create a new account;"));
    fieldset.appendChild(document.createElement("br"));
    fieldset.appendChild(document.createElement("br"));
    fieldset.appendChild(document.createTextNode("username: "));
    fieldset.appendChild(usernameField);
    fieldset.appendChild(document.createElement("br"));
    fieldset.appendChild(document.createTextNode("password: "));
    fieldset.appendChild(passwordField);
    fieldset.appendChild(document.createElement("br"));
    fieldset.appendChild(document.createElement("br"));
    fieldset.appendChild(loginButton);
    fieldset.appendChild(createAccountButton);
    fieldset.id= "myDiv1";

    return fieldset;
}

function createNewAccountView() {
    var table = document.createElement('table');
    var tHeader = document.createElement('thead');
    var tBody = document.createElement('tbody');
    var hRow = document.createElement('tr');
    var hCell = document.createElement('td');
    var bRow1 = document.createElement('tr');
    var bCell1a = document.createElement('td');
    var bCell1b = document.createElement('td');
    var bRow2 = document.createElement('tr');
    var bCell2a = document.createElement('td');
    var bCell2b = document.createElement('td');
    var bRow3 = document.createElement('tr');
    var bCell3a = document.createElement('td');
    var bCell3b = document.createElement('td');
    var bRow4 = document.createElement('tr');
    var bCell4a = document.createElement('td');
    var bCell4b = document.createElement('td');
    var bRow5 = document.createElement('tr');
    var bCell5a = document.createElement('td');
    var bCell5b = document.createElement('td');
    var bRow6 = document.createElement('tr');
    var bCell6a = document.createElement('td');
    var bCell6b = document.createElement('td');
    var bRow7 = document.createElement('tr');
    var bCell7a = document.createElement('td');
    var bCell7b = document.createElement('td');

    var usernameField = document.createElement("input");
    var realnameField = document.createElement("input");
    var emailField = document.createElement("input");
    var phoneField = document.createElement("input");
    var validateField = document.createElement("input");
    var confirmButton = document.createElement("button");
    var validateButton = document.createElement("button");

    usernameField.name="username";
    realnameField.name="realname";
    emailField.name="email";
    phoneField.name="phone";
    validateField.name="validate";

    hCell.colSpan = "2";
    hCell.appendChild(document.createTextNode("Creating a new account;"));
    hRow.appendChild(hCell);
    hRow.style.border = "solid #ffffff";
    tHeader.appendChild(hRow);
    table.appendChild(tHeader);

    bCell1a.style.border = "solid #ffffff";
    bCell1b.style.border = "solid #ffffff";
    bCell2a.style.border = "solid #ffffff";
    bCell2b.style.border = "solid #ffffff";
    bCell3a.style.border = "solid #ffffff";
    bCell3b.style.border = "solid #ffffff";
    bCell4a.style.border = "solid #ffffff";
    bCell4b.style.border = "solid #ffffff";
    bCell5a.style.border = "solid #ffffff";
    bCell5b.style.border = "solid #ffffff";
    bCell6a.style.border = "solid #ffffff";
    bCell6b.style.border = "solid #ffffff";
    bCell7a.style.border = "solid #ffffff";
    bCell7b.style.border = "solid #ffffff";

    bCell1a.appendChild(document.createTextNode("username: "));
    bCell1b.appendChild(usernameField);
    bCell2a.appendChild(document.createTextNode("realname: "));
    bCell2b.appendChild(realnameField);
    bCell3a.appendChild(document.createTextNode("email: "));
    bCell3b.appendChild(emailField);
    bCell4a.appendChild(document.createTextNode("phone: "));
    bCell4b.appendChild(phoneField);

    confirmButton.appendChild(document.createTextNode("Create Account!"));
    confirmButton.onclick = function() { sendConfirmAccount( { username: usernameField.value,
							       realname:realnameField.value,
							       email: emailField.value,
							       phone: phoneField.value } ); }
    bCell5a.appendChild(confirmButton);
    bCell6a.appendChild(document.createTextNode("validation code: "));
    bCell6b.appendChild(validateField);

    validateButton.appendChild(document.createTextNode("Validate Account!"));
    validateButton.onclick = function() { validateAccount( { code: validateField.value } ); }
    bCell7a.appendChild(validateButton);

    bRow1.appendChild(bCell1a);
    bRow1.appendChild(bCell1b);
    bRow2.appendChild(bCell2a);
    bRow2.appendChild(bCell2b);
    bRow3.appendChild(bCell3a);
    bRow3.appendChild(bCell3b);
    bRow4.appendChild(bCell4a);
    bRow4.appendChild(bCell4b);
    bRow5.appendChild(bCell5a);
    bRow5.appendChild(bCell5b);
    bRow6.appendChild(bCell6a);
    bRow6.appendChild(bCell6b);
    bRow7.appendChild(bCell7a);
    bRow7.appendChild(bCell7b);

    tBody.appendChild(bRow1);
    tBody.appendChild(bRow2);
    tBody.appendChild(bRow3);
    tBody.appendChild(bRow4);
    tBody.appendChild(bRow5);
    tBody.appendChild(bRow6);
    tBody.appendChild(bRow7);

    table.appendChild(tBody);
    table.id= "myDiv1";

    return table;
}

function sendLogin(username, password) {
    div = document.createElement('div');
    div.id = "myDiv1";
    document.body.replaceChild(div, document.getElementById("myDiv1"));
    sendToServer("userLogin", { username: username, password: password });
}

function createAccountQuery() {
    document.body.replaceChild(createNewAccountView(), document.getElementById("myDiv1"));
    document.getElementById("myStatusField").value = "Creating account";
}

function checkEmailValidity(address) {
    var re = /\S+@\S+\.\S+/;
    return (re.test(address));
}

function checkUsernameValidity(name) {
    if(name.length === 0) {
	return false;
    }
    var re = /\s/g;
    return (!re.test(name));
}

function sendConfirmAccount(account) {
    if(!checkEmailValidity(account.email)) {
	document.getElementById("myStatusField").value = "Illegal email address";
	document.body.replaceChild(createNewAccountView(), document.getElementById("myDiv1"));
	return;
    }
    if(!checkUsernameValidity(account.username)) {
	document.getElementById("myStatusField").value = "Illegal username";
	document.body.replaceChild(createNewAccountView(), document.getElementById("myDiv1"));
	return;
    }
    document.getElementById("myStatusField").value = "Account query sent";
    div = document.createElement('div');
    div.id = "myDiv1";
    document.body.replaceChild(div, document.getElementById("myDiv1"));
    sendToServer("createAccount", account);
}

function createCalendarView(calendarData) {
    var table = document.createElement('table');
    var tableHeader = document.createElement('thead');
    tableHeader.appendChild(createHeader(calendarData.year));
    var tableBody = document.createElement('tbody');
    table.id = "myCalendar";

    calendarData.season.forEach(function(week) {
	var row = createWeek(week);
	tableBody.appendChild(row);
    });

    table.appendChild(tableHeader);
    table.appendChild(tableBody);

    return table;
}

function createHeader(year) {
    var days = ["Season " + year , "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" ];
    var row = document.createElement('tr');
    days.forEach(function(day) {
	var cell = document.createElement('td');
	cell.innerHTML = "<b>" + day + "</b>";
	row.appendChild(cell);
    });
    return row;
}

function createWeek(week) {
    var row = document.createElement('tr');
    var cell = document.createElement('td');
    cell.innerHTML = "<b>week " + week.week + "</b>";
    row.appendChild(cell);
    week.days.forEach(function(day) {
	var cell = createDay(day);
	row.appendChild(cell);
    });
    return row;
}

function createDay(day) {
    var cell = document.createElement('td');
    cell.width="12%"
    cell.innerHTML = day.date + "<br><br>"
    cell.state = day.state;
    cell.style.backgroundColor = colorCellState(cell.state);
    cell.onclick = function () { calendarCellClicked(this); };
//    cell.appendChild(document.createTextNode(day.date));
//    cell.appendChild(document.createTextNode(day.state)); /
    return cell;
}

function colorCellState(state) {
    if(state === 0) {
	return "#f0f0f0";
    } else {
	return "#ff0000";
    }
}

function calendarCellClicked(cell) {
    console.log(cell.state);

    if(cell.state === 1) { return; }
    if(cell.state === 0) {
	cell.state = 100;
	cell.style.backgroundColor = "#00ff00";
    } else {
	cell.state = 0;
	cell.style.backgroundColor = "#f0f0f0";
    }

}

function createConfirmButton() {
    var button = document.createElement("button");
    button.onclick = function() { sendChanges(); }
    var text = document.createTextNode("Confirm");
    button.appendChild(text);
    return button;
}

function sendChanges() {
    console.log("SendChanges event");
}

function sendToServer(type, content) {
    var sendable = { type: type, content: content };
    mySocket.send(JSON.stringify(sendable));
}
