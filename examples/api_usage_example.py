"""
Example script demonstrating how to use the LLM Compare API.

This script shows a complete workflow:
1. Create a user
2. Create a workspace
3. Upload a document
4. Process the document
5. Create a test dataset
6. Run an evaluation
7. Get results
"""

import requests
import time
import json

# API base URL
BASE_URL = "http://localhost:8000"


def create_user(email: str):
    """Create a new user account."""
    response = requests.post(
        f"{BASE_URL}/auth/signup",
        json={"email": email}
    )
    response.raise_for_status()
    data = response.json()
    print(f"✓ User created: {data['user_id']}")
    print(f"  API Key: {data['api_key']}")
    return data['user_id'], data['api_key']


def create_workspace(user_id: str, name: str):
    """Create a new workspace."""
    response = requests.post(
        f"{BASE_URL}/workspace/create",
        params={"user_id": user_id},
        json={
            "name": name,
            "description": "Example workspace for testing",
            "embedding_model": "text-embedding-3-small",
            "embedding_provider": "openai",
            "chunk_size": 1000,
            "chunk_overlap": 200
        }
    )
    response.raise_for_status()
    data = response.json()
    print(f"✓ Workspace created: {data['id']}")
    return data['id']


def upload_document(workspace_id: str, file_path: str):
    """Upload a document to workspace."""
    with open(file_path, 'rb') as f:
        files = {'file': (file_path, f)}
        response = requests.post(
            f"{BASE_URL}/workspace/{workspace_id}/upload",
            files=files
        )
    response.raise_for_status()
    data = response.json()
    print(f"✓ Document uploaded: {data['id']}")
    return data['id']


def process_document(document_id: str):
    """Process uploaded document."""
    response = requests.post(
        f"{BASE_URL}/rag/{document_id}/process"
    )
    response.raise_for_status()
    print(f"✓ Document processing started")


def create_test_dataset(workspace_id: str, name: str):
    """Create a test dataset."""
    response = requests.post(
        f"{BASE_URL}/evaluation/dataset/create",
        json={
            "workspace_id": workspace_id,
            "name": name,
            "source": "synthetic"
        }
    )
    response.raise_for_status()
    data = response.json()
    print(f"✓ Test dataset created: {data['id']}")
    return data['id']


def upload_questions(dataset_id: str, questions: list):
    """Upload test questions to dataset."""
    # Create JSONL content
    jsonl_content = "\n".join([json.dumps(q) for q in questions])

    # Upload as file
    files = {'file': ('questions.jsonl', jsonl_content.encode())}
    response = requests.post(
        f"{BASE_URL}/evaluation/dataset/{dataset_id}/upload-jsonl",
        files=files
    )
    response.raise_for_status()
    print(f"✓ Questions uploaded: {response.json()['questions_added']}")


def create_evaluation(workspace_id: str, dataset_id: str, name: str):
    """Create and run an evaluation."""
    response = requests.post(
        f"{BASE_URL}/evaluation/create",
        json={
            "workspace_id": workspace_id,
            "dataset_id": dataset_id,
            "name": name,
            "models_to_test": [
                {"model": "gpt-4o-mini", "provider": "openai"},
                {"model": "claude-3-5-haiku-20241022", "provider": "anthropic"}
            ],
            "judge_model": "gpt-4o-mini",
            "judge_provider": "openai"
        }
    )
    response.raise_for_status()
    data = response.json()
    print(f"✓ Evaluation created: {data['id']}")
    return data['id']


def wait_for_evaluation(evaluation_id: str, timeout: int = 300):
    """Wait for evaluation to complete."""
    print("⏳ Waiting for evaluation to complete...")
    start_time = time.time()

    while time.time() - start_time < timeout:
        response = requests.get(f"{BASE_URL}/evaluation/{evaluation_id}")
        response.raise_for_status()
        data = response.json()

        status = data['status']
        progress = data['progress']

        if status == 'completed':
            print(f"✓ Evaluation completed!")
            return True
        elif status == 'failed':
            print(f"✗ Evaluation failed")
            return False

        print(f"  Progress: {progress}%")
        time.sleep(5)

    print(f"✗ Evaluation timed out")
    return False


def get_results(evaluation_id: str):
    """Get evaluation results."""
    response = requests.get(f"{BASE_URL}/results/{evaluation_id}/summary")
    response.raise_for_status()
    data = response.json()

    print("\n" + "="*60)
    print("EVALUATION RESULTS")
    print("="*60)

    for metric in data['metrics']:
        print(f"\n{metric['model_name']}:")
        print(f"  Win Rate: {metric['win_rate']}%")
        print(f"  Avg Score: {metric['avg_score']}/10")
        print(f"  Avg Latency: {metric['avg_latency_ms']}ms")
        print(f"  Total Cost: ${metric['total_cost_usd']}")

    if data.get('comparison'):
        comp = data['comparison']
        print(f"\nComparison:")
        print(f"  Quality Winner: {comp['quality_winner']}")
        print(f"  Speed Winner: {comp['speed_winner']}")
        print(f"  Cost Winner: {comp['cost_winner']}")


def main():
    """Run the complete example."""
    print("LLM Compare API Usage Example")
    print("="*60)

    # 1. Create user
    user_id, api_key = create_user("example@test.com")

    # 2. Create workspace
    workspace_id = create_workspace(user_id, "Example Workspace")

    # 3. Note: In a real scenario, you would upload actual documents
    # For this example, we'll skip to creating a test dataset

    # 4. Create test dataset
    dataset_id = create_test_dataset(workspace_id, "Example Questions")

    # 5. Upload some example questions
    questions = [
        {
            "question": "What is machine learning?",
            "expected_answer": "Machine learning is a subset of AI..."
        },
        {
            "question": "How does neural network work?",
            "expected_answer": "Neural networks are computing systems..."
        }
    ]
    upload_questions(dataset_id, questions)

    # 6. Create evaluation
    evaluation_id = create_evaluation(
        workspace_id,
        dataset_id,
        "GPT-4 vs Claude Comparison"
    )

    # 7. Wait for completion
    if wait_for_evaluation(evaluation_id):
        # 8. Get results
        get_results(evaluation_id)
    else:
        print("Failed to complete evaluation")


if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        print("\nMake sure the API server is running at http://localhost:8000")
