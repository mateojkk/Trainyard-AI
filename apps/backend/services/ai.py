import os
import json
import logging
import httpx
from dotenv import load_dotenv

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_service")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

async def generate_dataset_description(
    file_name: str,
    file_type: str,
    file_size_bytes: int,
    category: str,
    preview_text: str
) -> dict:
    """
    Generates a dataset description and tags using the Groq API.
    Falls back to a local rules-based generator if GROQ_API_KEY is not configured or fails.
    """
    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY is not configured. Using local fallback generator.")
        return generate_mock_description(file_name, file_type, file_size_bytes, category, preview_text)

    system_prompt = "You are a data catalog assistant for an AI training data marketplace."
    user_prompt = f"""Generate metadata for this AI training dataset.
File: {file_name} ({file_type}, {file_size_bytes} bytes)
Category: {category}
Preview of content:
{preview_text}

Return ONLY valid JSON with these exact keys:
- description: string (2-3 sentences, what the data contains and its ML use case)
- tags: array of 5 strings (relevant ML/AI keywords)
- suggested_title: string (clean, descriptive title if filename is not descriptive)"""

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 500,
        "response_format": {"type": "json_object"}
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Querying Groq API ({GROQ_MODEL}) for metadata...")
            response = await client.post(GROQ_API_URL, json=payload, headers=headers, timeout=20.0)
            response.raise_for_status()
            res_json = response.json()
            
            content_str = res_json["choices"][0]["message"]["content"]
            metadata = json.loads(content_str)
            
            # Basic key validation
            required_keys = ["description", "tags", "suggested_title"]
            if all(key in metadata for key in required_keys):
                logger.info("Successfully generated metadata via Groq.")
                return metadata
            else:
                logger.warning("Groq response did not contain all required keys. Falling back.")
                return generate_mock_description(file_name, file_type, file_size_bytes, category, preview_text)
                
        except Exception as e:
            logger.error(f"Error calling Groq API: {str(e)}. Falling back to mock generator.")
            return generate_mock_description(file_name, file_type, file_size_bytes, category, preview_text)

def generate_mock_description(
    file_name: str,
    file_type: str,
    file_size_bytes: int,
    category: str,
    preview_text: str
) -> dict:
    """
    Local metadata generator fallback that produces clean, structured JSON.
    """
    clean_name = os.path.splitext(file_name)[0].replace("_", " ").replace("-", " ").title()
    
    # Generic description template based on category
    descriptions = {
        "nlp": f"A refined dataset containing text samples for natural language processing. It is optimized for training large language models, sentiment analysis, or fine-tuning classifiers in the {clean_name} domain.",
        "vision": f"A collection of structured image annotations and reference files tailored for computer vision workflows. Perfect for training object detection, image classification, or segmentation models related to {clean_name}.",
        "audio": f"A high-quality speech and sound audio training dataset. It contains labeled segments suitable for automatic speech recognition (ASR), audio categorization, or text-to-speech modeling.",
        "tabular": f"A cleaned tabular dataset containing structured features and labels. Ideal for predictive modeling, regression, anomaly detection, or statistical analysis using machine learning algorithms on {clean_name} records.",
        "multimodal": f"A diverse multimodal dataset combining text, assets, and structural indexes. Engineered for multi-layered model training, embedding generation, or complex retrieval-augmented generation (RAG) systems.",
        "other": f"A specialized AI training dataset containing curated patterns and custom tags. Designed to improve the accuracy and robustness of deep learning systems for unique industrial applications."
    }
    
    # Generic tags based on category
    tag_list = {
        "nlp": ["nlp", "text-corpus", "llm-training", "classification", "nlp-dataset"],
        "vision": ["computer-vision", "image-dataset", "object-detection", "segmentation", "vision"],
        "audio": ["audio", "speech-recognition", "sound-classification", "asr", "audio-processing"],
        "tabular": ["tabular", "structured-data", "classification", "regression", "csv"],
        "multimodal": ["multimodal", "embeddings", "rag", "deep-learning", "text-image"],
        "other": ["dataset", "machine-learning", "ai-training", "curated-data", "metadata"]
    }
    
    desc = descriptions.get(category.lower(), descriptions["other"])
    tags = tag_list.get(category.lower(), tag_list["other"])
    
    return {
        "description": desc,
        "tags": tags,
        "suggested_title": clean_name
    }

if __name__ == "__main__":
    import asyncio
    
    async def test_ai():
        print("Testing AI service...")
        result = await generate_dataset_description(
            file_name="sentiment_reviews_v2.csv",
            file_type="csv",
            file_size_bytes=45230,
            category="nlp",
            preview_text="id,review,label\n1,This dataset is amazing!,1\n2,I did not like the product,0\n"
        )
        print(f"Result:\n{json.dumps(result, indent=2)}")
        
    asyncio.run(test_ai())
