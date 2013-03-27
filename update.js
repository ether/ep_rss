// Main job is to check pads periodically for activity and notify owners when someone begins editing and when someone finishes.
 var  db = require('../../src/node/db/DB').db,
     API = require('../../src/node/db/API.js'),
   async = require('../../src/node_modules/async'),
settings = require('../../src/node/utils/Settings');

// Settings -- EDIT THESE IN settings.json not here..
var pluginSettings = settings.ep_rss;
var checkFrequency = pluginSettings.checkFrequency || 60000; // 10 seconds
var staleTime = pluginSettings.staleTime || 300000; // 5 minutes
var fromName = pluginSettings.fromName || "Etherpad";
var fromEmail = pluginSettings.fromEmail || "pad@etherpad.org";
var urlToPads = pluginSettings.urlToPads || "http://beta.etherpad.org/p/";

// A timer object we maintain to control how we send emails
var timers = {};

exports.padUpdate = function (hook_name, _pad) {
  var pad = _pad.pad;
  var padId = pad.id;
  exports.sendUpdates(padId);

  // does an interval not exist for this pad?
  if(!timers[padId]){
    console.debug("Someone started editing "+padId);
    exports.notifyBegin(padId);
    console.debug("Created an interval time check for "+padId);
    // if not then create one and write it to the timers object
    timers[padId] = exports.createInterval(padId, checkFrequency); 
  }else{ // an interval already exists so don't create

  }
};

exports.sendUpdates = function(padId){
  // check to see if we can delete this interval
  API.getLastEdited(padId, function(callback, message){
    // we delete an interval if a pad hasn't been edited in X seconds.
    var currTS = new Date().getTime();
    if(currTS - message.lastEdited > staleTime){
      exports.notifyEnd(padId);
      console.warn("Interval went stale so deleting it from object and timer");
      var interval = timers[padId];
      clearInterval(timers[padId]); // remove the interval timer
      delete timers[padId]; // remove the entry from the padId
    }else{
      console.debug("email timeout not stale so not deleting");
    }
  });
  // The status of the users relationship with the pad -- IE if it's subscribed to this pad / if it's already on the pad
  // This comes frmo the database
  var userStatus = {}; // I'm not even sure we use this value..  I put it here when drunk or something
}

// Creates an interval process to check to send Updates based on checkFrequency and it returns an ID
exports.createInterval = function(padId){
  return setInterval(function(){
    exports.sendUpdates(padId), checkFrequency
  });
}

