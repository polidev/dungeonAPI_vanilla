# Dungeon API — Architecture

## 1. Overview

A practice REST API built with **Node.js + Express** implementing the **Model-View-Controller (MVC)** pattern with layered separation:

```
routes → middleware → controllers → services → repositories → in-memory data
```

The project exposes full CRUD over three dungeon-themed resources — **Monsters**, **Heroes**, and **Items** — with **pagination and filtering via query parameters**.

There is **no database and no persistent storage**: all data lives in module-level in-memory arrays created through a **factory pattern** and is lost when the process restarts. This is intentional and keeps the project focused on the MVC/API patterns.

There is **no front-end**; the API is exercised with Postman/curl. A `client/` folder is reserved for a future front-end.

## 2. Tech stack

| Concern | Choice | Notes |
|---------|--------|-------|
| Runtime | Node.js LTS (20+) | ES Modules (`"type": "module"`) |
| Web framework | Express 4 (pinned) | Stable; Express 5 changed route/error semantics |
| Logging | morgan | Request logging in dev |
| CORS | cors | Enabled now so a future front-end can call the API |
| Dev tooling | nodemon (or `node --watch`) | Auto-restart on change |
| Tests | jest + supertest | Unit + integration specs |

## 3. Folder structure

```
dungeon-api-vanilla/
├── package.json              # deps, scripts, ESM config
├── .gitignore
├── .env.example              # env var template (PORT)
├── README.md                 # user-facing quickstart + API reference
├── ARCHITECTURE.md           # this document
├── server/                   # ← back-end (the whole project lives here)
│   ├── src/
│   │   ├── server.js         # entry point — starts the HTTP listener
│   │   ├── app.js            # Express app wiring (exported so tests can use it)
│   │   ├── config/
│   │   │   └── constants.js  # PORT, default page/limit, max limit, sortable fields
│   │   ├── routes/           # thin URL → controller mapping
│   │   ├── controllers/      # HTTP concerns: parse req, call service, build response
│   │   ├── services/         # business logic: CRUD rules, pagination, filtering
│   │   ├── models/           # entity schema + validation + factory (no storage)
│   │   ├── data/
│   │   │   └── repositories/ # in-memory store + query engine (swap for a DB later)
│   │   ├── middleware/       # validation, pagination parser, notFound, errorHandler
│   │   └── utils/
│   │       └── response.js   # response envelope + async wrapper helpers
│   └── test/                 # jest + supertest specs
└── client/                   # reserved, empty — future front-end folder
```

## 4. Architecture layers

The MVC pattern is applied with a clean, testable layering:

| Layer | Responsibility | Example file |
|-------|---------------|--------------|
| routes | Map URLs to controllers; must stay thin (no logic) | `server/src/routes/monster.routes.js` |
| middleware | Cross-cutting concerns: validation, pagination parsing, 404, error handling | `server/src/middleware/validate.js` |
| controllers | Parse HTTP input, delegate to services, build the response envelope | `server/src/controllers/monster.controller.js` |
| services | Business rules, pagination & filtering logic, CRUD orchestration | `server/src/services/monster.service.js` |
| models | Entity schema, field validation, factory for creating valid records (no storage) | `server/src/models/monster.model.js` |
| repositories | In-memory data access + query engine; the only layer that touches data | `server/src/data/repositories/monster.repository.js` |

**Request flow:**

```
HTTP request
  → routes        (dispatch to controller)
  → middleware    (validate params/body, parse pagination)
  → controller    (extract req data, call service)
  → service       (apply business rules: filters, sorting, paging)
  → repository    (query the in-memory store)
  ← { data, meta } | { error }  (envelope built by controller via utils/response.js)
```

**Dependency rule:** each layer may only call the layer below it. Controllers never touch the repository directly; routes never contain logic; repositories never return Express-specific objects.

## 5. API contract

- Base URL: `/api/v1`
- Content type: `application/json`
- Success envelope: `{ "data": <resource|resource[]>, "meta": { ... } }`
- Error envelope: `{ "error": { "status": 404, "message": "..." } }`

### 5.1 Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Liveness check; returns counts, uptime, resource names |

