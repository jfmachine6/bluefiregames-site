BlueFire Portfolio — Copilot Agent Instructions
These instructions onboard the AI agent to the BlueFire Portfolio codebase.
The agent must follow all architecture rules, data contracts, and conventions described here.

1. Project Overview
This repository powers the BlueFire Portfolio System, consisting of:

A Cloudflare Worker backend that fetches structured content from Notion databases

A static frontend (HTML/CSS/JS) hosted on www.bluefiregames.net

A Skill Tree UI with interactive modals, cards, and graph visualization

A Projects / Tasks / Devlogs system with relational data

A shared card component system used across multiple pages

The agent must understand that:

The Worker is the backend API

Notion is the external CMS

The frontend fetches from the Worker, not directly from Notion

Data shapes must remain stable unless explicitly instructed

2. Folder Structure (Accurate to This Repository)
The project is organized into modular folders, each representing a functional area of the BlueFire Portfolio system:

Code
/components
  skill-modal.js
  skill-modal.html
  skill-tree.js
  /cards
    project-card.js
    devlog-card.js
    task-card.js
    card.css
    card.js
  (shared UI components used across pages)

/data
  (static JSON or preload data files, including site-version.json)

/devlogs
  devlog.html
  devlog.css
  index.html
  (UI for individual devlog pages)

/projects
  project.html
  index.html
  (UI for project pages)

/skills
  tree.html
  index.html
  (Skill tree visualization)

/tasks
  task.html
  index.html
  (UI for task pages)

/worker_code
  worker.js
  (Local COPY of Cloudflare Worker backend and configuration)

index.html
style.css
card.css
nav.html
README.md
Notes for the Agent
/worker_code/worker.js is a local copy of the deployed Cloudflare Worker for contextual reference.

Reusable components live in /components/.

The card system is centralized in /components/cards/.

The site root contains global styles and entry pages.

The agent must preserve this structure unless explicitly instructed to reorganize it.

3. Cloudflare Worker Architecture
The Worker:

Connects to Notion API using env.NOTION_KEY

Uses Notion databases:

Projects

Tasks

Devlogs

Skills

Provides REST endpoints:

Code
GET /projects
GET /project/:id
GET /tasks
GET /task/:id
GET /devlogs
GET /devlog/:id
GET /skills
GET /skill/:id
The Worker includes:

In‑memory caching layer

Slugify utilities

Recursive block fetching

Series image extraction

Summaries, word counts, image counts

Relation resolution (project → tasks → devlogs)

The agent must not break these endpoints or their response shapes.

4. Notion Schema (Important)
Projects
Name (title)

Description (rich text)

Thumbnail (file)

Tasks (relation)

Sessions (relation)

Tasks
Name (title)

Description (rich text)

Thumbnail (file)

Sessions (relation)

Devlogs
Name (title)

Date or End Time (date)

Thumbnail (file)

Project (relation)

Tasks (relation)

Tags (multi-select)

Rich content blocks

Skills
Name

Description

Category

Type

Level

Themes

ParentSkills

Projects

Tasks

DevLogs

Examples

The agent must not rename or remove these properties unless explicitly instructed.

5. Frontend Architecture
The frontend is plain HTML/CSS/JS with no frameworks.

Skill Modal
Loads instantly using preloaded global arrays:

__ALL_SKILLS__

__ALL_PROJECTS__

__ALL_TASKS__

__ALL_DEVLOGS__

Renders:

Examples

Projects (grid)

Devlogs (grid)

Tasks (vertical)

Parent skills

Card Components
All cards use the shared .card layout:

Code
.card
.card-thumb
.card-body
.card-title
.card-sub
The agent must use these classes when generating new cards.

Skill Tree
Interactive graph

Nodes open the modal

Uses preloaded skill data

6. Coding Conventions
JavaScript
No frameworks

ES modules (import/export)

Avoid global variables except the preloaded arrays

Keep functions pure when possible

Prefer const over let

Use descriptive variable names

CSS
Dark theme using the BlueFire palette:

#0a1226

#0f1a33

#1a2a4a

#4fc3ff

#9bb3d6

#d8e2f3

HTML
Minimal markup

No inline JS

Use IDs for JS hooks

7. “Do Not Break” Rules
The agent must not:

Change Worker endpoint names

Change Worker response shapes

Change Notion property names

Remove or rename global arrays (__ALL_*__)

Break card.css class names

Break skill-modal layout

Break project/task/devlog page layouts

Remove caching logic

Remove recursive block fetching

Remove series extraction logic

Remove slugify logic

Unless explicitly instructed.

8. Deployment Workflow
The correct workflow is:

Edit Worker code locally

Increment version number on Worker

Notify user to update Cloudflare deployment

The agent must not assume Cloudflare dashboard editing.

9. Versioning Rules
This project uses a hierarchical versioning system.

Version Format
Code
vA.B.C.D.E
Site Version (vA.B.C)
Stored in:

Code
/data/site-version.json
Example:

json
{
  "version": "v0.2.4"
}
Where:

A — Publication Status (0–1)  
Controlled by the user.

B — Major Site Version  
Controlled by the user.

C — Minor Site Version  
Suggested by the agent, approved by the user.

The agent must always read this file to determine the current site version prefix.

File/Component Version (vA.B.C.D.E)
Each file should contain a version header at the top:

js
// Version: vA.B.C.D.E
Where:

D — Feature Version  
Incremented by the agent when a feature is added or modified.

E — Feature Minor Version  
Incremented by the agent for any change, including small fixes.

Agent Behavior Requirements
When editing a file with no version header, add one using:
vA.B.C.0.0

When making a small fix, increment E only.

When making a feature update, increment D and reset E to 0.

When the site version (A.B.C) changes, the agent must:

Update the version header in every edited file

Reset D and E to 0.0 for that file

The agent must never change A or B unless explicitly instructed.

The agent may suggest changes to C but must wait for user approval.

10. How the Agent Should Behave
When modifying Worker code
Maintain endpoint compatibility

Maintain data shapes

Maintain caching

Maintain Notion schema compatibility

Avoid breaking relations

When modifying frontend
Use existing card components

Use existing CSS classes

Keep modal structure intact

Keep skill tree interactions intact

When adding features
Follow existing patterns

Keep code modular

Keep UI consistent with BlueFire aesthetic

When refactoring
Preserve behavior

Preserve API contracts

Preserve data flow

Improve readability and maintainability

11. Special Notes
The Worker is the single source of truth for all data.

The frontend must never fetch Notion directly.

The agent should prefer incremental improvements unless asked for a full rewrite.

The agent should ask for confirmation before:

Changing data shapes

Changing Notion schema

Reorganizing folders

Large refactors

End of Agent Instructions