# PLANNING.md — KnowledgeForge (AI Knowledge Base Builder)

## What Is This?

KnowledgeForge is a SaaS tool that lets anyone turn messy, unstructured content (emails, documents, help articles, Slack exports, CSVs) into a clean, structured, AI-ready knowledge base — without writing a single line of code.

The user uploads their raw content. The app extracts text, uses AI to categorize and chunk it intelligently, and gives the user a clean editing interface to curate the results. They can then export the knowledge base in formats ready to power AI assistants, chatbots, internal search, or documentation sites.

## Who Is This For?

- **SaaS founders** building AI-powered features who need structured knowledge bases from their existing content
- **Consultants and agencies** who build AI tools for clients and need to process client content quickly
- **Nonprofit and small business operators** who want to create AI assistants trained on their own institutional knowledge
- **Customer support teams** who want to turn years of email history and help docs into a searchable, AI-ready resource

## The Problem

Building a knowledge base for an AI assistant is tedious manual work:
1. Gather content from multiple sources (email platforms, Google Drive, help desks, Slack)
2. Extract text from various file formats
3. Figure out what type of content each piece is
4. Break content into appropriately sized chunks
5. Write titles and summaries for each chunk
6. Tag and categorize everything
7. Remove duplicates, irrelevant content, and noise
8. Structure it all into a format an AI can use

Most people give up at step 2. KnowledgeForge automates steps 1–6 and makes step 7 fast and easy.

## Core Workflow

```
Upload → Extract → Process → Curate → Export
```

1. **Upload** — Drag and drop files or connect to sources (email, Google Drive, etc.)
2. **Extract** — Automatic text extraction from all supported formats
3. **Process** — AI categorizes, chunks, titles, summarizes, and tags each piece
4. **Curate** — User reviews, edits, merges, splits, and approves chunks in a clean UI
5. **Export** — Download as structured JSON, Markdown, CSV, or test with built-in Ask feature

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React + Tailwind CSS | Fast to build, clean UI |
| Backend | Node.js / Express | JavaScript end-to-end, huge ecosystem |
| Database | PostgreSQL | Robust, handles relational data well, free tier on Render |
| File Storage | Local filesystem → S3 later | Simple to start, scalable later |
| AI Processing | Anthropic Claude API (Sonnet) | Best balance of quality and cost for text processing |
| Auth | Google OAuth 2.0 (via Passport.js) | Already set up in Google Cloud Console |
| Payments | Stripe | Industry standard, easy to integrate |
| Hosting | Render | Already familiar, easy deploys from GitHub |

## Database Schema

### Tables

**users**
- id (UUID, primary key)
- email (string, unique)
- name (string)
- google_id (string, unique)
- plan (enum: 'free', 'pro')
- stripe_customer_id (string, nullable)
- created_at (timestamp)
- updated_at (timestamp)

**projects**
- id (UUID, primary key)
- user_id (UUID, foreign key → users)
- name (string)
- description (text, nullable)
- status (enum: 'active', 'archived')
- created_at (timestamp)
- updated_at (timestamp)

**documents**
- id (UUID, primary key)
- project_id (UUID, foreign key → projects)
- original_filename (string)
- file_type (string) — e.g., 'email', 'pdf', 'docx', 'csv', 'txt', 'html'
- file_path (string) — path to stored original file
- raw_text (text) — extracted text content
- status (enum: 'uploaded', 'extracting', 'extracted', 'processing', 'processed', 'error')
- error_message (text, nullable)
- metadata (jsonb) — source-specific metadata (email subject, date, sender, etc.)
- created_at (timestamp)
- updated_at (timestamp)

**chunks**
- id (UUID, primary key)
- document_id (UUID, foreign key → documents)
- project_id (UUID, foreign key → projects) — denormalized for faster queries
- title (string) — AI-generated title
- content (text) — the chunk text
- summary (text) — AI-generated summary
- category (string) — AI-assigned category
- token_count (integer) — approximate token count
- sort_order (integer) — position within document
- status (enum: 'pending_review', 'approved', 'rejected')
- created_at (timestamp)
- updated_at (timestamp)

