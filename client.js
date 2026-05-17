'use strict';

const eejs = require('ep_etherpad-lite/node/eejs');

exports.eejsBlock_exportColumn = (hookName, args, cb) => {
  const feedURL = `..${args.renderContext.req.url}/feed`;
  args.content += eejs.require('ep_rss/templates/exportColumn.ejs', {feed: feedURL});
  return cb();
};

exports.eejsBlock_styles = (hookName, args, cb) => {
  args.content +=
      '<link rel="stylesheet" href="/static/plugins/ep_rss/static/css/exportColumn.css">';
  return cb();
};
