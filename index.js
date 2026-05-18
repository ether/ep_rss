'use strict';

const {Feed} = require('feed');
const API = require('ep_etherpad-lite/node/db/API');
const padManager = require('ep_etherpad-lite/node/db/PadManager');
const settings = require('ep_etherpad-lite/node/utils/Settings');

if (!settings.rss) {
  settings.rss = {};
  console.log('ep_rss settings have not been configured');
}

// How long to serve a cached feed before regenerating. Bumped on every
// pad edit anyway via the lastEdited check below, so this only affects
// pads that haven't been edited recently.
const staleTime = settings.rss.staleTime || 300000;

// Per-pad cache: { lastEdited: number, body: string }.
const feeds = {};

exports.eejsBlock_htmlHead = (hookName, args, cb) => {
  args.content +=
      '<link rel="alternate" type="application/rss+xml" title="Pad RSS Feed" href="feed" />';
  return cb();
};

exports.registerRoute = (hookName, args, cb) => {
  const redirectToFeed = (req, res) => {
    res.redirect(`/p/${encodeURIComponent(req.params.padId)}/feed`);
  };
  args.app.get('/p/:padId/rss', redirectToFeed);
  args.app.get('/p/:padId/feed.rss', redirectToFeed);
  args.app.get('/p/:padId/atom.xml', redirectToFeed);

  args.app.get('/p/:padId/feed', async (req, res) => {
    const padId = req.params.padId;
    const origin = `${req.protocol}://${req.get('host')}`;
    const padURL = `${origin}/p/${padId}`;
    // Strip query string so the atom:self link matches the URL feed
    // readers actually fetched (e.g. when they tack on cache-busters).
    const feedURL = `${origin}${req.url.split('?')[0]}`;

    const {lastEdited} = await API.getLastEdited(padId);
    const now = Date.now();
    const cached = feeds[padId];
    if (cached && cached.lastEdited === lastEdited && now - cached.builtAt < staleTime) {
      res.type('application/rss+xml');
      res.send(cached.body);
      return;
    }

    const pad = await padManager.getPad(padId);
    const feed = new Feed({
      title: padId,
      description: `Etherpad feed for ${padId}`,
      id: padURL,
      link: padURL,
      language: 'en-us',
      feedLinks: {rss: feedURL},
      updated: new Date(lastEdited),
    });
    feed.addItem({
      title: padId,
      id: `${padURL}#${lastEdited}`,
      link: padURL,
      description: pad.text(),
      date: new Date(lastEdited),
    });

    const body = feed.rss2();
    feeds[padId] = {lastEdited, builtAt: now, body};
    res.type('application/rss+xml');
    res.send(body);
  });

  cb();
};
