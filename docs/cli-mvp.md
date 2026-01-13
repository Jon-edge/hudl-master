## CLI MVP — Speaker ID and Optional Transcription

This document specifies a minimal command-line interface (CLI) to:
- Enroll fixed teammates (create speaker profiles from labeled audio)
- Identify speakers in a meeting recording
- Optionally transcribe the audio and align text to segments

The CLI is intended for local/offline use first, and later callable by the web app backend.

### Goals
- Practical accuracy for small-team meetings with mostly fixed speakers
- Low-ops, local-first; optional use of hosted STT (OpenAI Transcriptions API)
- Clear JSON outputs for easy integration with the app

### Prerequisites
- Python 3.9+
- ffmpeg installed on PATH (for audio handling, and Whisper if used)
- (Option A: offline) Whisper Python package and model downloads
- (Option B: hosted) OpenAI API key for Transcriptions API

### Data prep for enrollment
Provide a directory with one subfolder per speaker, each containing short audio samples (10–60s clips are fine):

```
/path/to/labeled/
  alice/
    sample1.wav
    sample2.wav
  bob/
    sample3.wav
```

Supported formats: wav, mp3, m4a, flac, ogg. Audio is resampled to mono 16 kHz.

### Commands (proposed)

#### Enroll
Compute per-speaker embedding centroids from labeled folders and write `profiles.json`.

```bash
python -m voiceid.main enroll \
  --input-dir /path/to/labeled \
  --output /path/to/profiles.json
```

Output (`profiles.json`):
```json
{
  "model": "speechbrain/spkrec-ecapa-voxceleb",
  "sample_rate": 16000,
  "updated_at": "2025-11-05T00:00:00Z",
  "speakers": [
    {
      "id": "alice",
      "num_samples": 5,
      "embedding_centroid": [0.01, -0.02, ...]
    }
  ]
}
```

#### Identify
Detect speech segments, embed each, assign to nearest enrolled speaker. Optionally transcribe.

```bash
python -m voiceid.main identify \
  --audio /path/to/meeting.m4a \
  --profiles /path/to/profiles.json \
  --threshold 0.82 \
  --vad 2 \
  --frame-ms 30 \
  --pad-ms 300 \
  [--transcribe] \
  [--whisper-model small] \
  [--export /path/to/output.json]
```

Console output example:
```
[12.30–35.10] alice (sim=0.914): Yesterday I finished the API...
[36.02–58.50] bob (sim=0.873): Today I will work on the UI...
```

Export JSON schema (`--export`):
```json
{
  "audio": "/path/to/meeting.m4a",
  "segments": [
    {
      "start": 12.3,
      "end": 35.1,
      "speaker": "alice",
      "similarity": 0.914,
      "text": "Yesterday I finished the API..."
    }
  ]
}
```

### Flags and defaults
- `--threshold` (float, default 0.82): cosine similarity cutoff; below → `unknown`.
- `--vad` (0–3, default 2): WebRTC VAD aggressiveness.
- `--frame-ms` (10|20|30, default 30): VAD frame size.
- `--pad-ms` (default 300): hangover padding to merge short gaps.
- `--transcribe`: enable transcription.
- `--whisper-model` (default `small`): whisper model size if using local Whisper (`tiny|base|small|medium|large-v3`).

### STT options
- Offline/local: Whisper Python. Pros: no API cost; Cons: slower on CPU.
- Hosted: OpenAI Transcriptions API. Pros: minimal ops; Cons: per-minute cost.

### Outputs and downstream use
- Primary output is the segments JSON. The web app can:
  - Render a labeled transcript (per-segment)
  - Aggregate per-speaker text for standup notes
  - Flag low-similarity segments for manual review

### Limitations (MVP)
- Overlapping speech not perfectly handled without diarization; we start with VAD + nearest-centroid.
- Similar voices may require more enrollment samples and threshold tuning.
- Low-quality audio (far-field mics, noise) reduces accuracy.

### Roadmap
- Add diarization (pyannote.audio) to improve turn boundaries and overlaps.
- Add UI for segment review/relabel and re-run assignment.
- Support both OpenAI Transcriptions API and self-hosted Whisper via a simple switch.
- Add per-speaker summaries and structured standup extraction.

### TODO
- Mirror CLI commands to future HTTP endpoints; document mapping and payload schemas in `docs/api.md` when stable.


