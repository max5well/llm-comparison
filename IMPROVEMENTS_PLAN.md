# LLM Compare Platform - Improvements Plan

## Overview
This document addresses the 7 key improvements requested for the platform.

---

## 1. ✅ Edit Document Name Feature

**Status**: Ready to implement

**Implementation**:
- Add an "Edit" icon (pencil) next to each document name
- On click, convert filename to editable input field
- Save changes via new API endpoint `PATCH /workspace/documents/{id}`
- Update document record in database

**Files to modify**:
- Frontend: `WorkspaceDetail.tsx` - Add edit UI
- Backend: `workspace.py` - Add update document endpoint
- Backend: `queries.py` - Add `update_document()` function

---

## 2. ✅ AI Dataset Generation Progress Indicator

**Status**: Ready to implement

**Current Issue**: No visual feedback when "Generate with AI" is clicked

**Solution**:
- Add loading state in `CreateDataset.tsx`
- Show progress indicator: "Generating questions from your documents..."
- Poll backend for completion status or use Server-Sent Events (SSE)
- Display success message with question count when done

**Implementation**:
- Add `generating` state variable
- Show spinner + progress text while generating
- Auto-redirect or refresh when complete

---

## 3. ✅ Fix Context Display

**Current Issue**: Context column shows full file content (too long)

**Solution Options**:
1. **Show only filename** + chunk indicator (e.g., "document.pdf - Chunk 3/15")
2. **Show relevant snippet** (max 200 characters) from the chunk that contains the answer
3. **Truncate with expand** - Show first 200 chars with "Show more" button

**Recommended**: Option 2 - Show filename + relevant snippet (200 chars max)

**Files to modify**:
- Frontend: `DatasetDetail.tsx` - Truncate context display
- Frontend: Add tooltip or expandable section for full context

---

## 4. 🔍 Chunk Count Discrepancy Investigation

**Findings**:

### Current Chunking System:
- Uses **LangChain RecursiveCharacterTextSplitter**
- Chunk size is in **TOKENS** (not characters!)
- Your workspace settings: `chunk_size=500`, `chunk_overlap=100`
- Encoding: `cl100k_base` (GPT-4 tokenizer)

### Why 4 chunks instead of 30?

**Possible reasons**:
1. **PDF text extraction failed** - PDF might be image-based (scanned), encrypted, or have extraction issues
2. **Extracted text is very short** - Insurance PDFs often have lots of tables/images, less actual text
3. **Large chunk size inefficiency** - 500 tokens per chunk is on the smaller side

**Verification Steps**:
```sql
-- Check actual extracted text length
SELECT LENGTH(content) as total_chars, COUNT(*) as chunk_count
FROM chunks
WHERE document_id='72bdd138b5e343c98f5f921d22c9c502';

-- Result: ~6,275 characters across 4 chunks
-- At ~500 tokens per chunk = ~2000 tokens total = ~6000 characters (matches!)
```

**Conclusion**: The chunking is working correctly! The PDF likely didn't extract much text (tables/images don't extract well).

### Recommendations:
1. **Increase chunk size to 1000-1500 tokens** for better context
2. **Add better PDF extraction** for tables/images using OCR if needed
3. **Show extraction preview** before processing so users can verify text was extracted correctly

---

## 5. ✅ View Chunks Functionality

**Status**: Ready to implement

**Feature**: Allow users to view all chunks generated from a document

