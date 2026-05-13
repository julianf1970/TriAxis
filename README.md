# TriAxis Learning Analytics

A three-axis evaluation framework for L&D outcomes, implemented as working analytics software. Live demo at [triaxis.ai-included.co.uk](https://triaxis.ai-included.co.uk).

## What is TriAxis?

TriAxis evaluates learning outcomes across three independent axes — **skill progression**, **experience quality**, and **business connection** — rather than the sequential hierarchy that Kirkpatrick's 1959 model imposes.  The framework was designed for an era of instrumented, digital work where each axis can and should be measured directly rather than inferred from the level below.

Read the full thinking in *Training Only Creates Results When It Removes a Real Performance Constraint* and the supporting articles at [ai-included.co.uk](https://ai-included.co.uk).

## The Attribution Honesty panel

The Leadership dashboard partitions impact into three categories: **Direct** (outcomes the programme defensibly caused), **Correlation** (outcomes that moved alongside but cannot be claimed), and **Unknown** (outcomes that may or may not be related).  This is heretical for an L&D analytics product because honest measurement is more useful than flattering measurement.  No other panel in this software matters as much.

## Four dashboard views

- **Learner** — programmes completed, confidence trajectory, skill heatmap, focus areas
- **Manager** — team overview, needs-attention flags, skill adoption, business impact
- **L&D** — programme health, completion rates, drop-off analysis, intervention queue
- **Leadership** — ROI, weekly time saved, attribution honesty, portfolio value

## Demo data

The working demo is populated with synthetic data calibrated to a mid-to-large law firm context.  Ten lawyer-personas (Associate, Paralegal, Partner across London, Manchester, Birmingham) across five programmes (Microsoft Copilot Fundamentals, Document Automation with Word, Aderant Time Entry Excellence, iManage Advanced Filing & Search, Client Communication in Teams).  All names are fictional.  Numbers are illustrative of the framework, not a claim about any real engagement.

## Technical stack

- Node.js + Express backend
- SQLite (better-sqlite3) for data
- Vanilla JavaScript frontend with Chart.js
- No build step

## Running locally

```bash
npm install
npm start
```

The server runs at `http://localhost:3000`.  The database is pre-seeded; to regenerate the synthetic data, run `npm run seed`.

## Status and ownership

TriAxis was designed and built by Julian Franklin.  This repository contains the working demonstration software; the underlying framework, whitepaper, and supporting articles are published at [ai-included.co.uk](https://ai-included.co.uk).

For engagements, get in touch via [ai-included.co.uk](https://ai-included.co.uk).
