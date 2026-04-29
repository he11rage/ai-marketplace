from transformers import AutoTokenizer, AutoModel
import torch
import torch.nn.functional as F

_model = None
_tokenizer = None


def _get_model():
    """Загружает модель один раз и возвращает её из кэша"""
    global _model, _tokenizer
    if _model is None:
        print("Loading ru-en-RoSBERTa...")
        _tokenizer = AutoTokenizer.from_pretrained("ai-forever/ru-en-RoSBERTa")
        _model = AutoModel.from_pretrained("ai-forever/ru-en-RoSBERTa")
        _model.eval()
    return _tokenizer, _model


def get_embedding(text: str) -> list[float]:
    """
    Превращает текст в вектор из 768 чисел.
    """
    tokenizer, model = _get_model()

    inputs = tokenizer(
        text, return_tensors="pt", padding=True, truncation=True, max_length=512
    )

    with torch.no_grad():
        outputs = model(**inputs)

    embeddings = outputs.last_hidden_state.mean(dim=1)
    embeddings = F.normalize(embeddings, p=2, dim=1)

    return embeddings[0].tolist()