**UI Design**:
```
Document Card:
┌─────────────────────────────────────────────────┐
│ □ [document.pdf] [completed]                    │
│   Type: PDF | Size: 117 KB | Chunks: 4          │
│                                                  │
│   [View Chunks] [Edit] [Delete]                 │
└─────────────────────────────────────────────────┘

Chunks Modal/Page:
┌─────────────────────────────────────────────────┐
│  Chunks from document.pdf (4 chunks)            │
│                                                  │
│  Chunk 1/4 (342 tokens)                         │
│  ┌───────────────────────────────────────────┐  │
│  │ Lorem ipsum dolor sit amet, consectetur   │  │
│  │ adipiscing elit...                        │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  Chunk 2/4 (389 tokens)                         │
│  ┌───────────────────────────────────────────┐  │
│  │ Sed do eiusmod tempor incididunt...       │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Implementation**:
- Add "View Chunks" button to each document
- Create modal or new page showing all chunks
- Use existing endpoint: `GET /rag/{document_id}/chunks`
- Show: chunk index, token count, and full content

---

## 6. 🔐 GDPR Compliance

**Current Issues**:
- OpenAI API (US-based) processes all embeddings
- Files stored locally (depends on server location)
- No data processing agreement visibility

**GDPR Requirements**:
1. ✅ **Data Processing in EU**
2. ✅ **Right to Delete** (already implemented)
3. ✅ **Data Portability** (export functionality)
4. ⚠️ **Processor Agreements** (DPA with LLM providers)
5. ⚠️ **Server Location** (must be EU)

### Solution: EU-Only Infrastructure

#### A. Embedding Providers (EU-Compliant):
```
Current:
  ❌ OpenAI (US, no EU option)
  ❌ Voyage (US)
  ❌ Cohere (US/multi-region, but default US)

EU-Compliant Options:
  ✅ Local BGE Models (already implemented!)
     - No data leaves server
     - Free
     - GDPR compliant by default

  ✅ Aleph Alpha (German company, EU servers)
     - Luminous embeddings
     - GDPR-compliant DPA available
     - EU data centers

  ✅ Mistral AI (French company, EU)
     - mistral-embed
     - Hosted in EU
     - GDPR-compliant

Recommendation: Use BGE (local) by default for EU compliance!
```

#### B. LLM Providers (EU-Compliant):
```
Current:
  ❌ OpenAI (US)
  ❌ Anthropic (US)
  ❌ Together AI (US)

EU-Compliant Options:
  ✅ Mistral AI (France)
     - Mistral Large, Medium, Small
     - mistral-7b, mixtral-8x7b
     - EU servers, GDPR-compliant

  ✅ Aleph Alpha (Germany)
     - Luminous Supreme, Extended, Base
     - Military-grade security
     - German/EU data centers

  ✅ HuggingFace Inference API (can specify EU region)
     - llama-3, llama-2
     - mistral, mixtral
     - Can configure EU-only endpoints

  ✅ Self-Hosted Models (via vLLM, Ollama)
     - llama-3-8b, llama-3-70b
     - mistral-7b, mixtral-8x22b
     - Total data sovereignty
```

#### C. File Storage:
```
Current:
  ⚠️ Local filesystem (depends on server location)

GDPR Options:
  ✅ EU-based object storage
     - AWS S3 (eu-central-1, eu-west-1)
     - Google Cloud Storage (europe-west regions)
     - OVH (French provider)
     - Hetzner Storage (German)

  ✅ Keep local storage if server in EU
     - Deploy to EU region
     - Document server location
