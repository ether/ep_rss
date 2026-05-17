# RSS feeds for Etherpad pads

[![npm](https://img.shields.io/npm/v/ep_rss.svg)](https://www.npmjs.com/package/ep_rss)
[![Backend Tests](https://github.com/ether/ep_rss/actions/workflows/backend-tests.yml/badge.svg?branch=main)](https://github.com/ether/ep_rss/actions/workflows/backend-tests.yml)
[![Frontend Tests](https://github.com/ether/ep_rss/actions/workflows/frontend-tests.yml/badge.svg?branch=main)](https://github.com/ether/ep_rss/actions/workflows/frontend-tests.yml)

Adds an RSS 2.0 feed for every pad so readers can subscribe to changes
in any feed reader.

## Install

From your Etherpad root, install the plugin via the Etherpad plugin
manager:

```sh
pnpm run plugins i ep_rss
```

Or install from the admin UI: **Admin → Manage Plugins**, search for
`ep_rss`, click *Install*. Restart Etherpad after installing.

> ⚠️ Don't run `npm i` / `pnpm add` against this plugin from inside
> the Etherpad source tree — Etherpad tracks installed plugins
> through its own plugin manager, and hand-editing `package.json`
> can leave the server unable to start.

## Endpoints

Once installed, each pad exposes:

| Path | Behavior |
|---|---|
| `/p/<pad>/feed` | 200 with `Content-Type: application/rss+xml` and the current pad text as a single `<item>` |
| `/p/<pad>/rss` | 302 → `/p/<pad>/feed` |
| `/p/<pad>/feed.rss` | 302 → `/p/<pad>/feed` |
| `/p/<pad>/atom.xml` | 302 → `/p/<pad>/feed` |

The pad page itself also advertises the feed in `<head>` so feed
readers auto-discover it:

```html
<link rel="alternate" type="application/rss+xml" title="Pad RSS Feed" href="feed" />
```

## Settings

Optional. Add to `settings.json` to control how long a generated feed
is cached in memory before being regenerated:

```json
"rss": {
  "staleTime": 300000
}
```

`staleTime` is in milliseconds. Defaults to 5 minutes
(`300000`) when unset.

## Development

```sh
pnpm install
pnpm run lint
```

Backend and frontend tests live under `static/tests/` and run inside
an Etherpad checkout — the CI workflows install this plugin into a
fresh Etherpad and exercise it end-to-end.

## License

Apache-2.0
