## Architecture

### Recommended high-level design
- **Node web app (existing)**
  - Handles UI, storage, and orchestration.
  - Uploads meeting audio/video and calls ML endpoints.
- **Python ML service** (FastAPI)
  - Endpoints: `/enroll`, `/identify`, `/transcribe` (optional combined endpoint as `/process`).
  - Internals: VAD segmentation → speaker embeddings (ECAPA) → nearest-centroid assignment; optional diarization; Whisper for STT.
  - Storage: Profiles JSON/DB, meeting manifests.

### Data flow (MVP)
1. Enrollment (one-time per teammate)
   - Input folders per speaker → compute embeddings → store centroid profile.
2. Meeting processing
   - Load audio → VAD segments → embed each segment → assign to nearest speaker centroid (thresholded) → optional Whisper transcript → align text to segments → return JSON.

### Components
- **VAD**: WebRTC VAD (16 kHz mono) to segment speech.
- **Speaker embeddings**: ECAPA-TDNN via SpeechBrain; centroid per teammate; cosine similarity for assignment.
- **Diarization (optional)**: pyannote.audio to improve turn boundaries and overlaps when needed.
- **ASR**:
  - Option A: OpenAI Transcriptions API (hosted Whisper) for low-ops.
  - Option B: Self-hosted Whisper for zero API cost but more compute.
- **Storage**: JSON files or Postgres/SQLite for profiles and meeting outputs; embeddings can be stored inline.

### API sketch
```json
POST /enroll
{
  "speakerId": "alice",
  "files": ["s3://.../alice1.wav", "s3://.../alice2.wav"]
}

POST /identify
{
  "audioUrl": "s3://.../standup-2025-11-05.m4a",
  "profilesUrl": "s3://.../profiles.json",
  "threshold": 0.82,
  "transcribe": true
}

// Response (identify)
{
  "segments": [
    { "start": 12.30, "end": 35.10, "speaker": "alice", "similarity": 0.91, "text": "..." }
  ]
}
```

### Quality controls
- Thresholding with fallback "unknown" label.
- Merge adjacent segments of same speaker.
- Track assignment similarity; flag low-confidence for review later.

### Why Python service
- Mature libraries for diarization and embeddings (pyannote, SpeechBrain, NeMo) are Python-first.
- Easier to swap ASR provider (OpenAI hosted vs local Whisper) without changing the Node frontend.


### TODO
- Formalize and version the HTTP API contract after the CLI stabilizes.
- Add `docs/api.md` with endpoint schemas (requests/responses) once requirements settle.


