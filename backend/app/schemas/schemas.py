"""
Pydantic v2 schemas for TicketIQ API.
Strictly matching frontend TypeScript interfaces in frontend/src/types/index.ts.
"""
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class EntitySchema(BaseModel):
    text: str
    label: str
    start: int
    end: int


class ExplanationWordSchema(BaseModel):
    word: str
    weight: float


class ExplanationSchema(BaseModel):
    category: List[ExplanationWordSchema]
    urgency: List[ExplanationWordSchema]


class SimilarTicketSchema(BaseModel):
    id: str
    text: str
    similarity: float
    category: str
    resolution: str


class PipelineStagesSchema(BaseModel):
    raw: str
    normalized: str
    tokens: List[str]
    without_stopwords: List[str]
    lemmas: List[str]


class SentimentResultSchema(BaseModel):
    label: Literal["positive", "negative", "neutral"]
    score: float


class PredictRequest(BaseModel):
    text: str


class PredictionResponse(BaseModel):
    category: str
    category_confidence: float
    urgency: Literal["Low", "Medium", "High", "Critical"]
    urgency_confidence: float
    sentiment: SentimentResultSchema
    entities: List[EntitySchema]
    explanation: ExplanationSchema
    similar_tickets: List[SimilarTicketSchema]
    suggested_resolution: Optional[str] = None
    needs_review: bool = False
    pipeline: PipelineStagesSchema
    ticket_id: str


class ModelPredictRequest(BaseModel):
    model: str
    text: str


class ModelPredictResponse(BaseModel):
    category: str
    confidence: float


class FeedbackRequest(BaseModel):
    ticket_id: str
    actual_category: Optional[str] = None
    actual_urgency: Optional[str] = None
    notes: Optional[str] = None


class FeedbackResponse(BaseModel):
    status: str
    message: str


class ReviewItemSchema(BaseModel):
    id: str
    text: str
    predicted_category: str
    predicted_urgency: str
    corrected_category: Optional[str] = None
    corrected_urgency: Optional[str] = None
    status: Literal["pending", "reviewed", "used_for_retraining"]
    created_at: str
    confidence: float


class AddReviewItemRequest(BaseModel):
    ticket_id: str
    text: str
    predicted_category: str
    predicted_urgency: str
    confidence: float


class RetrainRequest(BaseModel):
    ticket_ids: List[str] = Field(default_factory=list)


class RetrainResult(BaseModel):
    status: str
    tickets_used: Optional[int] = None
    previous_f1: Optional[float] = None
    new_f1: Optional[float] = None
    f1_before: float
    f1_after: float
    f1_delta: Optional[float] = None
    timestamp: Optional[str] = None
    message: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    version: str = "1.0.0"
    model_loaded: Optional[bool] = None
    timestamp: Optional[str] = None
