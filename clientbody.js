var site = window.location.hostname;
var mySocket = new WebSocket("ws://" + site + ":" + WEBSOCK_PORT + "/");
var sessionPassword;

mySocket.onopen = function (event) {
    var sendable = {type:"clientStarted", content:"none"};
    mySocket.send(JSON.stringify(sendable));
    document.getElementById("myStatusField").value = "started";
};

mySocket.onmessage = function (event) {
    var receivable = JSON.parse(event.data);
    if(receivable.type == "statusData") {
        document.getElementById("myStatusField").value = receivable.content;
    }

    if(receivable.type == "loginView") {
	document.body.replaceChild(createLoginView(), document.getElementById("myDiv1"));
	document.body.replaceChild(createLoginHelpText(), document.getElementById("myHelpText"));
    }

    if(receivable.type == "loginChallenge") {
	var challenge = Aes.Ctr.decrypt(receivable.content, sessionPassword, 128);
	var cipheredResponce = Aes.Ctr.encrypt(challenge, sessionPassword, 128);
	sendToServer("loginResponse", cipheredResponce);
    }

    if(receivable.type == "createNewAccount") {
	var account = JSON.parse(Aes.Ctr.decrypt(receivable.content, sessionPassword, 128));
 	document.body.replaceChild(createNewAccountView(account), document.getElementById("myDiv1"));
    }

    if(receivable.type == "calendarData") {
	var calendarData = receivable.content;
	document.body.replaceChild(createLogoutButton(),
				   document.getElementById("myLogoutButton"));
	document.body.replaceChild(createCalendarView(calendarData),
				   document.getElementById("myDiv1"));
	document.body.replaceChild(createCheckReservationButton(),
				   document.getElementById("myConfirmButton"));
	document.body.replaceChild(createCalendarHelpText(), document.getElementById("myHelpText"));
    }

    if(receivable.type == "enableAdminButton") {
	document.body.replaceChild(createAdminButton(),
				   document.getElementById("myAdminButton"));
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
    table.id = "myDiv1";

    return table;
}

function createLoginHelpText() {
    var helpTextBox = document.createElement("fieldset");
    helpTextBox.appendChild(document.createTextNode(decodeURIComponent(escape(HELPTEXT_LOGIN_A))))
    helpTextBox.appendChild(document.createElement("br"));
    helpTextBox.appendChild(document.createElement("br"));
    helpTextBox.appendChild(document.createTextNode(decodeURIComponent(escape(HELPTEXT_LOGIN_B))))
    helpTextBox.appendChild(document.createElement("br"));
    helpTextBox.appendChild(document.createElement("br"));
    helpTextBox.appendChild(document.createTextNode(decodeURIComponent(escape(HELPTEXT_LOGIN_C))))
    helpTextBox.id = "myHelpText";

    return helpTextBox;
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

function createEmailHelpText() {
    var helpTextBox = document.createElement("fieldset");
    helpTextBox.appendChild(document.createTextNode(decodeURIComponent(escape(HELPTEXT_EMAIL_A))))
    helpTextBox.appendChild(document.createElement("br"));
    helpTextBox.appendChild(document.createElement("br"));
    helpTextBox.appendChild(document.createTextNode(decodeURIComponent(escape(HELPTEXT_EMAIL_B))))
    helpTextBox.id = "myHelpText";

    return helpTextBox;
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

function createNewAccountView(account) {
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
    var password1Field = document.createElement("input");
    var password2Field = document.createElement("input");
    var confirmButton = document.createElement("button");

    usernameField.name="username";
    realnameField.name="realname";
    emailField.name="email";
    phoneField.name="phone";
    password1Field.name="password1";
    password1Field.type="password";
    password2Field.name="password2";
    password2Field.type="password";

    if(account.username) {
	usernameField.value = account.username;
	usernameField.disabled = true;
    }
    if(account.realname) { realnameField.value = account.realname;}
    if(account.email) { emailField.value = account.email; }
    if(account.phone) { phoneField.value = account.phone; }

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
    setElementStyle(bCell6a);
    setElementStyle(bCell6b);
    setElementStyle(bCell7a);
    setElementStyle(bCell7b);
    bCell8a.style.border = "solid #ffffff";
    bCell8b.style.border = "solid #ffffff";

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
    bCell6a.appendChild(document.createTextNode("password: "));
    bCell6b.appendChild(password1Field);
    bCell7a.appendChild(document.createTextNode("verify passwd: "));
    bCell7b.appendChild(password2Field);
    bCell8a.appendChild(document.createTextNode(" "));

    confirmButton.appendChild(document.createTextNode(account.buttonText));
    confirmButton.onclick = function() { sendConfirmAccount( { username: usernameField.value,
							       realname:realnameField.value,
							       email: emailField.value,
							       phone: phoneField.value,
							       passwd1: password1Field.value,
							       passwd2: password2Field.value } ); }
    bCell9a.appendChild(confirmButton);

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

    tBody.appendChild(bRow1);
    tBody.appendChild(bRow2);
    tBody.appendChild(bRow3);
    tBody.appendChild(bRow4);
    tBody.appendChild(bRow5);
    tBody.appendChild(bRow6);
    tBody.appendChild(bRow7);
    tBody.appendChild(bRow8);
    tBody.appendChild(bRow9);

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
    sessionPassword = Sha1.hash(password + Sha1.hash(username).slice(0,4));
    sendToServer("userLogin", { username: Sha1.hash(username) });
}

function createAccountQuery() {
    document.body.replaceChild(createEmailView(), document.getElementById("myDiv1"));
    document.getElementById("myStatusField").value = "Creating/Reseting account";
    document.body.replaceChild(createEmailHelpText(), document.getElementById("myHelpText"));
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
    if(account.passwd1 !== account.passwd2) {
	document.getElementById("myStatusField").value = "Passwords do not match";
	document.body.replaceChild(createNewAccountView(), document.getElementById("myDiv1"));
	return;
    }
    var sendable = { username: account.username,
		     realname: account.realname,
		     email: account.email,
		     phone: account.phone,
		     password: Sha1.hash(account.passwd1 + Sha1.hash(account.username).slice(0,4)) }; 
    document.getElementById("myStatusField").value = "Account query sent";
    div = document.createElement('div');
    div.id = "myDiv1";
    document.body.replaceChild(div, document.getElementById("myDiv1"));
    sendToServerEncrypted("createAccount", sendable);
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
    sessionPassword = code.slice(8,24);
    var sendable = { email: code.slice(0,8),
		     challenge: Aes.Ctr.encrypt("clientValidating", sessionPassword, 128) };
    sendToServer("validateAccount", sendable);
}

function createCalendarView(calendarData, admin) {
    var clearText = JSON.parse(Aes.Ctr.decrypt(calendarData, sessionPassword, 128));
    var table = document.createElement('table');
    var tableHeader = document.createElement('thead');
    tableHeader.appendChild(createHeader(clearText.year));
    var tableBody = document.createElement('tbody');
    tableBody.id = "myCalendar";

    clearText.season.forEach(function(week) {
	var row = createWeek(week, admin);
	tableBody.appendChild(row);
    });

    table.appendChild(tableHeader);
    table.appendChild(tableBody);
    table.id= "myDiv1";

    return table;
}

function createLogoutButton() {
    var button = document.createElement("button");  
    button.onclick = function() { logout(); }
    var text = document.createTextNode("Logout");
    button.appendChild(text);
    button.id = "myLogoutButton";
    return button;
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

function logout() {
    div1 = document.createElement("div");
    document.body.replaceChild(div1, document.getElementById("myLogoutButton"));
    div1.id = "myLogoutButton";
    div2 = document.createElement("div");
    document.body.replaceChild(div2, document.getElementById("myDiv1"));
    div2.id = "myDiv1";
    div3 = document.createElement("div");
    document.body.replaceChild(div3, document.getElementById("myConfirmButton"));
    div3.id = "myConfirmButton";
    div4 = document.createElement("div");
    document.body.replaceChild(div4, document.getElementById("myAdminButton"));
    div4.id = "myAdminButton";

    var sendable = {type:"clientStarted", content:"none"};
    mySocket.send(JSON.stringify(sendable));
    document.getElementById("myStatusField").value = "started";
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

function createWeek(week, admin) {
    var row = document.createElement('tr');
    var cell = document.createElement('td');
    cell.innerHTML = "<b>week " + week.week + "</b>";
    row.appendChild(cell);
    week.days.forEach(function(day) {
	var cell = createDay(day, admin);
	row.appendChild(cell);
    });
    return row;
}

function createDay(day, admin) {
    var cell = document.createElement('td');
    cell.width="12%"
    cell.innerHTML = day.date + "<br><br>"
    cell.daytype = day.type;
    cell.id = day.date;

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

function sendToServer(type, content) {
    var sendable = { type: type, content: content };
    mySocket.send(JSON.stringify(sendable));
}

function sendToServerEncrypted(type, content) {
    var sendable = { type: type,
		     content: Aes.Ctr.encrypt(JSON.stringify(content), sessionPassword, 128) };
    mySocket.send(JSON.stringify(sendable));
}
