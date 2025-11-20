# Feature Backlog

Features shown in mockups but not yet implemented. These will be handled in future iterations.

## Priority: High (Core Features)

### 1. Social Authentication
**Mockups:** Login Page, Signup Page
- **Description**: OAuth integration for Google and GitHub login
- **Components**: Google OAuth, GitHub OAuth
- **Backend**: Social auth endpoints, token validation
- **Estimate**: 4-6 hours
- **Dependencies**: OAuth credentials, redirect URLs

### 2. Multi-step Workspace Creation Wizard
**Mockups:** Create Workspace Flow
- **Description**: 3-step wizard (Data Source → Chunking Settings → Review & Create)
- **Current Status**: Single-page form exists
- **Need**:
  - Step 1: Data source selection (Upload vs Google Drive)
  - Step 2: Chunking settings (chunk size, overlap, embedding model)
  - Step 3: Review and confirm
  - Progress indicator at top
- **Estimate**: 3-4 hours

### 3. Google Drive Integration
**Mockups:** Create Workspace Flow, Dashboard
- **Description**: Connect Google Drive to import documents
- **Components**: Google Drive API integration, file picker
- **Backend**: Google Drive auth, file sync
- **Estimate**: 6-8 hours
- **Dependencies**: Google Drive API credentials

### 4. Drag & Drop File Upload
**Mockups:** Create Workspace Flow
- **Description**: Drag and drop area for bulk file uploads
- **Current Status**: Basic file upload exists
- **Need**: Drag & drop UI, multiple file selection, progress tracking
- **Estimate**: 2-3 hours

## Priority: Medium (UX Enhancements)

### 5. Dashboard Home Page
**Mockups:** Dashboard Home
- **Description**: Enhanced homepage with welcome banner, quick actions, stats
- **Components**:
  - Welcome banner with CTA buttons
  - Quick action cards (Create Workspace, Connect Drive, View Results)
  - Recent workspaces list with status badges
  - Platform overview stats (model count, embedding count, formats)
  - Recent activity timeline
- **Current Status**: Basic home page exists
- **Estimate**: 4-5 hours

### 6. Platform Statistics
**Mockups:** Dashboard Home
- **Description**: Display platform capabilities
- **Stats to show**:
  - Total LLM models available (1,247+)
  - Embedding models available (156+)
  - Supported file formats (26+)
- **Backend**: Aggregate counts from providers
- **Estimate**: 2 hours

### 7. Recent Activity Timeline
**Mockups:** Dashboard Home
- **Description**: Activity feed showing recent actions
- **Events**: Workspace created, evaluation completed, documents uploaded, settings updated
- **Backend**: Activity logging system
- **Estimate**: 3-4 hours

### 8. Document Status Tracking
**Mockups:** Workspace View
- **Description**: Enhanced document cards with detailed status
- **Status types**: Embedded (green), Processing (blue), Failed (red)
- **Features**:
  - Progress bars for processing
  - Error messages for failed documents
  - Retry button for failed documents
  - File type icons
- **Current Status**: Basic status exists
- **Estimate**: 2-3 hours

### 9. Workspace Summary Cards
**Mockups:** Workspace View
- **Description**: Summary statistics at bottom of workspace
- **Cards**:
  - Total Documents (with trend arrow)
  - Successfully Embedded (with trend)
  - Total Chunks
  - Failed Documents (with trend)
- **Estimate**: 2 hours

### 10. Search and Filter
**Mockups:** Workspace View, Results Page
- **Description**: Search documents, filter by status, search questions
- **Components**: Search bar, filter dropdown, date filters
- **Estimate**: 3-4 hours

## Priority: Low (Nice-to-Have)

### 11. Notification System
**Mockups:** Header bell icon on all pages
- **Description**: In-app notifications for events
- **Events**: Evaluation complete, document processing done, errors
- **Backend**: WebSocket or polling for real-time updates
- **Estimate**: 5-6 hours

### 12. User Profile Dropdown
**Mockups:** Header on all pages
- **Description**: User menu with profile, settings, logout
- **Menu items**: Profile, Account Settings, API Keys, Logout
- **Estimate**: 2 hours

