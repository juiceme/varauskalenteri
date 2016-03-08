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
    var calendar = document.createElement('table');
    return calendar;
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