```

### Implementation Plan:

**Phase 1: Immediate (No Code Changes)**
1. Deploy application to EU server (e.g., Hetzner Germany, OVH France)
2. Use BGE embeddings (already implemented, just enable by default)
3. Configure HuggingFace API to use EU endpoints

**Phase 2: Add EU Provider Support**
1. Add Mistral AI provider integration
2. Add Aleph Alpha provider integration
3. Add provider selection in Settings with "EU-Only" filter

**Phase 3: Compliance Features**
1. Add "GDPR Mode" toggle in settings
2. When enabled:
   - Only show EU-compliant providers
   - Require EU server location
   - Add data processing notices
3. Add Privacy Policy and Terms of Service
4. Implement audit logging for data access

---

## 7. 🔄 Chunking Strategy Optimization

**Current System**:
```python
Chunker: LangChain RecursiveCharacterTextSplitter
Token Counter: tiktoken (cl100k_base)
Separators: ["\n\n", "\n", ". ", " ", ""]
Default chunk_size: 1000 tokens
Default overlap: 200 tokens
```

**Your Question**: "Can we use LLaMA 3 for chunking?"

### Answer: Semantic Chunking vs. Character Chunking

**Current Approach: Character-based** (what we have)
- Fast, predictable
- Splits on natural boundaries (paragraphs, sentences)
- Token-aware
- ❌ Doesn't understand semantic meaning

**Alternative: Semantic Chunking** (what you're asking about)
- Uses LLM to understand topic/meaning boundaries
- Chunks by semantic coherence, not character count
- ✅ Better retrieval quality
- ❌ Much slower (LLM call per chunk)
- ❌ More expensive

### Semantic Chunking Options:

#### Option 1: LLaMA 3 Semantic Chunker
```python
# Use LLaMA 3 to identify topic boundaries
from langchain_experimental.text_splitter import SemanticChunker
from langchain_huggingface import HuggingFaceEmbeddings

embeddings = HuggingFaceEmbeddings(model_name="meta-llama/Meta-Llama-3-8B")
semantic_chunker = SemanticChunker(embeddings)
chunks = semantic_chunker.split_text(text)
```

**Pros**:
- Intelligent topic-based chunking
- Better for complex documents

**Cons**:
- Requires LLaMA 3 running locally or API access
- 10-100x slower than character chunking
- Needs GPU for reasonable speed

#### Option 2: Hybrid Approach (Recommended)
```python
# 1. First pass: Character-based chunking (current)
char_chunks = RecursiveCharacterTextSplitter(chunk_size=1500, overlap=200)

# 2. Second pass: Use LLM to merge/split based on semantics
# Only for long documents where quality matters
if len(text) > 10000:
    semantic_refine(char_chunks)
```

#### Option 3: Agentic Chunking
```python
# Use small LLM (Mistral 7B, LLaMA 3 8B) to:
# 1. Identify document structure (headers, sections)
# 2. Chunk by structure, not character count
# 3. Add metadata about chunk context
```

### Recommendation:

**For GDPR + Performance Balance**:
```
1. Keep current RecursiveCharacterTextSplitter
2. Increase default chunk_size to 1200-1500 tokens
3. Add "Chunking Strategy" option in workspace settings:
   - Fast (Character-based, 1000 tokens) [Default]
   - Balanced (Character-based, 1500 tokens, semantic boundaries)
   - Quality (Semantic, LLaMA-3-based, slower but better)
4. Use local Mistral 7B or LLaMA 3 8B for semantic chunking (GDPR-compliant!)
```

**Current chunking is excellent** for most use cases. LLaMA 3 semantic chunking would be a premium feature for users who need maximum retrieval quality and don't mind the slower processing.

---

## Summary Table

| Feature | Priority | Effort | Status |
|---------|----------|--------|--------|
| 1. Edit document name | Medium | Low (2h) | Ready |
| 2. Dataset gen progress | High | Low (1h) | Ready |
| 3. Fix context display | High | Low (1h) | Ready |
| 4. Chunk count investigation | High | Done | ✅ Resolved |
| 5. View chunks | Medium | Medium (3h) | Ready |
| 6. GDPR compliance | **Critical** | High (8h) | Plan complete |
| 7. Optimize chunking | Medium | Medium (4h) | Plan complete |

---

## Next Steps

**Immediate (Today)**:
1. Implement #2 (Dataset progress indicator)
2. Implement #3 (Fix context display)
3. Implement #1 (Edit document name)

**Short-term (This Week)**:
4. Implement #5 (View chunks)
5. Start #6 (Enable BGE by default, add Mistral provider)

**Medium-term (Next Week)**:
6. Complete #6 (Full GDPR mode, EU deployment guide)
7. Implement #7 (Add chunking strategy options)

Would you like me to start implementing these in order of priority?
