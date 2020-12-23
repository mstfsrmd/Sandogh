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
console.log('Running server...');
http.listen(3001, function () {
  console.log("Server runs at "+moment().locale('fa').format('YYYY/M/D HH:mm:ss')+" on port 3001");
});

//socket
io.on('connection', function (socket) {
  console.log('+');

  /*check username exists
  socket.on('checkUsername', function (name) {
    mongo.connect(url,{useUnifiedTopology:true}, function (err, db) {
      if(err) return console.log('err1: '+err.message);
      else {
        db.db("sandogh").collection("userInfo").find({name: name}).toArray(function (e, res) {
          if (err) return console.log('err2: '+err.message);
          else {
            if (res != '') {
              socket.emit('isUsr', true)
            }else {
              socket.emit('isUsr', false)
            }
          }
          db.close();
        })
      }
    })
  });*/

  //check n-code exists
  socket.on('checkNCode', function (code) {
    ncode = parseInt(code.replace("-", "").replace("-", ""))
    mongo.connect(url,{useUnifiedTopology:true}, function (err, db) {
      if(err) return console.log('err1: '+err.message);
      else {
        console.log(ncode);
        db.db("sandogh").collection("userInfo").find({ncode: ncode}).toArray(function (e, res) {
          if (err) return console.log('err2: '+err.message);
          else {
            console.log(res);
            if (res != '') {
              if (res[0].isUser != true) {
                if (res[0].isUser.s && res[0].isUser.c) {
                  socket.emit('isCode', {s:true, c:true})
                  console.log('1111111');
                }else {
                  socket.emit('isCode', {s:true, c:false})
                  console.log('2222222222');
                }
              }else {
                socket.emit('isCode', true)
                console.log('333333');
              }
            }else {
              socket.emit('isCode', false)
              console.log('4444444');
            }
          }
          db.close();
        })
      }
    })
  });

  //get sign up information
  socket.on('usrinfo', function (info) {
    let name = info.userValue, ncode = parseInt(info.codeValue.replace("-", "").replace("-", "")), phone = info.phoneValue, pass = info.passValue;
    let isUser = false;
    mongo.connect(url,{useUnifiedTopology:true}, function(err, db) {
      if (err) return console.log('err3: '+err.message);
      else {
        db.db("sandogh").collection("financial").find({'id.id':ncode}).toArray(function(errInfoi, resi) {
          if (errInfoi) {
            return console.log('err4: '+errInfo.message);
            socket.emit('siggnUpOk', {status:false});
          }
          else {
            if (resi != '') {
              if (resi[0].name.trim().replace(" ", "").replace(" ", "") == name.trim().replace(" ", "").replace(" ", "")) {
                isUser = {ncode:true, name:true}
              }else {
                isUser = {ncode:true, name:false}
              }
            }
            var insertInfo = {
              name: name,
              username: ncode,
              ncode:ncode,
              phone: {p:phone, v:false},
              email:{e:'', v:false},
              pass: pass,
              manager:false,
              isUser:isUser,
              activity:[],
              joinDate: moment().locale('fa').format('YYYY/M/D HH:mm:ss'),
              allMoney:'',
              debt:''
            };
            db.db("sandogh").collection("userInfo").insertOne(insertInfo, function(errInfo, res) {
              if (errInfo) {
                return console.log('err4: '+errInfo.message);
                socket.emit('siggnUpOk', {status:false});
                db.close();
              }
              else {
                db.db("sandogh").collection("alerts").updateOne({},{$push:{manager:{
                  title:'کاربر جدید',
                  body:'یک کاربر جدید به نام '+name+' اخیرا درخواست اضافه شدن به سیستم را داده است. به پروفایل او مراجعه کنید و مشخصات اورا بررسی نمایید.',
                  path:'/manager/users/'+ncode,
                  date:moment().locale('fa').format('YYYY/M/D HH:mm:ss'),
                  status: false,
                }}}, function(errAlert, resAlert) {
                  if (errAlert) {return console.log('err18: '+errInfo.message)}
                  socket.join(ncode+"_personal");
                  db.close();
                });
              }
            });
          }
        });
      }
    });
  })

  //Login Handling
  socket.on('verify', function (v) {
    var loginUser = v.userValue, loginPass = v.passValue;
    if (parseInt(loginUser)) {
      loginUser = parseInt(loginUser)
    }
    let name, username, manager, proPic, emailConfirm;
    mongo.connect(url,{useUnifiedTopology:true},function (err, db) {
      if (err) return console.log('err5: '+err.message);
      else {
        db.db("sandogh").collection("userInfo").find({$and :[{"username":loginUser},{'pass':loginPass}]}).toArray(function (errVerify, resVerify) {
          if (errVerify) return console.log('err6: '+errVerify.message);
          else {
            if (resVerify == '') {
              socket.emit('verifyRes', {name, username, proPic, manager});
            }else {
              name = resVerify[0].name;
              username = resVerify[0].username;
              manager = resVerify[0].manager;
              emailConfirm = resVerify[0].phone.v;
              if (resVerify[0].proPic) {
                proPic = resVerify[0].proPic;
              }
              //console.log(loginUser);
              socket.emit('verifyRes', {name, username, proPic, manager});
              socket.join(loginUser+"_personal");
              if (manager === true) {
                socket.join("_managers");
              }
              db.db("sandogh").collection("userInfo").updateOne({username:loginUser},{$push:{activity:moment().locale('fa').format('YYYY/M/D HH:mm:ss')}},function (e, r) {
                if (e) return console.log('err11: '+e.message);
              })
              if (emailConfirm == false) {
                socket.emit('confirmEmailNotif', emailConfirm)
              }
            }
          }
        })
      }
    })
  })

  //submit activity
  socket.on('activity', function (username) {
    let u = username;
    if (parseInt(username)) {
      u = parseInt(username)
    }
    if (u) {
      let day = moment().locale('fa').format('D');
      let mon = moment().locale('fa').format('M');
      mongo.connect(url,{useUnifiedTopology:true},function (err, db) {
        if (err) return console.log('err12: '+err.message);
        else {
          db.db("sandogh").collection("userInfo").updateOne({username:u},{$push:{activity:moment().locale('fa').format('YYYY/M/D HH:mm:ss')}},function (e, r) {
            if (e) return console.log('err13: '+e.message);
            else {
              db.db("sandogh").collection("userInfo").find({username:u}, {$projection:{_id:0, activity:1}}).toArray(function (ee, rr) {
                if (ee) return console.log('err14: '+ee.message);
                else {
                  rr[0]['activity'].forEach((item, i) => {
                    if (parseInt((item.split(' ')[0].split('/')[1]) != parseInt(mon)) && (parseInt(item.split(' ')[0].split('/')[2] - parseInt(day)) < 0)) {
                      console.log(item.split(' ')[0].split('/')[1]), mon, (parseInt(item.split(' ')[0].split('/')[2] - parseInt(day)));
                      db.db("sandogh").collection("userInfo").updateOne({username:rr[0]['username']},{$pull:{activity:item}}, function (eee, rrr) {
                        if (eee) return console.log('err15: '+eee.message);
                      })
                    }
                  });
                }
              })
            }
          })
        }
      })
    }
  })


  socket.on('addUserInfo', function (e) {
    let name = e.name, monthly = e.monthly, debt = e.debt, debtDate = e.debtDate, debtExp = e.debtExp, id=e.id;
    let registeredTime = moment().locale('fa').format('YYYY/M/D HH:mm:ss');
    let idP, idType;
    if (name) {
      if (monthly) {
        console.log(monthly);
        if (id) {
          idP = id.split('')
          if (idP[0] == '+') {
            if (idP.length == 13) {
              idType = 'phone'
              insert();
              socket.emit('result', true)
            }else {
              socket.emit('result', 'phone')
            }
          }
          else if (idP.length == 10) {
            idType = 'nCode'
            id = parseInt(id);
            insert();
            socket.emit('result', true)
          }else {
            socket.emit('result', 'nCode')
          }
        }else {
          socket.emit('result', 'id')
        }
      }else {
        socket.emit('result', 'monthly')
      }
    }else {
      socket.emit('result', 'name')
    }
    function insert() {
      mongo.connect(url,{useUnifiedTopology:true},function (err, db) {
        if (err) return console.log('err7: '+err.message);
        else {
          db.db("sandogh").collection("financial").insertOne(
            {
              name:name,
              username:'',
              monthly:monthly,
              debt:debt,
              debtDate:debtDate,
              debtExp:debtExp,
              registeredTime:registeredTime,
              id: {id, idType},
              addedBy:'',
              addedIn:'',
            }
          ,function (errIn, resIn) {
            if (errIn) return console.log('err8: '+errIn.message);
            else {
            }
          })
        }
      })
    }
  })

  //get users for managers
  socket.on('giveMeUsers', function (username) {
    let day = moment().locale('fa').format('D');
    let mon = moment().locale('fa').format('M');
    let year = moment().locale('fa').format('Y');
    mongo.connect(url,{useUnifiedTopology:true},function (err, db) {
      if (err) return console.log('err9: '+err.message);
      else {
        db.db("sandogh").collection("userInfo").find({username:{$nin:[username]}}, {$projection:{_id:0, password:0}}).sort({ isUser:1, debt:1}).toArray(function (errIn, resIn) {
          if (errIn) return console.log('err10: '+errIn.message);
          else {
            resIn.forEach((iTem, j) => {
              iTem['activity'].forEach((item, i) => {
                if (parseInt((item.split(' ')[0].split('/')[1]) != parseInt(mon)) && (parseInt(item.split(' ')[0].split('/')[2] - parseInt(day)) < 0)) {
                  db.db("sandogh").collection("userInfo").updateOne({username:iTem['username']},{$pull:{activity:item}}, function (eee, rrr) {
                    if (eee) return console.log('err16: '+eee.message);
                  })
                }
              });
            });
            db.db("sandogh").collection("financial").find({}).sort({debt:1}).toArray(function (errIn2, resIn2) {
              if (errIn2) return console.log('err17: '+errIn2.message);
              socket.emit('users',resIn )
              socket.emit('usersFin',resIn2 )
            })
          }
        })
      }
    })
  })

  //get financial for managers
  socket.on('giveMeFin', function (r) {
    let username = r.u, name = r.n, ncode = r.c;
    mongo.connect(url,{useUnifiedTopology:true},function (err, db) {
      if (err) return console.log('err9: '+err.message);
      else {
        db.db("sandogh").collection("financial").find({$or:[{'id.id':ncode},{name:name}]}).sort({debt:1}).toArray(function (errIn, resIn) {
          if (errIn) return console.log('err17: '+errIn.message);
          setTimeout(function () {
            socket.emit('usersFin',resIn )
            console.log(resIn);
          }, 2000);
        })
      }
    })
  })

  //get alerts
  socket.on('giveMeAlert',function (a) {
    let username = a.username, isManager = a.manager, m = 'all';
    if (parseInt(username)) {
      username = parseInt(username)
    }
    if (isManager) {
      m = 'manager';
    }
    mongo.connect(url,{useUnifiedTopology:true},function (err, db) {
      if (err) return console.log('err19: '+err.message);
      else {
        db.db("sandogh").collection("alerts").find({}).project({_id:0, all:1, [m]:1, [username]:1}).toArray(function (errIn, resIn) {
          if (errIn) return console.log('err20: '+errIn.message);
          else {
            let n = resIn[0];
            socket.emit('alert', n)
          }
        })
      }
    })
  })

  /*mongo.connect(url,{useUnifiedTopology:true},function (err, db) {
    if (err) return console.log('err9: '+err.message);
    else {
      db.db("sandogh").collection("userInfo").insertOne({joinDate:moment().locale('fa').format('YYYY/M/D HH:mm:ss')},{username:'mstfsrmd'},function (errIn, resIn) {
        if (errIn) return console.log('err10: '+errIn.message);
        else {
          console.log(resIn);
        }
      })
    }
  })*/

  socket.on('disconnect', function (e) {
    console.log('-');
  })
})