**tags**
- id (UUID, primary key)
- project_id (UUID, foreign key → projects)
- name (string)
- created_at (timestamp)

**chunk_tags** (junction table)
- chunk_id (UUID, foreign key → chunks)
- tag_id (UUID, foreign key → tags)

### Indexes
- documents: project_id, status
- chunks: project_id, document_id, category, status
- tags: project_id, name (unique together)

## Supported File Formats

### Phase 1 (MVP)
- Plain text (.txt)
- Markdown (.md)
- CSV (.csv) — each row becomes a document
- PDF (.pdf) — using pdf-parse
- Word documents (.docx) — using mammoth
- HTML (.html) — strip tags, extract text

### Phase 2
- Email exports (.eml, .mbox)
- JSON (configurable field mapping)
- Google Docs (via API)

### Phase 3
- Slack exports
- Notion exports
- Zendesk/Intercom ticket exports
- Direct API connections to email platforms (Mailchimp, etc.)

## AI Processing Pipeline

When documents are processed, each one is sent to Claude Sonnet with the following instructions:

### Step 1: Classification
Identify the document type. Categories include (but AI should suggest new ones if needed):
- Email Campaign (promotional, newsletter, announcement, transactional)
- Help Article / FAQ
- Policy Document
- Marketing Copy
- Internal Communication
- Meeting Notes
- Product Documentation
- Blog Post / Article
- Customer Communication
- Legal / Compliance
- Other (with AI-suggested label)

### Step 2: Intelligent Chunking
Break the document into logical chunks of approximately 500–800 tokens each. Rules:
- Respect natural boundaries (sections, paragraphs, topic shifts)
- Never break mid-sentence
- Keep related content together (a question and its answer should be one chunk)
- If a document is under 800 tokens, keep it as a single chunk

### Step 3: Enrichment
For each chunk, generate:
- **Title** — A clear, descriptive title (not the filename)
- **Summary** — 1-2 sentence summary of what this chunk contains
- **Tags** — 3-5 relevant topic tags
- **Category** — Assigned from the classification step

### API Prompt Template
```
You are processing documents for a knowledge base. For each document provided:

1. Classify the document type from this list: [categories]
2. Break it into logical chunks of 500-800 tokens, respecting natural boundaries
3. For each chunk, provide:
   - title: A clear descriptive title
   - summary: 1-2 sentence summary
   - tags: 3-5 relevant topic tags
   - category: The document classification

Respond in JSON format only. No preamble or markdown.

{
  "document_type": "string",
  "chunks": [
    {
      "title": "string",
      "content": "string",
      "summary": "string",
      "tags": ["string"],
      "category": "string"
    }
  ]
}
```

## Pages & UI

### 1. Landing Page (`/`)
- Hero: "Turn your messy content into an AI-ready knowledge base in minutes"
- How it works (3-step visual: Upload → Process → Export)
- Pricing section
- CTA: "Get Started Free"

### 2. Dashboard (`/dashboard`)
- List of projects with status, document count, chunk count
- "New Project" button
- Quick stats: total documents processed, total chunks created

### 3. Project View (`/project/:id`)
- Project name and description (editable)
- File upload zone (drag and drop, multi-file)
- Document list with status indicators (uploaded → processing → done)
- Processing progress bar
- "Process All" button to kick off AI processing
- Tab: Documents (list of all uploaded files)
- Tab: Knowledge Base (curated chunk view)
- Tab: Export

### 4. Knowledge Base Editor (`/project/:id/knowledge-base`)
- Left sidebar: categories and tags as filters
- Main area: chunk cards showing title, summary, category, tags, and preview of content
- Each chunk card has: Edit, Merge with Next, Split, Approve, Reject buttons
- Top bar: progress indicator ("47 of 132 chunks reviewed")
- Bulk actions: Approve All in Category, Delete All Rejected
- Search bar to find specific chunks

