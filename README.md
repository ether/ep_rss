# ep_rss

![Publish Status](https://github.com/ether/ep_rss/workflows/Node.js%20Package/badge.svg) [![Backend Tests Status](https://github.com/ether/ep_rss/actions/workflows/test-and-release.yml/badge.svg)](https://github.com/ether/ep_rss/actions/workflows/test-and-release.yml)

Exposes an RSS feed for each pad at `/p/{padId}/feed`.

## Install

```
pnpm run plugins i ep_rss
```

## Settings

Optional stale time (milliseconds before a new RSS item is generated) can be set in `settings.json`:

```json
"rss": {
  "staleTime": 300000
}
```

Defaults to 5 minutes if not configured.

## License

Apache-2.0
