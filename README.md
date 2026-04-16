# UI/UX Library — Vector-Powered Design Reference System

This is the canonical UI/UX component library and design reference system for all Jabbertones Cloud applications, powered by semantic vector search.

## Features
- **Semantic search** across 100K+ UI screenshots using SigLIP2 (image) + multilingual-e5-large (text) embeddings
- **Hybrid ranking** (60% image similarity + 40% text similarity) for precise design discovery
- **PostgreSQL pgvector** with HNSW indices for sub-second p99 query latency
- **Production-ready** with circuit breaker protection, Prometheus metrics, Grafana dashboards, and automated backups
- **Multi-app integration** — Use as a shared design reference system across all Jabbertones apps

## Quick Start

### 1. Initialize PostgreSQL Schema
```bash
npm run db:migrate
```

### 2. Start Prometheus Exporter
```bash
npm run prometheus:start
```

### 3. Import Grafana Dashboard
Visit http://localhost:3000, add Prometheus datasource, import dashboard from `dashboards/vector-db-dashboard.json`

### 4. Ingest UI Screens
```bash
npm run ingest:appstore --batch-size 1000 --limit 100000
```

### 5. Query the System
```typescript
import { SemanticUISearch } from './src/semantic-ui-search';

const searcher = new SemanticUISearch();
const results = await searcher.search({
  imageQuery: 'checkout_flow.png',
  textQuery: 'payment processing form',
  weights: { image: 0.6, text: 0.4 },
  limit: 10
});
```

## Architecture

### Services
- **Vector Database** — PostgreSQL pgvector (100K+ vectors)
- **Embedding Service** — SigLIP2 (768-dim) + multilingual-e5-large (1024-dim)
- **Search Engine** — HNSW indices, hybrid ranking, keyset pagination
- **Circuit Breaker** — Protects against NAS PostgreSQL crashes
- **Observability** — Prometheus metrics + Grafana dashboards
- **Backup System** — Daily automated pg_dump with 30-day retention

### Database Schema
- `ui_screens` — Screen metadata (app_name, platform, source, category)
- `ui_screen_embeddings` — 768-dim SigLIP2 + 1024-dim multilingual-e5-large vectors
- `ui_ingestion_state` — Batch tracking and deduplication state

### Performance Targets
- **Query Latency** — p99 <1000ms (100K vectors)
- **Ingestion Rate** — 200-500 vectors/second (batched)
- **Dedup Rate** — <10% (atomic UNIQUE constraints)
- **Circuit Breaker** — 3-failure threshold, 30s recovery timeout

## Scaling Roadmap

### Phase 1: 100K → 500K Vectors
- Read replicas on EC2
- PgBouncer connection pooling
- Expected latency: <500ms p99
- Cost: $300-400/mo

### Phase 2: 500K → 1M Vectors
- 4-shard horizontal sharding by screen_id%4
- Distributed aggregator microservice
- Expected latency: 600-900ms p99
- Cost: $950/mo

### Phase 3: 1M+ Vectors
- Migrate to Weaviate/Milvus/Pinecone
- Expected latency: 200-400ms p99
- Cost: $1000-1500/mo

## Integration Guide

### For Jabbertones Apps

Each app can use the shared UI Reference Engine:

#### 1. SkynPatch
```typescript
import { UIReferenceClient } from '@jabbertones-cloud/uiuxlibrary';

const uiRef = new UIReferenceClient({
  endpoint: 'https://uiref.jabbertones.cloud',
  apiKey: process.env.UIREF_API_KEY
});

// Search for checkout flow examples
const examples = await uiRef.search('e-commerce checkout form');
```

#### 2. Plushtrap
Use the same client to find fashion brand card designs:
```typescript
const fashionCards = await uiRef.search('brand product card with luxury styling');
```

#### 3. Other Apps
All Jabbertones apps can query the shared library for design inspiration and component patterns.

## API Endpoints

### Search
```
POST /api/v1/search
Content-Type: application/json

{
  "image_query": "base64-encoded-image",
  "text_query": "payment flow",
  "weights": { "image": 0.6, "text": 0.4 },
  "limit": 10
}
```

### Ingest
```
POST /api/v1/ingest
Content-Type: application/json

{
  "screen_id": "appstore_123",
  "image_base64": "...",
  "text_content": "checkout form",
  "metadata": { "app": "skynpatch", "platform": "ios" }
}
```

### Health Check
```
GET /api/v1/health
```

## Monitoring

All metrics available at `http://localhost:9090/metrics`:

- `vectordb_total_vectors` — Total vectors in database
- `vectordb_query_latency_ms` — Query latency (p50/p95/p99)
- `vectordb_ingestion_total` — Total ingested vectors
- `vectordb_dedup_rate` — Deduplication rate (%)
- `vectordb_circuit_breaker_state` — Circuit breaker state (0=CLOSED, 1=OPEN, 2=HALF_OPEN)
- `vectordb_nas_pool_size` — NAS database connection pool size

## Testing

```bash
# Unit tests
npm test

# Deduplication verification
npm test -- tests/dedup-verification.test.ts

# HNSW parameter benchmark (2+ hours)
npm run benchmark:hnsw

# AppStore integration tests (2 hours)
npm test -- tests/appstore-integration.test.ts

# E2E verification
npm run test:e2e
```

## Deployment

See `docs/VECTOR-DB-DEPLOYMENT-CHECKLIST.md` for production deployment (4-6 hours).

## Contributing

1. Follow the SaaS completion codex for any new features
2. Run `npm run lint && npm run test` before commits
3. Add tests for all new endpoints
4. Update Prometheus metrics for any new operations

## License

Proprietary — Jabbertones Cloud

## Support

Contact: jamonwidit@plushtrap.com