### 13. Export Results
**Mockups:** Results Page
- **Description**: Export evaluation results to JSONL format
- **Format**: One JSON object per line with question, answer, metrics
- **Estimate**: 2 hours

### 14. Share Results
**Mockups:** Results Page
- **Description**: Generate shareable link for evaluation results
- **Features**: Public/private toggle, expiration time
- **Backend**: Share token generation, public results endpoint
- **Estimate**: 3-4 hours

### 15. Per-Question Analysis Expansion
**Mockups:** Results Page (bottom section)
- **Description**: Expandable cards showing detailed answer comparison per question
- **Shows**: Question, expected answer, model answers with scores
- **Estimate**: 3 hours

### 16. Leaderboard Sorting
**Mockups:** Results Page
- **Description**: Sort leaderboard by different metrics
- **Sort options**: Overall, Accuracy, Latency, Cost
- **Estimate**: 1-2 hours

### 17. Chart Interactivity
**Mockups:** Results Page
- **Description**: Interactive charts with zoom, pan, hover tooltips
- **Library**: Plotly.js or Chart.js
- **Estimate**: 2-3 hours

### 18. Workspace Settings Page
**Mockups:** Workspace View header "Settings" button
- **Description**: Edit workspace configuration
- **Settings**: Name, description, chunk size, overlap, embedding model
- **Estimate**: 2-3 hours

### 19. Save Evaluation as Draft
**Mockups:** Evaluation Setup Page
- **Description**: Save evaluation configuration without running
- **Use case**: Prepare evaluation, run later
- **Estimate**: 1-2 hours

### 20. Estimated Cost & Time
**Mockups:** Evaluation Setup Page sidebar
- **Description**: Calculate estimated cost and time before running
- **Calculation**: Questions × Models × Avg cost/latency
- **Estimate**: 2 hours

## Priority: Future (Advanced Features)

### 21. Real-time Progress Updates
**Description**: WebSocket connection for live evaluation progress
- **Shows**: Current question being evaluated, % complete
- **Estimate**: 4-5 hours

### 22. Batch Operations
**Description**: Bulk document upload, delete multiple documents
- **Current Status**: Multi-select delete exists for documents
- **Need**: Multi-select for other operations
- **Estimate**: 2-3 hours

### 23. Workspace Templates
**Description**: Pre-configured workspace templates for common use cases
- **Templates**: Customer Support, Documentation, Code Analysis
- **Estimate**: 3-4 hours

### 24. Model Recommendations
**Description**: Suggest best models based on workspace type and requirements
- **Backend**: Recommendation engine
- **Estimate**: 4-6 hours

### 25. Cost Tracking Dashboard
**Description**: Track API costs over time, set budgets
- **Charts**: Cost per day, per workspace, per model
- **Estimate**: 4-5 hours

---

## Currently Implementing ✅

These features are being implemented now:

1. ✅ **6 Evaluation Metrics** - Accuracy, Faithfulness, Reasoning, Context Utilization, Latency, Cost
2. ✅ **LLM Judge Service** - Backend service for metric evaluation
3. ✅ **Results Page with Charts** - Comprehensive results dashboard
4. ✅ **Model Leaderboard** - Ranked comparison table
5. ✅ **Judge Model Selection** - Choose judge model in evaluation setup

---

## Implementation Priority Order

**Phase 1** (Current Sprint):
- Evaluation metrics (in progress)
- Results page redesign (in progress)
- Judge model selection (in progress)

**Phase 2** (Next Sprint):
- Dashboard home page enhancements
- Document status tracking improvements
- Workspace summary cards

**Phase 3** (Future Sprint):
- Multi-step workspace wizard
- Search and filter
- Export/share results

**Phase 4** (Long-term):
- Social authentication
- Google Drive integration
- Notification system
- Real-time updates

---

**Last Updated**: 2024-12-20
**Total Backlog Items**: 25 features
**Estimated Total Time**: 70-95 hours
