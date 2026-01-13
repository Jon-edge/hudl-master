## Deployment

### Suggested approach
- Keep the web app (Node) on Vercel or similar.
- Host the Python ML service separately:
  - Free/dev: Render, Railway, Fly.io (may sleep/throttle on free tiers).
  - Low-ops prod: Google Cloud Run (scales to zero, pay-per-use) or a small VPS.

### STT choices
- **Hosted (simple)**: OpenAI Transcriptions API using your existing API key.
  - Pros: minimal ops, predictable quality.
  - Cons: per-minute cost.
- **Self-hosted Whisper (free software)**
  - Pros: no API cost.
  - Cons: higher compute needs and slower on CPU; more ops.

### Costs
- Speaker ID stack (VAD, embeddings): open-source, $0 software.
- Hosted STT: pay per audio minute; no infra costs.
- Hosting: free tiers may sleep; always-on reliability typically small monthly cost.

### Operational notes
- No GPU required, but faster with GPU/Apple Silicon. CPU-only is acceptable for batch processing.
- Package/model sizes are large; avoid serverless with tiny timeouts and bundle limits for ML workloads.
- Store only necessary artifacts (profiles JSON, segment manifests); keep raw audio access-controlled.

### Next steps
- Define API contract between Node and Python service.
- Choose STT mode (hosted vs self-hosted) for MVP.
- Create minimal `/enroll` and `/identify` endpoints and wire to the app.


