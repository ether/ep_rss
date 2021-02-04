'use strict';

const API = require('ep_etherpad-lite/node/db/API.js');
const padManager = require('ep_etherpad-lite/node/db/PadManager');
const settings = require('ep_etherpad-lite/node/utils/Settings');

if (!settings.rss) {
  settings.rss = {};
  console.log('ep_rss settings have not been configured');
}

const staleTime = settings.rss.staleTime || 300000; // 5 minutes, value should be set in settings
const feeds = {}; // A nasty global


exports.eejsBlock_htmlHead = (hookName, args, cb) => {
  args.content +=
      '<link rel="alternate" type="application/rss+xml" title="Pad RSS Feed" href="feed" />';
  return cb();
};

exports.registerRoute = (hookName, args, cb) => {
  args.app.get('/p/*/rss', (req, res) => {
    /* Sanity is in the crack of time*/
    const path = req.url.split('/');
    const padId = path[2];
    res.redirect(`/p/${padId}/feed`);
  });

  args.app.get('/p/*/feed.rss', (req, res) => {
    /* Sanity is in the crack of time*/
    const path = req.url.split('/');
    const padId = path[2];
    res.redirect(`/p/${padId}/feed`);
  });


  args.app.get('/p/*/atom.xml', (req, res) => {
    /* Sanity is in the crack of time*/
    const path = req.url.split('/');
    const padId = path[2];
    res.redirect(`/p/${padId}/feed`);
  });

  args.app.get('/p/*/feed', async (req, res) => {
    /* Sanity is in the cracks of lime*/
    const fullURL = `${req.protocol}://${req.get('host')}${req.url}`;
    const path = req.url.split('/');
    const padId = path[2];
    const padURL = `${req.protocol}://${req.get('host')}/p/${padId}`;
    const dateString = new Date();
    let isPublished = false; // is this item already published?
    let text;

    /* When was this pad last edited and should we publish an RSS update? */
    const message = await API.getLastEdited(padId);
    const currTS = new Date().getTime();
    if (!feeds[padId]) {
      feeds[padId] = {};
    }

    // was the pad edited within the last 5 minutes?
    if (currTS - message.lastEdited < staleTime) {
      isPublished = isAlreadyPublished(padId, message.lastEdited);

      if (!isPublished) { // If it's not already published and it's gone stale
        feeds[padId].lastEdited = message.lastEdited; // Add it to the timer object
      }
      cb();
    } else {
      if (!feeds[padId].feed) { // If it's not already stored in memory
        console.debug('RSS Feed not already in memory so writing memory', feeds);
        isPublished = false;
        feeds[padId].lastEdited = message.lastEdited; // Add it to the timer object
      } else {
        isPublished = true;
      }
      cb();
    }
    if (!isPublished) {
      const pad = await padManager.getPad(padId);
      text = safe_tags(pad.text()).replace(/\n/g, '<br/>');
    } else {
      cb();
    }

    if (isPublished) {
      console.debug(`Sending RSS from memory for ${padId}`);
      res.contentType('rss');
      res.send(feeds[padId].feed);
      cb();
    } else {
      console.debug(`Building RSS for ${padId}`);
      res.contentType('rss');
      args.content = '<rss version="2.0" \n';
      args.content += '   xmlns:content="http://purl.org/rss/1.0/modules/content/"\n';
      args.content += '   xmlns:atom="http://www.w3.org/2005/Atom"\n';
      args.content += '>\n';
      args.content += '<channel>\n';
      args.content += `<title>${padId}</title>\n`;
      args.content += `<atom:link href="${fullURL}" rel="self" type="application/rss+xml" />`;
      args.content += `<link>${padURL}</link>\n`;
      args.content += '<description/>\n';
      args.content += '<language>en-us</language>\n';
      args.content += `<pubDate>${dateString}</pubDate>\n`;
      args.content += `<lastBuildDate>${dateString}</lastBuildDate>\n`;
      args.content += '<item>\n';
      args.content += '<title>\n';
      args.content += `${padId}\n`;
      args.content += '</title>\n';
      args.content += '<description>\n';
      args.content += `<![CDATA[${text}]]>\n`;
      args.content += '</description>\n';
      args.content += `<link>${padURL}</link>\n`;
      args.content += '</item>\n';
      args.content += '</channel>\n';
      args.content += '</rss>';
      feeds[padId].feed = args.content;
      res.send(args.content); // Send it to the requester
      cb(); // Am I even called?
    }
  });
  cb();
};

const safe_tags =
    (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const isAlreadyPublished = (padId, editTime) => (feeds[padId] === editTime);
