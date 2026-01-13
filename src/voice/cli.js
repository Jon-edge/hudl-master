#!/usr/bin/env node

/**
 * Minimal testing CLI (no external APIs yet).
 *
 * Commands:
 *   enroll  --input-dir <dir> --output <profiles.json>
 *   identify --audio <file> [--export <out.json>]
 *
 * Notes:
 * - "enroll" inspects subfolders and writes a skeleton profiles file.
 * - "identify" emits a single unknown segment (placeholder) and can export JSON.
 * - STT and speaker embeddings are intentionally TODO for now.
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  let key = null;
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
        key = null;
      } else {
        args[key] = next;
        i++;
        key = null;
      }
    } else if (!args._) {
      args._ = [token];
    } else {
      args._.push(token);
    }
  }
  return args;
}

function ensureFileDir(p) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function cmdEnroll(args) {
  const inputDir = args['input-dir'];
  const output = args['output'];
  if (!inputDir || !output) {
    console.error('Usage: enroll --input-dir <dir> --output <profiles.json>');
    process.exit(2);
  }
  if (!fs.existsSync(inputDir) || !fs.statSync(inputDir).isDirectory()) {
    console.error(`Input directory not found: ${inputDir}`);
    process.exit(2);
  }

  const speakers = [];
  for (const entry of fs.readdirSync(inputDir)) {
    const full = path.join(inputDir, entry);
    if (fs.statSync(full).isDirectory()) {
      speakers.push({
        id: entry,
        num_samples: 0,
        // Placeholder centroid; actual embeddings will be computed later.
        embedding_centroid: [],
      });
    }
  }

  const payload = {
    model: 'TODO-speaker-embeddings-model',
    sample_rate: 16000,
    updated_at: new Date().toISOString(),
    speakers,
    _todo: 'Compute real centroids from labeled audio (Python service).',
  };

  ensureFileDir(output);
  fs.writeFileSync(output, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Wrote profiles to ${output} with ${speakers.length} speaker(s).`);
}

function cmdIdentify(args) {
  const audio = args['audio'];
  const exportPath = args['export'];
  if (!audio) {
    console.error('Usage: identify --audio <file> [--export <out.json>]');
    process.exit(2);
  }
  if (!fs.existsSync(audio)) {
    console.error(`Audio file not found: ${audio}`);
    process.exit(2);
  }

  // Minimal placeholder: single unknown segment; transcript is TODO.
  const segments = [
    {
      start: 0.0,
      end: null,
      speaker: 'unknown',
      similarity: 0.0,
      text: '',
      _todo: 'Run VAD + embeddings + (optional) STT later.',
    },
  ];

  for (const seg of segments) {
    const ts = `[${(seg.start ?? 0).toFixed(2)}–${seg.end == null ? '?' : seg.end.toFixed(2)}]`;
    console.log(`${ts} ${seg.speaker} (sim=${seg.similarity.toFixed(3)})${seg.text ? `: ${seg.text}` : ''}`);
  }

  if (exportPath) {
    ensureFileDir(exportPath);
    fs.writeFileSync(
      exportPath,
      JSON.stringify({ audio: path.resolve(audio), segments }, null, 2),
      'utf8'
    );
    console.log(`Exported JSON to ${exportPath}`);
  }
}

function main() {
  const argv = process.argv.slice(2);
  const [cmd, ...rest] = argv;
  const args = parseArgs(rest);
  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log(`Usage:
  enroll   --input-dir <dir> --output <profiles.json>
  identify --audio <file> [--export <out.json>]

Notes:
  - This is a minimal test harness. Speaker embeddings and STT are TODO.
  - The web app can call this CLI during early development.`);
    process.exit(0);
  }
  if (cmd === 'enroll') return cmdEnroll(args);
  if (cmd === 'identify') return cmdIdentify(args);
  console.error(`Unknown command: ${cmd}`);
  process.exit(2);
}

if (require.main === module) {
  main();
}


