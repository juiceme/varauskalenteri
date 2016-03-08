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
<table id= "myCustomerTable"> </table>
<br>
<table id = "myInvoiceTable"> </table>
<br>
<div id = "myEmailText"> </div>
<br>
<div id = "mySendButton"> </div>

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
}

