# BhuVerify AI

## Project overview
BhuVerify AI is a prototype for intelligent land record digitization and validation. The system is designed to help government and land-office teams upload scanned land records, extract structured fields, validate mismatches, and route them for human verification.

## Architecture

Next.js/React
        ↓
Vercel
        ↓
Supabase
(Database/Auth/Storage)
        ↕
FastAPI
        ↓
AI/OCR/Validation

## Folder structure

```text
/
├── frontend/                # Next.js + React application
├── backend/                 # FastAPI backend
├── supabase/                # Database schema and storage docs
├── sample-data/             # Sample prototype data
├── .gitignore               # Ignore local secrets and build artifacts
├── README.md                # Project overview and setup guidance
└── .env.example             # Root-level template if needed
```

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

The frontend should be configured for deployment on Vercel and should use the public Supabase credentials along with the backend URL.

## Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Supabase setup

1. Create a Supabase project.
2. Copy the project URL and anonymous key into the frontend environment variables.
3. Keep the service role key only in the backend environment file.
4. Create a storage bucket named `land-records`.
5. Set bucket access to private by default.
6. Add the required schema using the SQL migration files under `supabase/migrations`.

## Environment variables

Frontend `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Backend `.env`:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

## How to run frontend

From the project root:

```bash
cd frontend
npm install
npm run dev
```

## How to run backend

From the project root:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Current implemented features

- Next.js frontend scaffold with a professional dashboard shell
- FastAPI backend foundation with health endpoint
- CORS configured for local frontend-backend development
- Supabase-ready environment variables and client setup
- Initial database schema for land records and verification workflow
- README documentation and starter project structure

## Features planned for later stages

- OCR and document extraction
- Confidence scoring and validation rules
- Image/PDF preprocessing
- GIS visualization for parcel boundaries
- Verification workflows and audit trails
- Authentication and role-based access
- Production deployment and Supabase RLS

## Notes

This is a working foundation for the prototype. It is intentionally kept lightweight and architecture-focused so the next stage can add document intelligence without reworking the base system.
