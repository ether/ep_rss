var db = require('ep_etherpad-lite/node/db/DB').db;
var async = require('ep_etherpad-lite/node_modules/async');

exports.eejsBlock_htmlHead = function (hook_name, args, cb){
  args.content = args.content + '<link rel="alternate" type="application/rss+xml" title="Pad RSS Feed" href="feed" />';
  return cb();
}

exports.registerRoute = function (hook_name, args, cb) {

  console.warn("Registering route")
  args.app.get('/p/*/feed', function(req, res) {
    var path=req.url.split("/");
    var padId=path[2];

    console.warn(padId);

    // has pad been edited in last hour?

/*
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
*/
    res.send("RSS feed coming soon");

  });
};
