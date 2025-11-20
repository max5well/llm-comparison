# 🎯 START HERE - Complete Setup

## Current Status

✅ **Frontend is RUNNING**: http://localhost:3000
⏳ **Backend needs setup**: Follow steps below

---

## Quick Backend Setup (3 Steps)

### Step 1: Create `.env` file

```bash
cd /Users/maxwell/Projects/llm-compare
cp backend/.env.example backend/.env
```

Then edit `backend/.env` and add AT MINIMUM:

```env
# Required - At least OpenAI
OPENAI_API_KEY=sk-your-actual-key-here

# Required - Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/llm_compare

# Required - Auth secrets (use any random strings)
API_KEY_SECRET=any_random_string_here_abc123
JWT_SECRET_KEY=another_random_string_here_xyz789
```

### Step 2: Handle Port 8000 Conflict

Something is already using port 8000. Choose one:

**Option A: Kill the existing process**
```bash
kill -9 18571
```

**Option B: Use port 8001 for backend**
Edit `backend/.env` and change:
```env
PORT=8001
```

Then update `frontend/vite.config.ts`:
```ts
proxy: {
  '/api': {
    target: 'http://localhost:8001',  // Changed from 8000
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
}
```

### Step 3: Start Backend

**Easy way** (using the script):
```bash
./setup-backend.sh
```

**Manual way**:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python src/main.py
```

---

## Testing the Full Application

Once backend is running:

1. **Open** http://localhost:3000
2. **Sign up** with your email
3. **Save the API key** shown (won't see it again!)
4. **Create workspace** → Upload documents → Run evaluations!

---

## Verify Everything is Working

### Check Frontend
```bash
curl http://localhost:3000
```
Should return HTML

### Check Backend
```bash
curl http://localhost:8000/health
# or if using port 8001:
curl http://localhost:8001/health
```
Should return:
```json
{"status":"healthy","timestamp":...}
```

### Check API Docs
Open: http://localhost:8000/docs (or :8001/docs)

---

## Full Application Ports

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000 (or 8001)
- **API Docs**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432 (if local)
- **Redis**: localhost:6379 (if local)

---

## Minimal Required Setup for Testing

Don't have PostgreSQL/Redis installed locally? You can:

1. **Use SQLite** (simpler):
   Edit `backend/.env`:
   ```env
   DATABASE_URL=sqlite:///./llm_compare.db
   ```

2. **Skip Redis** (not critical for basic testing):
   The app will still work, just without caching

3. **Use Docker** (easiest - everything included):
   ```bash
   docker-compose up -d
   ```

---

## Troubleshooting

### "Port already in use"
```bash
# Find what's using the port
lsof -i :8000

# Kill it
kill -9 <PID>

# Or use different port (see Step 2)
```

### "Module not found"
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### "Database connection error"
Make sure PostgreSQL is running OR use SQLite (see above)

### "API key not working"
Make sure you added your actual OpenAI API key to `backend/.env`

---

## Next Steps After Setup

1. ✅ Create your first workspace
2. ✅ Upload a test document (PDF/DOCX/TXT)
3. ✅ Process the document
4. ✅ Create evaluation comparing 2+ models
5. ✅ View beautiful results with charts!

---

## Need More Help?

- **Complete guide**: See `GETTING_STARTED.md`
- **Frontend details**: See `FRONTEND_OVERVIEW.md`
- **Backend docs**: See main `README.md`

**Current Status Check:**
- Frontend: ✅ RUNNING
- Backend: ⏳ Follow steps above
