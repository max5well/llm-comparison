from typing import List, Dict, Any, Optional
import json
from dataclasses import dataclass

from src.core.llm_providers import get_llm_provider, LLMMessage


@dataclass
class SyntheticQuestion:
    """Represents a synthetically generated question."""
    question: str
    expected_answer: Optional[str]
    context: str
    metadata: Dict[str, Any]


class SyntheticDataGenerator:
    """Generate synthetic test questions from text chunks."""

    QUESTION_GENERATION_PROMPT = """You are an expert at creating evaluation questions from documents.

Given the following text chunk, generate {num_questions} diverse, high-quality questions that can be answered using this text.

Text chunk:
\"\"\"
{chunk}
\"\"\"

Requirements:
1. Questions should be natural and realistic - as if asked by real users
2. Questions should be answerable from the provided text
3. Include a mix of question types: factual, conceptual, and analytical
4. Questions should test different aspects of understanding

{answer_instruction}

Return your response as a JSON array of objects with the following structure:
[
  {{
    "question": "the question text",
    "answer": "the answer text (if applicable)",
    "question_type": "factual|conceptual|analytical",
    "difficulty": "easy|medium|hard"
  }},
  ...
]

Generate exactly {num_questions} question(s). Return ONLY the JSON array, no other text."""

    def __init__(
        self,
        provider: str = "openai",
        model: str = "gpt-4o-mini",
        temperature: float = 0.7
    ):
        """
        Initialize synthetic data generator.

        Args:
            provider: LLM provider to use
            model: Model to use for generation
            temperature: Temperature for generation
        """
        self.provider = get_llm_provider(provider)
        self.model = model
        self.temperature = temperature

    async def generate_questions_from_chunk(
        self,
        chunk: str,
        num_questions: int = 3,
        include_answers: bool = True,
        chunk_metadata: Dict[str, Any] = None
    ) -> List[SyntheticQuestion]:
        """
        Generate questions from a single text chunk.

        Args:
            chunk: Text chunk to generate questions from
            num_questions: Number of questions to generate
            include_answers: Whether to include expected answers
            chunk_metadata: Optional metadata about the chunk

        Returns:
            List of SyntheticQuestion objects
        """
        # Format prompt
        answer_instruction = (
            'For each question, provide a clear, concise answer based on the text.'
            if include_answers else
            'You do not need to provide answers, only questions.'
        )

        prompt = self.QUESTION_GENERATION_PROMPT.format(
            num_questions=num_questions,
            chunk=chunk[:3000],  # Limit chunk size
            answer_instruction=answer_instruction
        )

        # Generate questions using LLM
        messages = [LLMMessage(role="user", content=prompt)]

        response = await self.provider.generate(
            messages=messages,
            model=self.model,
            temperature=self.temperature
        )

        if response.error:
            raise Exception(f"Error generating questions: {response.error}")

        # Parse JSON response
        try:
            questions_data = self._extract_json(response.content)
        except json.JSONDecodeError as e:
            raise Exception(f"Failed to parse LLM response as JSON: {str(e)}\nResponse: {response.content}")

        # Create SyntheticQuestion objects
        synthetic_questions = []
        for idx, q_data in enumerate(questions_data):
            synthetic_questions.append(SyntheticQuestion(
                question=q_data.get('question', ''),
                expected_answer=q_data.get('answer') if include_answers else None,
                context=chunk,
                metadata={
                    'question_type': q_data.get('question_type', 'unknown'),
                    'difficulty': q_data.get('difficulty', 'medium'),
                    'generation_model': self.model,
                    'generation_provider': self.provider.provider_name,
                    'chunk_metadata': chunk_metadata or {},
                    'index': idx
                }
            ))

        return synthetic_questions

    async def generate_questions_from_chunks(
        self,
        chunks: List[str],
        num_questions_per_chunk: int = 2,
        include_answers: bool = True,
        chunk_metadatas: List[Dict[str, Any]] = None
    ) -> List[SyntheticQuestion]:
        """
        Generate questions from multiple text chunks.

        Args:
            chunks: List of text chunks
            num_questions_per_chunk: Number of questions per chunk
            include_answers: Whether to include expected answers
            chunk_metadatas: Optional list of metadata for each chunk

        Returns:
            List of all generated SyntheticQuestion objects
        """
        all_questions = []

        for idx, chunk in enumerate(chunks):
            metadata = chunk_metadatas[idx] if chunk_metadatas else None

            try:
                questions = await self.generate_questions_from_chunk(
                    chunk=chunk,
                    num_questions=num_questions_per_chunk,
                    include_answers=include_answers,
                    chunk_metadata=metadata
                )
                all_questions.extend(questions)
            except Exception as e:
                print(f"Error generating questions for chunk {idx}: {str(e)}")
                continue

        return all_questions

    def _extract_json(self, text: str) -> List[Dict]:
        """
        Extract JSON array from LLM response.

        Args:
            text: Text that may contain JSON

        Returns:
            Parsed JSON array
        """
        # Try to find JSON array in the text
        import re

        # Look for JSON array pattern
        json_match = re.search(r'\[[\s\S]*\]', text)
        if json_match:
            json_str = json_match.group(0)
            return json.loads(json_str)

        # If no array found, try parsing entire text
        return json.loads(text)

    @staticmethod
    def save_to_jsonl(
        questions: List[SyntheticQuestion],
        output_file: str
    ) -> None:
        """
        Save questions to JSONL file.

        Args:
            questions: List of SyntheticQuestion objects
            output_file: Path to output file
        """
        with open(output_file, 'w') as f:
            for q in questions:
                data = {
                    'question': q.question,
                    'expected_answer': q.expected_answer,
                    'context': q.context,
                    'metadata': q.metadata
                }
                f.write(json.dumps(data) + '\n')

    @staticmethod
    def load_from_jsonl(input_file: str) -> List[SyntheticQuestion]:
        """
        Load questions from JSONL file.

        Args:
            input_file: Path to input file

        Returns:
            List of SyntheticQuestion objects
        """
        questions = []
        with open(input_file, 'r') as f:
            for line in f:
                data = json.loads(line)
                questions.append(SyntheticQuestion(
                    question=data['question'],
                    expected_answer=data.get('expected_answer'),
                    context=data.get('context', ''),
                    metadata=data.get('metadata', {})
                ))
        return questions
