# Dungeon API

A practice **REST API** built with **Node.js + Express** implementing the **Model-View-Controller (MVC)** pattern. It provides full CRUD, pagination, and query-parameter filtering for three dungeon-themed resources: **Monsters**, **Heroes**, and **Items**.

- No database, no persistent storage — all data lives in memory and resets on restart.
- No front-end — the API is exercised with Postman or curl (a `client/` folder is reserved for a future front-end).
- Layered architecture: routes → controllers → services → repositories.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full technical design.

## Requirements

- Node.js 20+ (LTS recommended)

## Quickstart

```bash
npm install
npm run dev     # start with auto-reload (nodemon)
# or
npm start       # start without auto-reload
```

Server listens on `http://localhost:3000` (configurable via `PORT`).

## Tests

```bash
npm test
```

Runs the Jest + Supertest suite covering CRUD, pagination, filtering, and error paths.

## API reference

Base URL: `http://localhost:3000/api/v1`

### Health check

```bash
curl http://localhost:3000/api/v1/health
```

### Resources

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/monsters` | List monsters (paginated + filterable) |
| POST | `/api/v1/monsters` | Create a monster |
| GET | `/api/v1/monsters/:id` | Get one monster |
| PUT | `/api/v1/monsters/:id` | Full replace |
| PATCH | `/api/v1/monsters/:id` | Partial update |
| DELETE | `/api/v1/monsters/:id` | Delete a monster |

`/api/v1/heroes` and `/api/v1/items` expose the identical CRUD surface.

### Common list query params

| Param | Default | Description |
|-------|---------|-------------|
| `page` | 1 | Page number (≥ 1) |
| `limit` | 10 | Items per page (1 … 100) |
| `search` | — | Case-insensitive substring match on `name` |
| `sortBy` | — | Whitelisted field to sort by |
| `sortOrder` | `asc` | `asc` or `desc` |

### Domain filters

| Resource | Filters |
|----------|---------|
| Monsters | `type`, `difficulty`, `minLevel`, `maxLevel` |
| Heroes | `heroClass`, `minLevel`, `maxLevel` |
| Items | `category`, `rarity` |

## Examples

List monsters on page 2, 5 per page:

```bash
curl "http://localhost:3000/api/v1/monsters?page=2&limit=5"
```

Filter + sort:

```bash
curl "http://localhost:3000/api/v1/items?category=weapon&rarity=legendary&sortBy=value&sortOrder=desc"
```

Search:

```bash
curl "http://localhost:3000/api/v1/heroes?search=aria"
```

Create a monster:

```bash
curl -X POST http://localhost:3000/api/v1/monsters \
  -H "Content-Type: application/json" \
  -d '{"name":"Goblin","type":"humanoid","level":3,"hitPoints":40,"difficulty":"easy"}'
```

Update one field:

```bash
curl -X PATCH http://localhost:3000/api/v1/monsters/<id> \
  -H "Content-Type: application/json" \
  -d '{"level":4}'
```

Delete:

```bash
curl -X DELETE http://localhost:3000/api/v1/monsters/<id>
```

### Responses

Success:

```json
{
  "data": [ { "id": "…", "name": "Goblin", "level": 3 } ],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

Error:

```json
{ "error": { "status": 404, "message": "Monster with id 'x' not found" } }
```

## Project structure

```
dungeon-api-vanilla/
├── server/src/        # back-end source (routes, controllers, services, models, repositories)
├── server/test/       # jest + supertest specs
└── client/            # reserved for a future front-end (empty)
```

## Known limitations

- Data is in-memory only and resets on restart.
- No authentication or relationships between resources.

Future enhancements are tracked in [ARCHITECTURE.md](ARCHITECTURE.md#9-known-limitations--future-work).
