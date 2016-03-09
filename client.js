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
<div id= "myCalendarView"> </div>
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
	document.body.replaceChild(createCalendarView(calendarData),
				   document.getElementById("myCalendarView"));
	document.body.replaceChild(createConfirmButton(),
				   document.getElementById("myConfirmButton"));
    }
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

