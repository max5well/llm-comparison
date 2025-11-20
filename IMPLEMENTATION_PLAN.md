# Implementation Plan for Requested Features

## Summary of Changes Needed

### 1. Document Processing Improvements ✅ IN PROGRESS
- [x] Add error_message to API response
- [x] Improve PDF extraction error handling
- [ ] Update frontend Document type to include error_message
- [ ] Display error messages in UI
- [ ] Add "Process All Pending" button

### 2. Dataset Creation Enhancements
- [ ] Add "reference/context" column to question table
- [ ] Fix AI generation to use actual document content (not placeholders)
- [ ] Add smart suggestion for number of questions based on chunks
- [ ] Show estimated number of chunks in workspace

### 3. Workspace Creation Improvements
- [ ] Calculate and show estimated processing time
- [ ] Show time estimate based on: file count × average file size × embedding speed

### 4. Homepage Redesign
- [ ] Replace provider count with actual provider logos (OpenAI, Anthropic, etc.)
- [ ] Replace file type count with file type icons
- [ ] Show embedding model names instead of just "embedding options"
- [ ] Modern SaaS styling with cards/grids

## Detailed Implementation

### Fix 1: Show Error Messages in Documents

**Frontend Type Update** (`frontend/src/types/index.ts`):
```typescript
export interface Document {
  id: string;
  workspace_id: string;
  filename: string;
  file_type: string;
  file_size_bytes?: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  total_chunks: number;
  error_message?: string;  // ADD THIS
  created_at: string;
}
```

**Frontend Display** (`frontend/src/pages/WorkspaceDetail.tsx`):
- Show error message when status is "failed"
- Add tooltip/expandable section for error details

### Fix 2: Bulk Process Button

Add button to process all pending documents at once with progress indicator.

### Fix 3: Dataset Reference Column

Add context/reference field to questions for better evaluation tracking.

### Fix 4: Smart Question Suggestions

Calculate based on:
- Number of chunks = (total_text_length / chunk_size)
- Suggested questions = min(chunks / 2, 50)
- Show: "Based on X chunks, we suggest Y-Z questions"

### Fix 5: Time Estimation

Formula:
- Embedding time = chunks × 0.5 seconds (average)
- Display: "Estimated processing time: ~2-3 minutes"

### Fix 6: Homepage Redesign

Replace numbers with visual elements:
- Provider logos in a grid
- File type icons
- Embedding model cards
