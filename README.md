# PixelWords

A fast, offline-first five-letter game by PixelTrade Studios. Built with TypeScript and Vite; all word lists and services are bundled locally.

## Run locally

```sh
npm install
npm run dev
```

Run checks and create a production build:

```sh
npm test
npm run typecheck
npm run build
```

The built-in TypeScript test command requires Node.js 22.6 or newer.

## Gameplay

Choose Deutsch, English, Français, Español, or Italiano, then enter any five letters and submit. The curated list selects target words; guesses are evaluated by their letters, so they do not need to be dictionary entries. Green means correct position, orange means the letter exists elsewhere, and dark means it is not in the answer. Use the on-screen keyboard or your physical keyboard. A five-letter guess consumes one of five attempts.

Streaks, scores, language stats, settings, and recent targets are saved in local storage. The optional second chance is a local mock reward and never required.
