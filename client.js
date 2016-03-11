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
var sessionPassword = "";

mySocket.onopen = function (event) {
    var sendable = {type:"clientStarted"};
    mySocket.send(JSON.stringify(sendable));
    document.getElementById("myStatusField").value = "started";
};

mySocket.onmessage = function (event) {
    var receivable = JSON.parse(event.data);
    console.log(JSON.stringify(receivable));
    if(receivable.type == "statusData") {
        document.getElementById("myStatusField").value = receivable.content;
    }

    if(receivable.type == "loginView") {
	document.body.replaceChild(createLoginView(), document.getElementById("myDiv1"));
    }

    if(receivable.type == "loginChallenge") {
	var challenge = Aes.Ctr.decrypt(receivable.content, sessionPassword, 128);
	var plainResponse = challenge.slice(0, (challenge.length - 1)) + "2";
	var cipheredResponce = Aes.Ctr.encrypt(plainResponse, sessionPassword, 128);
	sendToServer("loginResponse", cipheredResponce);
    }

 

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

    var usernameField = document.createElement("input");
    var passwordField = document.createElement("input");
    var loginButton = document.createElement("button");
    var createAccountButton = document.createElement("button");

    usernameField.name="username";
    usernameField.type="text"
    passwordField.name="password";
    passwordField.type="password";

    hCell.colSpan = "2";
    hCell.appendChild(document.createTextNode("Please login or create a new account;"));
    hRow.appendChild(hCell);
    setElementStyle(hCell);
    tHeader.appendChild(hRow);
    table.appendChild(tHeader);

    bCell1a.style.border = "solid #ffffff";
    bCell1b.style.border = "solid #ffffff";
    setElementStyle(bCell2a);
    setElementStyle(bCell2b);
    setElementStyle(bCell3a);
    setElementStyle(bCell3b);
    bCell4a.style.border = "solid #ffffff";
    bCell4b.style.border = "solid #ffffff";
    setElementStyle(bCell5a);
    setElementStyle(bCell5b);

    bCell1a.appendChild(document.createTextNode(" "));
    bCell2a.appendChild(document.createTextNode("username: "));
    bCell2b.appendChild(usernameField);
    bCell3a.appendChild(document.createTextNode("password: "));
    bCell3b.appendChild(passwordField);
    bCell4a.appendChild(document.createTextNode(" "));

    loginButton.appendChild(document.createTextNode("Login"));
    loginButton.onclick = function() { sendLogin(usernameField.value, passwordField.value); }
    createAccountButton.appendChild(document.createTextNode("Create Account / Reset Password"));
    createAccountButton.onclick = function() { createAccountQuery(); }

    bCell5a.appendChild(loginButton);
    bCell5b.appendChild(createAccountButton);

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

    tBody.appendChild(bRow1);
    tBody.appendChild(bRow2);
    tBody.appendChild(bRow3);
    tBody.appendChild(bRow4);
    tBody.appendChild(bRow5);

    table.appendChild(tBody);
    table.id= "myDiv1";

    return table;
}

