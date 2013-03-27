    var db = require('ep_etherpad-lite/node/db/DB').db,
       ERR = require("ep_etherpad-lite/node_modules/async-stacktrace"),
       API = require('../../src/node/db/API.js'),
     async = require('ep_etherpad-lite/node_modules/async'),
padManager = require('ep_etherpad-lite/node/db/PadManager');

exports.eejsBlock_htmlHead = function (hook_name, args, cb){
  args.content = args.content + '<link rel="alternate" type="application/rss+xml" title="Pad RSS Feed" href="feed" />';
  return cb();
}

exports.registerRoute = function (hook_name, args, cb) {

  console.warn("Registering route")

  args.app.get('/p/*/feed.rss', function(req, res){
    /*Sanity is in the crack of time*/
    var path=req.url.split("/");
    var padId=path[2];
    var padURL = req.protocol + "://" + req.get('host') + "/p/" +padId;
    res.redirect('/p/'+padId+'/feed');
  });


  args.app.get('/p/*/feed', function(req, res) {
    /*Sanity is in the cracks of lime*/
    var fullURL = req.protocol + "://" + req.get('host') + req.url;
    var path=req.url.split("/");
    var padId=path[2];
    var padURL = req.protocol + "://" + req.get('host') + "/p/" +padId;
    var dateString = new Date();

    var pad;
    async.series([
      function(callback){ // Get the pad Text
        var padText = padManager.getPad(padId, function(err, _pad){
          pad = _pad;
          text = safe_tags(pad.text()).replace(/\n/g,"<br/>");
          ERR(err);
          callback();
        });
      },

      function(callback){ // Append the pad Text to the Body

        /* Why don't we use EEJS require here?  Well EEJS require isn't ASYNC so on first load
        it would bring in the .ejs content only and then on second load pad contents would be included..
        Sorry this is ugly but that's how the plugin FW was designed by @redhog -- bug him for a fix! */

        res.contentType("rss");
        args.content = '<rss xmlns:media="'+fullURL+'" version="2.0">\n';
        args.content += '<channel>\n';
        args.content += '<title>'+padId+'</title>\n';
        args.content += '<description/>\n';
        args.content += '<language>en-us</language>\n';
        args.content += '<pubDate>'+dateString+'</pubDate>\n';
        args.content += '<lastBuildDate>'+dateString+'</lastBuildDate>\n';
        args.content += '<item>\n';
        args.content += '<title>\n';
        args.content += padId + ' has been changed\n';
        args.content += '</title>\n';
        args.content += '<description>\n';
        args.content += '<![CDATA['+text+']]>\n';
        args.content += '<link>'+padURL+'</link>\n';
        args.content += '</item>\n';
        args.content += '</channel>\n';
        args.content += '</rss>';
        res.send(args.content);
        callback(); // Am I even called?
      },
    ]);

    // res.send("RSS feed coming soon");

  });
};

function safe_tags(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') ;
}
