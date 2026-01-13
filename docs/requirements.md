## Requirements

### Scope and goals
- **Speaker identification**: Identify which teammate is speaking throughout a meeting.
- **Transcription (optional initially)**: Produce a text transcript; later, extract each person’s standup notes.
- **Bootstrap**: Manual labeling is acceptable to enroll fixed speakers; speakers are mostly static.

### Functional requirements
- **Enrollment**
  - Input: Small set of manually labeled recordings per teammate.
  - Output: A persistent profile per teammate (speaker embedding centroid).
- **Processing a meeting**
  - Input: Recorded audio/video file (common formats: m4a, mp3, wav, mp4).
  - Steps: VAD segmentation → speaker assignment → optional transcript → export JSON/Markdown.
  - Output: Ordered segments with timestamps, speaker label, similarity/confidence, text if available.
- **Standup notes**
  - Aggregate per-speaker text; optionally summarize into bullets (Yesterday/Today/Blockers if applicable).
- **Integration**
  - Provide an HTTP API callable from the existing Node web app.
  - Support future UI for review/relabel (not required for MVP).

### Non-functional requirements
- **Accuracy**: Practical accuracy for small team meetings; allow "unknown" for low-confidence segments.
- **Latency**: Batch/offline acceptable; live/real-time is not required.
- **Privacy**: Ability to keep audio and embeddings private; consent considerations noted.
- **Portability**: Run locally or in the cloud; avoid vendor lock-in for speaker ID.
- **Cost**: Prefer free/open-source; willing to pay small amounts for managed STT if it simplifies ops.

### Constraints and preferences
- Web app currently on Vercel; heavy ML won’t run there reliably.
- Minimal DevOps experience preferred → simple hosting choices.
- Local-only acceptable; cloud also acceptable if easy/low-cost.

### Inputs and outputs
- **Inputs**: Meeting audio/video; prior labeled audio folders per speaker for enrollment.
- **Outputs**:
  - JSON with segments: start, end, speaker, similarity, text (optional)
  - Optional per-speaker Markdown summary

### Open questions
- Expected number of speakers and meeting length.
- Languages involved; need for multilingual support.
- Preferred export targets (Markdown, Notion, Jira, Slack).


