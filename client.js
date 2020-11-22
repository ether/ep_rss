const eejs = require('ep_etherpad-lite/node/eejs');

exports.eejsBlock_embedPopup = function (hook_name, args, cb) {
  const feedURL = `..${args.renderContext.req.url}/feed`;
  args.content += eejs.require('ep_rss/templates/embedFrame.ejs', {feed: feedURL});
  return cb();
};