### 5.2 Monsters

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/monsters` | List (paginated + filterable) |
| POST | `/api/v1/monsters` | Create monster |
| GET | `/api/v1/monsters/:id` | Get one monster (404 if missing) |
| PUT | `/api/v1/monsters/:id` | Full replace |
| PATCH | `/api/v1/monsters/:id` | Partial update |
| DELETE | `/api/v1/monsters/:id` | Remove monster |

### 5.3 Heroes

Same surface as Monsters under `/api/v1/heroes`.

### 5.4 Items

Same surface as Monsters under `/api/v1/items`.

### 5.5 Sample payloads

```jsonc
// Monster
{ "id": "c1a2…", "name": "Goblin", "type": "humanoid", "level": 3,
  "hitPoints": 40, "difficulty": "easy", "createdAt": "2026-08-02T00:00:00.000Z" }

// Hero
{ "id": "a3b4…", "name": "Aria", "heroClass": "mage", "level": 5,
  "health": 60, "attack": 25 }

// Item
{ "id": "e5f6…", "name": "Iron Sword", "category": "weapon",
  "rarity": "rare", "value": 120 }
```

## 6. Pagination & filtering spec

Applied to every list endpoint.

### 6.1 Pagination query params

| Param | Default | Range | Behavior |
|-------|---------|-------|----------|
| `page` | 1 | ≥ 1 | Non-numeric or < 1 coerced to 1 |
| `limit` | 10 | 1 … `MAX_LIMIT` (e.g. 100) | Non-numeric coerced to default; clamped to max |

### 6.2 Common filters

| Param | Behavior |
|-------|----------|
| `search` | Case-insensitive substring match on `name` |
| `sortBy` | Whitelisted field per resource; unknown fields ignored (or rejected) |
| `sortOrder` | `asc` (default) or `desc` |

### 6.3 Domain filters

| Resource | Example filters |
|----------|-----------------|
| Monsters | `type`, `difficulty`, `minLevel`, `maxLevel` |
| Heroes | `heroClass`, `minLevel`, `maxLevel` |
| Items | `category`, `rarity` |

### 6.4 Response `meta`

```jsonc
{ "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
```

## 7. Error handling & validation

- **Centralized error handling** — one global `errorHandler` middleware + one `notFound` handler; controllers never hand-build error responses.
- **Stable error shape** — every error returns `{ "error": { "status", "message" } }`.
- **Status codes used:**
  - `200 OK` — success (GET/PUT/PATCH/DELETE)
  - `201 Created` — POST success
  - `400 Bad Request` — malformed body, invalid query params, validation failure
  - `404 Not Found` — unknown route or missing resource id
  - `405 Method Not Allowed` — valid path, unsupported method
  - `500 Internal Server Error` — unexpected failure (caught by global handler)
- **Validation** — reusable `validate.js` middleware driven by per-model field specs; PATCH validates partial payloads (only supplied fields).
- **Async safety** — an async wrapper utility routes rejected promises to the error handler (no unhandled rejections).

## 8. In-memory storage strategy

- Data is stored in module-level arrays inside each repository.
- Repositories are created through a **factory** (`createMonsterRepository()`), which:
  - keeps records isolated between tests (fresh store per test);
  - makes the storage backend swappable later.
- Data resets on every process restart — documented as a **known limitation** (see §9).
- The repository exposes a small query interface (`list(query)`, `findById(id)`, `create(record)`, `update(id, patch)`, `remove(id)`) so a real database can replace the implementation without touching services or controllers.

## 9. Known limitations & future work

Known limitations (intentional):
- No persistence — data is lost on restart.
- No authentication / authorization.
- No relationships between resources.
- No front-end (backend-only practice project).

Future enhancements (explicitly deferred):
- Swap in a real database (e.g., `better-sqlite3`, MongoDB) behind the repository interface.
- Add relationships (e.g., hero inventory references items).
- Add JWT auth + user roles.
- Stand up a front-end in the reserved `client/` folder (CORS is already enabled).
- Upgrade to Express 5 when desired.

## 10. How to run / test

```bash
npm install
npm run dev     # nodemon, watches server/src
npm start       # plain start
npm test        # jest + supertest
```

See `README.md` for a quickstart and full curl examples.
