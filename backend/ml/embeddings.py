import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModel

_model = None
_tokenizer = None
_device = None

def _get_model():
    """Загружает модель один раз и возвращает её из кэша"""
    global _model, _tokenizer, _device
    if _model is None:
        print("🤖 [STARTUP] Loading ru-en-RoSBERTa into memory...")
        _tokenizer = AutoTokenizer.from_pretrained("ai-forever/ru-en-RoSBERTa")
        _model = AutoModel.from_pretrained("ai-forever/ru-en-RoSBERTa")
        _model.eval()
        
        # Автоматически определяем устройство (GPU если есть, иначе CPU)
        _device = "cuda" if torch.cuda.is_available() else "cpu"
        _model.to(_device)
        print(f"[STARTUP] Model successfully loaded on device: {_device}")
        
    return _tokenizer, _model, _device

def get_embedding(text: str) -> list[float]:
    """
    Превращает текст в вектор из 1024 чисел с использованием Masked Mean Pooling.
    """
    tokenizer, model, device = _get_model()
    
    inputs = tokenizer(
        text, 
        return_tensors="pt", 
        padding=True, 
        truncation=True, 
        max_length=512
    )
    
    # Переносим тензоры на то же устройство, что и модель
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)

    # --- Masked Mean Pooling ---
    attention_mask = inputs["attention_mask"]
    # Расширяем маску до размерности эмбеддингов (batch_size, seq_len, hidden_dim)
    mask_expanded = attention_mask.unsqueeze(-1).expand(outputs.last_hidden_state.size()).float()
    
    # Суммируем только значимые эмбеддинги (где mask == 1)
    sum_embeddings = torch.sum(outputs.last_hidden_state * mask_expanded, dim=1)
    # Считаем количество значимых токенов (защита от деления на ноль через clamp)
    sum_mask = torch.clamp(mask_expanded.sum(dim=1), min=1e-9)
    
    # Усредняем
    embeddings = sum_embeddings / sum_mask
    
    # L2 нормализация (обязательно для CosineDistance в pgvector)
    embeddings = F.normalize(embeddings, p=2, dim=1)

    return embeddings[0].tolist()