var db = require('ep_etherpad-lite/node/db/DB').db;
var async = require('ep_etherpad-lite/node_modules/async');

exports.registerRoute = function (hook_name, args, cb) {

  args.app.get('/search', function(req, res) {

    var searchString = req.query["query"];
    var result = {};

    db.findKeys("pad:*", "*:*:*", function(err, pads){ // get all pads

      async.forEachSeries(pads, function(pad, callback){

        db.get(pad, function(err, padData){ // get the pad contents
          var padText = padData.atext.text || "";
          // does searchString exist in aText?
          if (padText.toLowerCase().indexOf(searchString.toLowerCase()) !== -1) {
            result.pad = pad;
          }
          callback();
        });
       
      }, function(err){
        res.send(JSON.stringify(result));
      });

    });

  });

};
