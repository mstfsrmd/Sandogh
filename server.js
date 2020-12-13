const express = require('express');
const app = express();
const http = require('http').createServer(app);
const fs = require('fs');
const mongoC = require('mongodb');
const nodemailer = require('nodemailer');
const io = require('socket.io')(http);
const mongo = mongoC.MongoClient;
var moment = require('jalali-moment');
const url = 'mongodb://localhost:27017/mydb'

//server connection
console.log('Connecting to server...');
http.listen(3001, function () {
  console.log('Server is ready on port '+3001);
});