function createEmailView() {
    var table = document.createElement('table');
    var tHeader = document.createElement('thead');
    var tBody = document.createElement('tbody');
    var hRow = document.createElement('tr');
    var hCell = document.createElement('td');
    var bRow1 = document.createElement('tr');
    var bCell1a = document.createElement('td');
    var bRow2 = document.createElement('tr');
    var bCell2a = document.createElement('td');
    var bCell2b = document.createElement('td');
    var bRow3 = document.createElement('tr');
    var bCell3a = document.createElement('td');
    var bRow4 = document.createElement('tr');
    var bCell4a = document.createElement('td');
    var bRow5 = document.createElement('tr');
    var bCell5a = document.createElement('td');
    var bCell5b = document.createElement('td');
    var bRow6 = document.createElement('tr');
    var bCell6a = document.createElement('td');

    var emailField = document.createElement("input");
    var validateField = document.createElement("input");
    var confirmButton = document.createElement("button");
    var validateButton = document.createElement("button");

    emailField.name="email";
    validateField.name="validate";

    hCell.colSpan = "2";
    hCell.appendChild(document.createTextNode("Creating or restoring account;"));
    hRow.appendChild(hCell);
    setElementStyle(hCell);
    tHeader.appendChild(hRow);
    table.appendChild(tHeader);

    bCell1a.style.border = "solid #ffffff";
    bRow1.style.border = "solid #ffffff";
    setElementStyle(bCell2a);
    setElementStyle(bCell2b);
    setElementStyle(bCell3a);
    bRow3.style.border = "solid #ffffff";
    bCell4a.style.border = "solid #ffffff";
    bRow4.style.border = "solid #ffffff";
    setElementStyle(bCell5a);
    setElementStyle(bCell5b);
    setElementStyle(bCell6a);
    bRow6.style.border = "solid #ffffff";

    bCell2a.appendChild(document.createTextNode("email: "));
    bCell2b.appendChild(emailField);

    confirmButton.appendChild(document.createTextNode("Send Email!"));
    confirmButton.onclick = function() { sendConfirmationEmail(emailField.value); }
    bCell3a.appendChild(confirmButton);

    bCell5a.appendChild(document.createTextNode("validation code: "));
    bCell5b.appendChild(validateField);
    validateButton.appendChild(document.createTextNode("Validate Account!"));
    validateButton.onclick = function() { sendValidationCode(validateField.value); }
    bCell6a.appendChild(validateButton);

    bRow1.appendChild(bCell1a);
    bRow2.appendChild(bCell2a);
    bRow2.appendChild(bCell2b);
    bRow3.appendChild(bCell3a);
    bRow4.appendChild(bCell4a);
    bRow5.appendChild(bCell5a);
    bRow5.appendChild(bCell5b);
    bRow6.appendChild(bCell6a);

    tBody.appendChild(bRow1);
    tBody.appendChild(bRow2);
    tBody.appendChild(bRow3);
    tBody.appendChild(bRow4);
    tBody.appendChild(bRow5);
    tBody.appendChild(bRow6);

    table.appendChild(tBody);
    table.id= "myDiv1";

    return table;

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
    var bRow8 = document.createElement('tr');
    var bCell8a = document.createElement('td');
    var bCell8b = document.createElement('td');
    var bRow9 = document.createElement('tr');
    var bCell9a = document.createElement('td');
    var bCell9b = document.createElement('td');
    var bRow10 = document.createElement('tr');
    var bCell10a = document.createElement('td');
    var bCell10b = document.createElement('td');
    var bRow11 = document.createElement('tr');
    var bCell11a = document.createElement('td');
    var bCell11b = document.createElement('td');

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
    setElementStyle(hCell);
    tHeader.appendChild(hRow);
    table.appendChild(tHeader);

    bCell1a.style.border = "solid #ffffff";
    bCell1b.style.border = "solid #ffffff";
    setElementStyle(bCell2a);
    setElementStyle(bCell2b);
    setElementStyle(bCell3a);
    setElementStyle(bCell3b);
    setElementStyle(bCell4a);
    setElementStyle(bCell4b);
    setElementStyle(bCell5a);
    setElementStyle(bCell5b);
    bCell6a.style.border = "solid #ffffff";
    bCell6b.style.border = "solid #ffffff";
    setElementStyle(bCell7a);
    setElementStyle(bCell7b);
    bCell8a.style.border = "solid #ffffff";
    bCell8b.style.border = "solid #ffffff";
    setElementStyle(bCell9a);
    setElementStyle(bCell9b);
    bCell10a.style.border = "solid #ffffff";
    bCell10b.style.border = "solid #ffffff";
    setElementStyle(bCell11a);
    setElementStyle(bCell11b);

    bCell1a.appendChild(document.createTextNode(" "));
    bCell2a.appendChild(document.createTextNode("username: "));
    bCell2b.appendChild(usernameField);
    bCell3a.appendChild(document.createTextNode("realname: "));
    bCell3b.appendChild(realnameField);
    bCell4a.appendChild(document.createTextNode("email: "));
    bCell4b.appendChild(emailField);
    bCell5a.appendChild(document.createTextNode("phone: "));
    bCell5b.appendChild(phoneField);
    bCell6a.appendChild(document.createTextNode(" "));

    confirmButton.appendChild(document.createTextNode("Create Account!"));
    confirmButton.onclick = function() { sendConfirmAccount( { username: usernameField.value,
							       realname:realnameField.value,
							       email: emailField.value,
							       phone: phoneField.value } ); }
    bCell7a.appendChild(confirmButton);
    bCell8a.appendChild(document.createTextNode(" "));
    bCell9a.appendChild(document.createTextNode("validation code: "));
    bCell9b.appendChild(validateField);
    validateButton.appendChild(document.createTextNode("Validate Account!"));
    validateButton.onclick = function() { validateAccount(validateField.value); }
    bCell10a.appendChild(validateButton);

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
    bRow8.appendChild(bCell8a);
    bRow8.appendChild(bCell8b);
    bRow9.appendChild(bCell9a);
    bRow9.appendChild(bCell9b);
    bRow10.appendChild(bCell10a);
    bRow10.appendChild(bCell10b);
    bRow11.appendChild(bCell11a);
    bRow11.appendChild(bCell11b);

    tBody.appendChild(bRow1);
    tBody.appendChild(bRow2);
    tBody.appendChild(bRow3);
    tBody.appendChild(bRow4);
    tBody.appendChild(bRow5);
    tBody.appendChild(bRow6);
    tBody.appendChild(bRow7);
    tBody.appendChild(bRow8);
    tBody.appendChild(bRow9);
    tBody.appendChild(bRow10);
    tBody.appendChild(bRow11);

    table.appendChild(tBody);
    table.id= "myDiv1";

    return table;
}

function setElementStyle(element) {
    element.style.border = "solid #ffffff";
    element.style.padding = "0";
}

function sendLogin(username, password) {
    div = document.createElement('div');
    div.id = "myDiv1";
    document.body.replaceChild(div, document.getElementById("myDiv1"));
    sessionPassword = Sha1.hash(password);
    sendToServer("userLogin", { username: Sha1.hash(username) });
}

function createAccountQuery() {
    document.body.replaceChild(createEmailView(), document.getElementById("myDiv1"));
    document.getElementById("myStatusField").value = "Creating/Reseting account";
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

function sendConfirmationEmail(email) {
    if(!checkEmailValidity(email)) {
	document.getElementById("myStatusField").value = "Illegal email address";
	document.body.replaceChild(createEmailView(), document.getElementById("myDiv1"));
	return;
    }
    sendToServer("confirmEmail", email);
}

function sendValidationCode(code) {
    sendToServer("validateAccount", code);
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