### 5. Chunk Editor (modal or inline)
- Edit title, content, summary, category
- Add/remove tags
- Split chunk at cursor position
- Merge with adjacent chunk
- Preview token count

### 6. Export Page (`/project/:id/export`)
- Format selection: JSON, Markdown, CSV
- Options: Include only approved chunks, include summaries, include tags
- Preview of export format
- Download button
- "Test Your Knowledge Base" — simple chat interface that queries the knowledge base

### 7. Settings (`/settings`)
- Account info
- Billing / plan management
- API key management (for Pro users who want programmatic access)

## API Endpoints

### Auth
- `GET /auth/google` — Initiate Google OAuth
- `GET /auth/google/callback` — OAuth callback
- `POST /auth/logout` — Log out
- `GET /auth/me` — Get current user

### Projects
- `GET /api/projects` — List user's projects
- `POST /api/projects` — Create project
- `PATCH /api/projects/:id` — Update project
- `DELETE /api/projects/:id` — Delete project

### Documents
- `POST /api/projects/:id/documents` — Upload files (multipart)
- `GET /api/projects/:id/documents` — List documents
- `DELETE /api/documents/:id` — Delete document
- `POST /api/projects/:id/process` — Start AI processing for all unprocessed documents

### Chunks
- `GET /api/projects/:id/chunks` — List chunks (with filtering, sorting, pagination)
- `PATCH /api/chunks/:id` — Update chunk (title, content, summary, category, status)
- `DELETE /api/chunks/:id` — Delete chunk
- `POST /api/chunks/:id/split` — Split chunk at position
- `POST /api/chunks/merge` — Merge two chunks (body: { chunkIds: [id1, id2] })
- `PATCH /api/chunks/bulk` — Bulk update (approve, reject, re-categorize)

### Tags
- `GET /api/projects/:id/tags` — List tags
- `POST /api/projects/:id/tags` — Create tag
- `DELETE /api/tags/:id` — Delete tag

### Export
- `GET /api/projects/:id/export?format=json|md|csv&status=approved` — Export knowledge base
- `POST /api/projects/:id/ask` — Query knowledge base with a question (returns relevant chunks + AI answer)

### Billing
- `POST /api/billing/checkout` — Create Stripe checkout session
- `POST /api/billing/portal` — Create Stripe billing portal session
- `POST /api/webhooks/stripe` — Stripe webhook handler

## Pricing

### Free Tier
- 1 project
- 50 documents per project
- All file formats supported
- AI processing included
- Export to JSON, Markdown, CSV
- Built-in "Ask" testing (10 queries/day)

### Pro ($29/month)
- Unlimited projects
- Unlimited documents
- Priority AI processing
- Unlimited "Ask" testing
- API access for programmatic exports
- Email support

### Team ($79/month) — Future
- Everything in Pro
- 5 team members
- Shared projects
- Collaboration features (comments, assignments)
- SSO

## Build Phases

### Phase 1: File Upload & Text Extraction (Week 1)
- [ ] Initialize repo with Node.js/Express backend + React frontend
- [ ] Set up PostgreSQL on Render
- [ ] File upload with Multer (drag and drop UI)
- [ ] Text extraction for: .txt, .md, .csv, .pdf, .docx, .html
- [ ] Document list view with extraction status
- [ ] Raw text preview for each document
- [ ] Basic project creation (no auth yet, single user)

### Phase 2: AI Processing Pipeline (Week 2)
- [ ] Anthropic Claude API integration
- [ ] Processing queue (process documents one at a time to manage API costs)
- [ ] Document classification, chunking, titling, summarizing, tagging
- [ ] Store chunks in database
- [ ] Processing status UI with progress indicators
- [ ] Error handling and retry logic for API failures
- [ ] Basic chunk list view grouped by category

