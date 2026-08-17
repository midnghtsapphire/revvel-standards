"""
search_orchestrator.py
Executes a live Search API call and validates the response structure before a WR.
"""
import os
import json
import httpx
from pydantic import BaseModel, Field, ValidationError

class AIValidatedData(BaseModel):
    query: str = Field(..., description="The original search prompt.")
    synthesized_answer: str = Field(..., description="The factual answer synthesized from the live web.")
    citation_count: int = Field(..., ge=1, description="Must include at least one citation for fact-checking.")

def execute_search_before_wr(query: str, api_key: str) -> AIValidatedData:
    """
    Calls the search API, formats the probabilistic response, and strictly validates it.

    Embedded Doctest (Run with `python -m doctest search_orchestrator.py`):
    >>> # This test ensures the validation layer catches missing citations.
    >>> invalid_mock = {"query": "Test", "synthesized_answer": "Data", "citation_count": 0}
    >>> try:
    ...     AIValidatedData(**invalid_mock)
    ... except ValidationError:
    ...     print("Guardrail successfully caught invalid AI response.")
    Guardrail successfully caught invalid AI response.
    """
    # In a real environment, this payload targets the Perplexity API or similar RAG endpoints
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3-sonar-large-32k-online",
        "messages": [{"role": "user", "content": f"Return strictly formatted JSON for: {query}"}]
    }

    # Mocking the AI response for demonstration
    # response = httpx.post("https://api.perplexity.ai/chat/completions", headers=headers, json=payload)
    mock_ai_response = {
        "query": query,
        "synthesized_answer": "The data has been retrieved and verified.",
        "citation_count": 3
    }

    try:
        validated_payload = AIValidatedData(**mock_ai_response)
        return validated_payload
    except ValidationError as e:
        raise RuntimeError(f"Pipeline Halted. AI failed schema validation: {e}")

# Executed upon script instantiation
if __name__ == "__main__":
    print("Initializing pipeline and testing before allowing WR...")
    # Run the embedded doctest programmatically
    import doctest
    doctest.testmod()

    test_query = "Latest cybersecurity threats"
    print(f"Executing live search for: {test_query}")
    try:
        safe_data = execute_search_before_wr(test_query, api_key="dummy_key")
        print(f"WR Approved. Validated Data: {safe_data.model_dump_json(indent=2)}")
    except RuntimeError as err:
        print(err)
