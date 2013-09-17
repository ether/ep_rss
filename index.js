    var db = require('ep_etherpad-lite/node/db/DB').db,
       ERR = require("ep_etherpad-lite/node_modules/async-stacktrace"),
       API = require('../../src/node/db/API.js'),
     async = require('ep_etherpad-lite/node_modules/async'),
padManager = require('ep_etherpad-lite/node/db/PadManager'),
 settings = require('../../src/node/utils/Settings');

if(!settings.rss){
  settings.rss = {};
  console.log("RSS Feed settings have not been configured, this is probably fine as they work out of the box");
}

var staleTime = settings.rss.staleTime || 300000; // 5 minutes, value should be set in settings
var feeds = {}; // A nasty global


exports.eejsBlock_htmlHead = function (hook_name, args, cb){
  args.content = args.content + '<link rel="alternate" type="application/rss+xml" title="Pad RSS Feed" href="feed" />';
  return cb();
}

exports.registerRoute = function (hook_name, args, cb) {

  args.app.get('/p/*/rss', function(req, res){
    /*Sanity is in the crack of time*/
    var path=req.url.split("/");
    var padId=path[2];
    var padURL = req.protocol + "://" + req.get('host') + "/p/" +padId;
    res.redirect('/p/'+padId+'/feed');
  });

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
    var isPublished = false; // is this item already published?
    
    /* When was this pad last edited and should we publish an RSS update? */
    async.series([
      function(cb){
        API.getLastEdited(padId, function(callback, message){
          var currTS = new Date().getTime();
          if(!feeds[padId]){
            feeds[padId] = {};
          }
          
          if(currTS - message.lastEdited < staleTime){ // was the pad edited within the last 5 minutes?
            isPublished = isAlreadyPublished(padId, message.lastEdited);
            
            if(!isPublished){ // If it's not already published and it's gone stale
              feeds[padId].lastEdited = message.lastEdited; // Add it to the timer object
            }
            cb();

          }else{
            if(!feeds[padId].feed){ // If it's not already stored in memory
              console.debug("RSS Feed not already in memory so writing memory", feeds);
              isPublished = false;
              feeds[padId].lastEdited = message.lastEdited; // Add it to the timer object
            }else{
              isPublished = true;
            }
            cb();
          }
        });
      },

      /* Get the pad text */
      function(cb){ 
        if(!isPublished){
          var padText = padManager.getPad(padId, function(err, _pad){
            pad = _pad;
            text = safe_tags(pad.text()).replace(/\n/g,"<br/>");
            ERR(err);
            cb();
          });
        }else{
          cb();
        }
      },

      /* Create a new RSS item */
      function(cb){
        if(isPublished){
          console.debug("Sending RSS from memory for "+padId);
          res.contentType("rss");
          res.send(feeds[padId].feed);
          cb();
        }
        else{
          console.debug("Building RSS for "+padId);
          /* Why don't we use EEJS require here?  Well EEJS require isn't ASYNC so on first load
          it would bring in the .ejs content only and then on second load pad contents would be included..
          Sorry this is ugly but that's how the plugin FW was designed by @redhog -- bug him for a fix! */
          res.contentType("rss");
          args.content = '<rss version="2.0" \n';
          args.content += '   xmlns:content="http://purl.org/rss/1.0/modules/content/"\n';
          args.content += '   xmlns:atom="http://www.w3.org/2005/Atom"\n';
          args.content += '>\n';
          args.content += '<channel>\n';
          args.content += '<title>'+padId+'</title>\n';
          args.content += '<atom:link href="'+fullURL+'" rel="self" type="application/rss+xml" />';
          args.content += '<link>'+padURL+'</link>\n';
          args.content += '<description/>\n';
          args.content += '<language>en-us</language>\n';
          args.content += '<pubDate>'+dateString+'</pubDate>\n';
          args.content += '<lastBuildDate>'+dateString+'</lastBuildDate>\n';
          args.content += '<item>\n';
          args.content += '<title>\n';
          args.content += padId + '\n';
          args.content += '</title>\n';
          args.content += '<description>\n';
          args.content += '<![CDATA['+text+']]>\n';
          args.content += '</description>\n';
          args.content += '<link>'+padURL+'</link>\n';
          args.content += '</item>\n';
          args.content += '</channel>\n';
          args.content += '</rss>';
          feeds[padId].feed = args.content;
          res.send(args.content); // Send it to the requester
          cb(); // Am I even called?
        }

      },function(){
        /* Todo - Some error handling */
      }
    ]);
  });
};

function safe_tags(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') ;
}

function isAlreadyPublished(padId, editTime){
  return (feeds[padId] == editTime)
}