### Phase 3: Knowledge Base Editor (Week 3)
- [ ] Chunk card UI with all fields displayed
- [ ] Inline editing of title, content, summary, category
- [ ] Tag management (add, remove, create new)
- [ ] Chunk operations: split, merge, approve, reject
- [ ] Category and tag filtering sidebar
- [ ] Review progress indicator
- [ ] Bulk actions (approve all in category, delete rejected)
- [ ] Search within chunks

### Phase 4: Export & Testing (Week 4)
- [ ] JSON export (structured for AI consumption)
- [ ] Markdown export (organized by category)
- [ ] CSV export
- [ ] Built-in "Ask" feature — chat interface that queries the knowledge base
- [ ] Basic semantic search using Claude for relevance matching
- [ ] Export preview before download

### Phase 5: Auth, Billing & Polish (Week 5)
- [ ] Google OAuth via Passport.js
- [ ] User accounts and project ownership
- [ ] Stripe integration (checkout, billing portal, webhooks)
- [ ] Free tier limits enforcement
- [ ] Landing page
- [ ] Mobile-responsive design pass
- [ ] Error states and empty states throughout
- [ ] Loading skeletons and optimistic UI updates

### Phase 6: Launch Prep (Week 6)
- [ ] Render deployment configuration (render.yaml)
- [ ] Environment variable management
- [ ] Basic rate limiting and abuse prevention
- [ ] Privacy policy and terms of service pages
- [ ] SEO basics (meta tags, OpenGraph)
- [ ] Test with real data (Mailchimp exports, help docs, etc.)
- [ ] Bug fixes and polish

## Environment Variables

```
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@host:5432/knowledgeforge

# Auth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SESSION_SECRET=random-session-secret

# AI
ANTHROPIC_API_KEY=your-anthropic-api-key

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
STRIPE_PRO_PRICE_ID=your-stripe-price-id

# App
APP_URL=http://localhost:3000
API_URL=http://localhost:3001
```

## Project Structure

```
knowledgeforge/
├── client/                  # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Helper functions
│   │   ├── api/             # API client functions
│   │   └── App.jsx
│   └── package.json
├── server/                  # Express backend
│   ├── routes/              # API route handlers
│   ├── models/              # Database models/queries
│   ├── services/            # Business logic (AI processing, file extraction)
│   │   ├── extractor.js     # Text extraction from various formats
│   │   ├── processor.js     # AI chunking and categorization
│   │   └── exporter.js      # Export generation
│   ├── middleware/           # Auth, error handling, rate limiting
│   ├── config/              # Database, auth, Stripe configuration
│   └── index.js
├── render.yaml              # Render deployment config
├── .env.example
├── PLANNING.md              # This file
├── CHANGELOG.md             # Track what's been built
└── package.json
```

## Design Direction

Clean, modern, professional. Think Stripe's documentation aesthetic:
- White/light gray backgrounds
- Clear typography hierarchy
- Subtle borders and shadows
- Blue accent color for CTAs and active states
- Generous whitespace
- Smooth transitions and loading states

## Key Decisions & Notes

1. **Why PostgreSQL over a vector database?** For the MVP, we don't need vector embeddings. Claude can do relevance matching for the "Ask" feature by reviewing chunk titles and summaries. Vector search can be added in Phase 7+ if needed.

2. **Why process one document at a time?** To keep API costs predictable and avoid rate limits. The queue approach also makes it easy to show progress and handle failures gracefully.

3. **Why not use LangChain or similar?** Keeps the codebase simple and dependencies minimal. Direct API calls to Claude are straightforward for our use case. We can always add a framework later if complexity demands it.

4. **File size limits:** 10MB per file for free tier, 50MB for Pro. PDFs limited to 100 pages. These prevent abuse and keep processing times reasonable.

5. **Data privacy:** User content is sent to Claude's API for processing. This needs to be clearly disclosed in the privacy policy. Consider offering a "delete all data" feature for compliance.

6. **Cost estimation:** At ~$0.003 per 1K input tokens with Sonnet, processing a 5,000-word document costs roughly $0.05. A power user processing 500 documents would cost ~$25 in API fees. Pro pricing at $29/month covers this with margin for most users.
