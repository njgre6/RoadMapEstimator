var express = require('express');
var app = express()
var http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');
const del = require('delete');
const Jimp = require('jimp');

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'fit3140.s12018.team10@gmail.com',
      pass: 'fit3140!!'
    }
  });

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
   res.sendFile(__dirname + '/index.html');
});
//Whenever someone connects this gets executed
io.sockets.on('connection', function(socket) {
    var sessionid = socket.id;   
    var InitialLat;
    var InitialLong;
    var TopLat;
    var BottomLat;
    var LeftLong;
    var RightLong;
    var downloadedmap = false;
    var downloadedsat = false;

   console.log('A user connected');

   socket.on('Test',function(data){
       console.log(data)
   })

   socket.on('RoadCalculate',function(data){
    InitialLat = data.lat;
    InitialLong = data.lng;
    BottomLat = InitialLat - 0.00449157829;
    TopLat = InitialLat + 0.00449157829;
    var LongKm = 0.5*(360/(Math.cos(InitialLat*Math.PI/180)*40075));
    LeftLong = InitialLong - LongKm;
    RightLong = InitialLong + LongKm;
    var sitestring = 'https://maps.googleapis.com/maps/api/staticmap?center=' + InitialLat + ',' + InitialLong + '&zoom=16&size=640x640&scale=2&style=feature:all|element:labels|visibility:off&style=feature:all|element:labels.text|visibility:on&style=feature:all|element:labels.text.fill|color:0x000000&style=feature:all|element:labels.text.stroke|color:0xffffff&style=feature:all|element:labels.icon|visibility:on&style=feature:administrative|element:all|visibility:off&style=feature:landscape|element:all|color:0xffffff&style=feature:poi|element:all|visibility:off&style=feature:road|element:geometry.fill|color:0x000000|weight:3.3&style=feature:road|element:geometry.stroke|color:0x000000|weight:3.6&style=feature:road|element:labels|visibility:off&style=feature:road.highway|element:all|visibility:off&style=feature:road.arterial|element:all|visibility:on&style=feature:road.arterial|element:labels|visibility:off&style=feature:road.local|element:all|visibility:on&style=feature:road.local|element:geometry|visibility:on&style=feature:road.local|element:labels|visibility:off&style=feature:transit|element:all|visibility:off&style=feature:water|element:all|visibility:off&path=color:0xff0000ff|weight:0|' + TopLat + ',' + LeftLong + '|' + BottomLat + ',' + LeftLong + '|' + BottomLat + ',' + RightLong + '|' + TopLat + ',' + RightLong + '|' + TopLat + ',' + LeftLong + '&key=AIzaSyCb7Jl0oo2KA6ifc-CdntHDLYvYwG7ZqeA';
    var satstring = 'https://maps.googleapis.com/maps/api/staticmap?maptype=satellite&center=' + InitialLat + ',' + InitialLong +'&zoom=16&size=640x640&&scale=2&key=AIzaSyCb7Jl0oo2KA6ifc-CdntHDLYvYwG7ZqeA'
           console.log('RoadCalc button press');
                    Jimp.read(sitestring, function (err, mapimage) {
                        downloadedmap = true;
                        // do stuff with the image (if no exception)
                        Jimp.read(satstring, function (err, satimage) {
                            // do stuff with the image (if no exception)
                            downloadedsat = true; 
                 
                            mapimage.crop( 94, 94, 893, 894 );
                            
                            satimage.crop(94,94,893,894);
                            mapimage.invert();
                            mapimage.greyscale();
                            var roadpix = 0
                            mapimage.scan(0,0,mapimage.bitmap.width,mapimage.bitmap.height,function(x,y,idx){
                                var red   = this.bitmap.data[ idx + 0 ];
                                var green = this.bitmap.data[ idx + 1 ];
                                var blue  = this.bitmap.data[ idx + 2 ];
                                if (red>120||green>120||blue>120){
                                    satimage.setPixelColor(0xf00,x,y);
                                    roadpix += 1;
                                }

                            }) 
                            console.log(roadpix);
                            var file = "overlaytest" + sessionid + "." + satimage.getExtension();
                            satimage.write(file)
                            var width = mapimage.bitmap.width;
                            var height = mapimage.bitmap.height;
                            var totalpixels = width*height;
                            console.log(totalpixels)
                            console.log('The area of road is equal to :');
                            var sqkm = roadpix/totalpixels ;
                            console.log(sqkm);
                            console.log('in sq km');
                            console.log('or, in metres squared, ');
                            var sqm = sqkm * 1000000;
                            console.log(sqm);
                            socket.emit('RoadResults',sqm);
                            
                            

                            
                        });
                    });
                  
            


   })   

   socket.on('SendEmail',function(data){
       var emailaddress = data
       var mailOptions = {
        from: 'fit3140.s12018.team10@gmail.com',
        to: String(emailaddress),
        subject: 'ROAD AREA ESTIMATOR ROAD NETWORK',
        attachments: [{   // stream as an attachment
                filename: 'roadnetwork.png',
                content: fs.createReadStream(__dirname + '/overlaytest' + sessionid + '.png')
            }]

      };
      transporter.sendMail(mailOptions,function(error,response){    
        if(error){
            console.log(error);
            console.log('failed')
        }
        else{
            console.log("Message sent: " + response.message);
           console.log('Worked');
      };
    });

   });
  
   //Whenever someone disconnects this piece of code executed
   socket.on('disconnect', function () {
      console.log('A user disconnected');
      if (downloadedmap==true){
        del.sync(['map' + sessionid + '.png']);
      }
      if (downloadedsat==true){
        del.sync(['satellite' + sessionid + '.png']);
        del.sync(['overlaytest' + sessionid + '.png']);
      }  
      console.log('session files deleted successfully');
   });

});

http.listen(3000, function() {
   console.log('listening on *:3000');
});
