# Frontend Redesign & Evaluation Metrics Implementation Plan

## 1. Repository Status ✅

**Completed:**
- ✅ Git repository initialized and pushed to GitHub
- ✅ All current files committed (75 files, 17,233 insertions)
- ✅ Remote: `git@github.com:max5well/llm-comparison.git`
- ✅ Commit: `0868825` - "feat: Complete LLM comparison platform with frontend, improvements, and mockups"

---

## 2. Mockup Analysis Summary

### Pages Reviewed:
1. **Login Page** - Modern auth with social login (Google, GitHub)
2. **Signup Page** - Registration with company field (optional)
3. **Dashboard Home** - Welcome banner, quick actions, recent workspaces, platform stats
4. **Create Workspace Flow** - 3-step wizard with progress indicator
5. **Workspace View** - Document management with tabs (Documents, Datasets, Evaluations)
6. **Evaluation Setup** - Configuration with dataset/model selection
7. **Results Page** - Comprehensive results dashboard with metrics, charts, leaderboard

### Key Design Elements:
- **Color Scheme**: Blue (#3B82F6) primary, purple/green accents
- **Typography**: Inter font family
- **Components**: Rounded corners (xl, 2xl), soft shadows, subtle borders
- **Icons**: Font Awesome 6.4.0
- **Status Badges**: Color-coded pills (green=success, blue=processing, red=error)
- **Progress Indicators**: Circular steps, progress bars
- **Cards**: White background, gray-200 borders, hover effects

---

## 3. Evaluation Metrics Requirements

From the user's metrics table, we need to implement **6 metrics**:

### LLM Judge Metrics (4):
| Metric | Type | Description |
|--------|------|-------------|
| **Accuracy** | LLM Judge | Semantic correctness of answer vs expected answer |
| **Faithfulness** | LLM Judge | Answer based only on retrieved context (no hallucination) |
| **Reasoning** | LLM Judge | Quality of reasoning, especially for multi-hop questions |
| **Context Utilization** | LLM Judge | Answer uses information from retrieved chunks |

### Automated Metrics (2):
| Metric | Type | Description |
|--------|------|-------------|
| **Latency** | Automated | Time from query to response (from logs) |
| **Cost** | Automated | Token usage × provider pricing |

### Implementation Notes:
- **Automated metrics**: Calculated during evaluation runtime
- **LLM Judge metrics**: Require judge model to evaluate each answer
- **Human Judge**: Optional (future feature)

---

## 4. Backend Implementation Plan

### 4.1 Database Schema Changes

**Add new tables:**

```python
# backend/src/db/models.py

class EvaluationMetrics(Base):
    """Store detailed metrics for each evaluation result."""
    __tablename__ = "evaluation_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evaluation_result_id = Column(UUID(as_uuid=True), ForeignKey("evaluation_results.id"), nullable=False)

    # LLM Judge Metrics (0-1 scores)
    accuracy_score = Column(Float, nullable=True)
    faithfulness_score = Column(Float, nullable=True)
    reasoning_score = Column(Float, nullable=True)
    context_utilization_score = Column(Float, nullable=True)

    # Automated Metrics
    latency_ms = Column(Integer, nullable=False)  # milliseconds
    cost = Column(Float, nullable=False)  # dollars

    # LLM Judge Explanations
    accuracy_explanation = Column(Text, nullable=True)
    faithfulness_explanation = Column(Text, nullable=True)
    reasoning_explanation = Column(Text, nullable=True)
    context_utilization_explanation = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

class EvaluationSummary(Base):
    """Store aggregate metrics for entire evaluation."""
    __tablename__ = "evaluation_summaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evaluation_id = Column(UUID(as_uuid=True), ForeignKey("evaluations.id"), nullable=False, unique=True)

    # Average LLM Judge Metrics
    avg_accuracy = Column(Float, nullable=True)
    avg_faithfulness = Column(Float, nullable=True)
    avg_reasoning = Column(Float, nullable=True)
    avg_context_utilization = Column(Float, nullable=True)

    # Average Automated Metrics
    avg_latency_ms = Column(Integer, nullable=False)
    avg_cost = Column(Float, nullable=False)
    total_cost = Column(Float, nullable=False)

    # Overall Score (weighted combination)
    overall_score = Column(Float, nullable=True)

    # Counts
    total_questions = Column(Integer, nullable=False)
    successful_evaluations = Column(Integer, nullable=False)
    failed_evaluations = Column(Integer, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
```

**Migration file:**
```sql
-- backend/migrations/003_add_evaluation_metrics.sql
CREATE TABLE evaluation_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_result_id UUID NOT NULL REFERENCES evaluation_results(id) ON DELETE CASCADE,

    -- LLM Judge Metrics
    accuracy_score FLOAT,
    faithfulness_score FLOAT,
    reasoning_score FLOAT,
    context_utilization_score FLOAT,

    -- Automated Metrics
    latency_ms INTEGER NOT NULL,
    cost FLOAT NOT NULL,

    -- Explanations
    accuracy_explanation TEXT,
    faithfulness_explanation TEXT,
    reasoning_explanation TEXT,
    context_utilization_explanation TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE evaluation_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE UNIQUE,

    -- Average metrics
    avg_accuracy FLOAT,
    avg_faithfulness FLOAT,
    avg_reasoning FLOAT,
    avg_context_utilization FLOAT,
    avg_latency_ms INTEGER NOT NULL,
    avg_cost FLOAT NOT NULL,
    total_cost FLOAT NOT NULL,
    overall_score FLOAT,

    -- Counts
    total_questions INTEGER NOT NULL,
    successful_evaluations INTEGER NOT NULL,
    failed_evaluations INTEGER NOT NULL,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_metrics_result_id ON evaluation_metrics(evaluation_result_id);
CREATE INDEX idx_summary_evaluation_id ON evaluation_summaries(evaluation_id);
```

### 4.2 LLM Judge Service

**New file: `backend/src/core/llm_judge.py`**

```python
"""LLM Judge service for evaluating answer quality."""

from typing import Dict, Optional
from src.core.llm_providers import get_llm_provider
import json
import time

class LLMJudge:
    """Evaluates answer quality using an LLM judge model."""

    def __init__(self, judge_model: str, judge_provider: str):
        self.provider = get_llm_provider(judge_provider)
        self.model = judge_model

    async def evaluate_accuracy(
        self,
        question: str,
        expected_answer: str,
        generated_answer: str
    ) -> Dict[str, any]:
        """Evaluate semantic correctness of answer."""
        prompt = f"""You are an expert evaluator. Score the semantic accuracy of the generated answer compared to the expected answer.

Question: {question}

Expected Answer: {expected_answer}

Generated Answer: {generated_answer}

Rate the accuracy from 0.0 to 1.0 where:
- 1.0 = Perfectly accurate, all key points covered
- 0.7-0.9 = Mostly accurate with minor omissions
- 0.4-0.6 = Partially accurate, missing key information
- 0.0-0.3 = Largely inaccurate or wrong

Respond in JSON format:
{{
  "score": 0.0-1.0,
  "explanation": "Brief explanation of the score"
}}
"""

        response = await self.provider.generate(
            model=self.model,
            prompt=prompt,
            temperature=0.0,
            max_tokens=200
        )

        result = json.loads(response["content"])
        return {
            "score": result["score"],
            "explanation": result["explanation"]
        }

    async def evaluate_faithfulness(
        self,
        question: str,
        context: str,
        generated_answer: str
    ) -> Dict[str, any]:
        """Evaluate if answer is faithful to the retrieved context (no hallucination)."""
        prompt = f"""You are an expert evaluator. Score how faithfully the answer is grounded in the provided context.

Question: {question}

Retrieved Context: {context}

Generated Answer: {generated_answer}

Rate the faithfulness from 0.0 to 1.0 where:
- 1.0 = All claims are directly supported by the context
- 0.7-0.9 = Most claims supported, minor unsupported details
- 0.4-0.6 = Some claims not grounded in context
- 0.0-0.3 = Significant hallucination, many unsupported claims

Respond in JSON format:
{{
  "score": 0.0-1.0,
  "explanation": "Brief explanation highlighting any hallucinations"
}}
"""

        response = await self.provider.generate(
            model=self.model,
            prompt=prompt,
            temperature=0.0,
            max_tokens=200
        )

        result = json.loads(response["content"])
        return {
            "score": result["score"],
            "explanation": result["explanation"]
        }

    async def evaluate_reasoning(
        self,
        question: str,
        generated_answer: str
    ) -> Dict[str, any]:
        """Evaluate quality of reasoning, especially for multi-hop questions."""
        prompt = f"""You are an expert evaluator. Score the quality of reasoning in the answer.

Question: {question}

Generated Answer: {generated_answer}

Rate the reasoning quality from 0.0 to 1.0 where:
- 1.0 = Excellent logical flow, clear step-by-step reasoning
- 0.7-0.9 = Good reasoning with minor logical gaps
- 0.4-0.6 = Weak reasoning, missing steps or unclear logic
- 0.0-0.3 = Poor or no clear reasoning

Respond in JSON format:
{{
  "score": 0.0-1.0,
  "explanation": "Brief explanation of reasoning quality"
}}
"""

        response = await self.provider.generate(
            model=self.model,
            prompt=prompt,
            temperature=0.0,
            max_tokens=200
        )

        result = json.loads(response["content"])
        return {
            "score": result["score"],
            "explanation": result["explanation"]
        }

    async def evaluate_context_utilization(
        self,
        question: str,
        context: str,
        generated_answer: str
    ) -> Dict[str, any]:
        """Evaluate how well the answer uses the retrieved context."""
        prompt = f"""You are an expert evaluator. Score how effectively the answer utilizes the retrieved context.

Question: {question}

Retrieved Context: {context}

Generated Answer: {generated_answer}

Rate the context utilization from 0.0 to 1.0 where:
- 1.0 = Excellent use of context, all relevant information incorporated
- 0.7-0.9 = Good use, most relevant context utilized
- 0.4-0.6 = Partial use, missed some relevant context
- 0.0-0.3 = Poor use, ignored most relevant context

Respond in JSON format:
{{
  "score": 0.0-1.0,
  "explanation": "Brief explanation of context utilization"
}}
"""

        response = await self.provider.generate(
            model=self.model,
            prompt=prompt,
            temperature=0.0,
            max_tokens=200
        )

        result = json.loads(response["content"])
        return {
            "score": result["score"],
            "explanation": result["explanation"]
        }

    async def evaluate_all_metrics(
        self,
        question: str,
        expected_answer: Optional[str],
        context: str,
        generated_answer: str
    ) -> Dict[str, any]:
        """Evaluate all LLM judge metrics at once."""
        metrics = {}

        # Accuracy (only if expected answer provided)
        if expected_answer:
            metrics["accuracy"] = await self.evaluate_accuracy(
                question, expected_answer, generated_answer
            )

        # Faithfulness
        metrics["faithfulness"] = await self.evaluate_faithfulness(
            question, context, generated_answer
        )

        # Reasoning
        metrics["reasoning"] = await self.evaluate_reasoning(
            question, generated_answer
        )

        # Context Utilization
        metrics["context_utilization"] = await self.evaluate_context_utilization(
            question, context, generated_answer
        )

        return metrics
```

### 4.3 Enhanced Evaluation Endpoint

**Update: `backend/src/api/evaluation.py`**

Add judge model parameter and metrics calculation:

```python
@router.post("/create")
async def create_evaluation_endpoint(
    data: CreateEvaluationRequest,
    db: Session = Depends(get_db)
):
    """Create and run evaluation with metrics calculation."""
    from src.core.llm_judge import LLMJudge
    from src.db.queries import create_evaluation, get_test_dataset
    import time

    # Create evaluation record
    evaluation = create_evaluation(
        db,
        workspace_id=UUID(data.workspace_id),
        dataset_id=UUID(data.dataset_id),
        models=data.models,
        judge_model=data.judge_model,  # NEW
        judge_provider=data.judge_provider,  # NEW
        settings=data.settings
    )

    # Initialize LLM judge
    judge = LLMJudge(data.judge_model, data.judge_provider)

    # Get dataset questions
    dataset = get_test_dataset(db, UUID(data.dataset_id))
    questions = dataset.questions

    all_metrics = []

    # Run evaluation for each model
    for model_config in data.models:
        for question in questions:
            start_time = time.time()

            # Query RAG system
            rag_result = await rag_query(
                workspace_id=data.workspace_id,
                query=question.question,
                top_k=data.settings.get("top_k", 5)
            )

            # Generate answer with the model
            provider = get_llm_provider(model_config["provider"])
            response = await provider.generate(
                model=model_config["model"],
                prompt=f"Context: {rag_result['context']}\n\nQuestion: {question.question}\n\nAnswer:",
                temperature=data.settings.get("temperature", 0.7),
                max_tokens=data.settings.get("max_tokens", 512)
            )

            end_time = time.time()
            latency_ms = int((end_time - start_time) * 1000)

            # Calculate cost
            cost = calculate_cost(
                model_config["provider"],
                model_config["model"],
                response["usage"]["prompt_tokens"],
                response["usage"]["completion_tokens"]
            )

            # Get LLM judge metrics
            judge_metrics = await judge.evaluate_all_metrics(
                question=question.question,
                expected_answer=question.expected_answer,
                context=rag_result['context'],
                generated_answer=response["content"]
            )

            # Store result with metrics
            result = create_evaluation_result(
                db,
                evaluation_id=evaluation.id,
                question_id=question.id,
                model=model_config["model"],
                provider=model_config["provider"],
                answer=response["content"],
                context=rag_result['context'],
                accuracy_score=judge_metrics.get("accuracy", {}).get("score"),
                faithfulness_score=judge_metrics["faithfulness"]["score"],
                reasoning_score=judge_metrics["reasoning"]["score"],
                context_utilization_score=judge_metrics["context_utilization"]["score"],
                latency_ms=latency_ms,
                cost=cost,
                accuracy_explanation=judge_metrics.get("accuracy", {}).get("explanation"),
                faithfulness_explanation=judge_metrics["faithfulness"]["explanation"],
                reasoning_explanation=judge_metrics["reasoning"]["explanation"],
                context_utilization_explanation=judge_metrics["context_utilization"]["explanation"]
            )

            all_metrics.append(result)

    # Calculate summary statistics
    create_evaluation_summary(db, evaluation.id, all_metrics)

    return evaluation
```

### 4.4 New Results Endpoint

**Add to `backend/src/api/results.py`:**

```python
@router.get("/{evaluation_id}/metrics")
async def get_evaluation_metrics(
    evaluation_id: str,
    db: Session = Depends(get_db)
):
    """Get detailed metrics for evaluation results."""
    from src.db.queries import get_evaluation_results_with_metrics

    results = get_evaluation_results_with_metrics(db, UUID(evaluation_id))

    # Group by model
    metrics_by_model = {}
    for result in results:
        model_key = f"{result.provider}/{result.model}"
        if model_key not in metrics_by_model:
            metrics_by_model[model_key] = []

        metrics_by_model[model_key].append({
            "question_id": str(result.question_id),
            "accuracy": result.accuracy_score,
            "faithfulness": result.faithfulness_score,
            "reasoning": result.reasoning_score,
            "context_utilization": result.context_utilization_score,
            "latency_ms": result.latency_ms,
            "cost": result.cost
        })

    return {
        "evaluation_id": evaluation_id,
        "metrics_by_model": metrics_by_model
    }
```

---

## 5. Frontend Implementation Plan

### 5.1 Pages to Update/Create

#### Priority 1 (Core Functionality):
1. **Results Page** (`Results.tsx`) - Complete redesign with 6 metrics
2. **CreateEvaluation Page** (`CreateEvaluation.tsx`) - Add judge model selection
3. **WorkspaceDetail Page** (`WorkspaceDetail.tsx`) - Update to mockup design

#### Priority 2 (Enhanced UX):
4. **Dashboard/Home Page** (`Home.tsx`) - Add welcome banner, quick actions, stats
5. **Login Page** (`Login.tsx`) - Modern design with social auth placeholders
6. **CreateWorkspace Page** (`CreateWorkspace.tsx`) - 3-step wizard

### 5.2 Components to Create

**New components:**
```
frontend/src/components/
├── MetricCard.tsx              # Reusable metric display card
├── MetricChart.tsx             # Chart component for metrics (Plotly.js)
├── ModelLeaderboard.tsx        # Sortable leaderboard table
├── QuestionAnalysis.tsx        # Per-question detail expansion
├── ProgressWizard.tsx          # Multi-step wizard progress indicator
├── StatusBadge.tsx             # Color-coded status pills
├── DocumentCard.tsx            # Document display with status
└── QuickActionCard.tsx         # Dashboard quick action cards
```

### 5.3 Results Page Implementation

**Complete redesign with 6 metrics:**

```typescript
// frontend/src/pages/Results.tsx

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import MetricCard from '../components/MetricCard';
import MetricChart from '../components/MetricChart';
import ModelLeaderboard from '../components/ModelLeaderboard';

export default function Results() {
  const { evaluationId } = useParams();
  const [summary, setSummary] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [evaluationId]);

  const loadResults = async () => {
    try {
      const [summaryData, metricsData] = await Promise.all([
        api.getEvaluationSummary(evaluationId),
        api.getEvaluationMetrics(evaluationId)
      ]);
      setSummary(summaryData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load results:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Evaluation Results</h1>
              <p className="text-gray-600 mt-2">
                Comparing {Object.keys(metrics.metrics_by_model).length} models
                across {summary.total_questions} questions
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                <i className="fa-solid fa-download mr-2"></i>
                Export JSONL
              </button>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                <i className="fa-solid fa-share-nodes mr-2"></i>
                Share Results
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Overview - 5 cards */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-5 gap-4">
          <MetricCard
            title="Accuracy"
            value={`${(summary.avg_accuracy * 100).toFixed(1)}%`}
            icon="fa-bullseye"
            color="blue"
            change="+5.2%"
            changeType="positive"
          />
          <MetricCard
            title="Faithfulness"
            value={`${(summary.avg_faithfulness * 100).toFixed(1)}%`}
            icon="fa-shield-halved"
            color="purple"
            change="+3.1%"
            changeType="positive"
          />
          <MetricCard
            title="Avg Latency"
            value={`${(summary.avg_latency_ms / 1000).toFixed(1)}s`}
            icon="fa-clock"
            color="orange"
            change="+0.3s"
            changeType="negative"
          />
          <MetricCard
            title="Avg Cost"
            value={`$${summary.avg_cost.toFixed(3)}`}
            icon="fa-dollar-sign"
            color="green"
            change="-12%"
            changeType="positive"
          />
          <MetricCard
            title="Total Queries"
            value={summary.total_questions * Object.keys(metrics.metrics_by_model).length}
            icon="fa-list-check"
            color="indigo"
            subtitle={`${summary.total_questions} questions × ${Object.keys(metrics.metrics_by_model).length} models`}
          />
        </div>
      </section>

      {/* Comparison Charts - 6 charts in 2x3 grid */}
      <section className="max-w-7xl mx-auto px-6 pb-8">
        <div className="grid grid-cols-2 gap-6">
          <MetricChart
            title="Accuracy Comparison"
            data={prepareChartData(metrics, 'accuracy')}
            type="bar"
          />
          <MetricChart
            title="Faithfulness Score"
            data={prepareChartData(metrics, 'faithfulness')}
            type="bar"
          />
          <MetricChart
            title="Reasoning Score"
            data={prepareChartData(metrics, 'reasoning')}
            type="bar"
          />
          <MetricChart
            title="Context Utilization"
            data={prepareChartData(metrics, 'context_utilization')}
            type="bar"
          />
          <MetricChart
            title="Average Latency"
            data={prepareChartData(metrics, 'latency_ms')}
            type="bar"
          />
          <MetricChart
            title="Cost per Query"
            data={prepareChartData(metrics, 'cost')}
            type="bar"
          />
        </div>
      </section>

      {/* Model Leaderboard */}
      <section className="max-w-7xl mx-auto px-6 pb-8">
        <ModelLeaderboard
          models={calculateLeaderboard(metrics)}
          onSort={handleSort}
        />
      </section>
    </div>
  );
}
```

---

## 6. Implementation Steps

### Step 1: Backend Foundation (Database + Judge Service)
1. Create migration `003_add_evaluation_metrics.sql`
2. Update `models.py` with new tables
3. Create `llm_judge.py` service
4. Add database queries for metrics
5. Test LLM judge with sample data

### Step 2: Backend API Updates
1. Update `CreateEvaluationRequest` to include `judge_model` and `judge_provider`
2. Modify evaluation endpoint to calculate and store metrics
3. Add `/results/{id}/metrics` endpoint
4. Update `/results/{id}/summary` to include all 6 metrics
5. Test with Postman/curl

### Step 3: Frontend Components
1. Create `MetricCard.tsx`
2. Create `MetricChart.tsx` (with Plotly.js)
3. Create `ModelLeaderboard.tsx`
4. Create `StatusBadge.tsx`
5. Create `DocumentCard.tsx`

### Step 4: Frontend Pages - Results First
1. Redesign `Results.tsx` with 6 metrics
2. Add charts section
3. Add leaderboard table
4. Add per-question analysis
5. Test with real evaluation data

### Step 5: Frontend Pages - Evaluation Setup
1. Update `CreateEvaluation.tsx`
2. Add judge model selection dropdown
3. Update summary sidebar with estimated cost
4. Test evaluation creation flow

### Step 6: Frontend Pages - Enhanced UX
1. Update `WorkspaceDetail.tsx` with mockup design
2. Update `Home.tsx` with dashboard elements
3. Create wizard for `CreateWorkspace.tsx`
4. Polish Login/Signup pages

### Step 7: Integration & Testing
1. End-to-end test: Create workspace → Upload docs → Create dataset → Run evaluation → View results
2. Test all 6 metrics calculation
3. Performance optimization (parallel judge calls)
4. Error handling and edge cases

---

## 7. Timeline Estimate

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Phase 1** | Backend database + LLM judge | 3-4 hours |
| **Phase 2** | Backend API updates | 2-3 hours |
| **Phase 3** | Frontend components | 2-3 hours |
| **Phase 4** | Results page redesign | 3-4 hours |
| **Phase 5** | Evaluation setup updates | 2-3 hours |
| **Phase 6** | Other pages polish | 4-5 hours |
| **Phase 7** | Integration & testing | 2-3 hours |
| **Total** | | **18-25 hours** |

---

## 8. Technical Considerations

### Performance:
- **Parallel Judge Calls**: Run all 4 LLM judge metrics in parallel using `asyncio.gather()`
- **Caching**: Cache judge results to avoid re-evaluation
- **Batch Processing**: Process multiple questions in batches

### Cost Optimization:
- **Judge Model Selection**: Allow cheaper models (e.g., GPT-3.5) for judge to reduce cost
- **Selective Metrics**: Allow users to choose which metrics to calculate
- **Sampling**: Option to evaluate on a subset of questions for quick estimates

### Error Handling:
- **Judge Failures**: Gracefully handle when judge model returns invalid JSON
- **Partial Results**: Save partial results if evaluation crashes mid-way
- **Retry Logic**: Retry failed judge calls with exponential backoff

### Security:
- **Input Validation**: Sanitize all inputs to judge prompts
- **Rate Limiting**: Limit concurrent judge API calls to avoid rate limits
- **Cost Limits**: Set maximum cost per evaluation to prevent accidental spending

---

## 9. Next Steps

**Immediate actions:**
1. ✅ Create this implementation plan document
2. 🔄 Get user approval on approach
3. 📝 Start with Step 1: Database migrations and LLM judge service
4. 🧪 Build and test incrementally

**Questions for user:**
- Which judge model should be the default? (GPT-4, Claude 3 Opus, etc.)
- Should we make judge metrics optional or always run them?
- Any specific Plotly.js chart styles or preferences?
- Should we implement chart interactivity (zoom, pan, hover)?

---

**Ready to proceed with implementation!** 🚀
