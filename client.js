var eejs = require("ep_etherpad-lite/node/eejs");

exports.eejsBlock_embedPopup = function (hook_name, args, cb) {
  var rssFeed = { padId:"test" };
  args.content = args.content + eejs.require("ep_rss/templates/embedFrame.html", rssFeed, module);
  return cb();
};
