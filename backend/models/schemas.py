from pydantic import BaseModel, Field
from typing import List

class QuizQuestion(BaseModel):
    type: str = Field(description="The type of question. MUST be one of: 'MCQ', 'Short QA', 'Long QA', 'Fill in the blanks'", default="MCQ")
    question: str = Field(description="The question text")
    options: List[str] = Field(description="List of 4 possible options. If type is not MCQ, leave this as an empty list []", default=[])
    answer: str = Field(description="The correct option (must exactly match one of the options) or the expected answer for text.")

class QuizOutput(BaseModel):
    is_valid_study_material: bool = Field(description="Set to false if the document is a resume, CV, or non-educational.", default=True)
    title: str = Field(description="Title of the quiz", default="Quiz")
    questions: List[QuizQuestion] = Field(description="List of questions")

class Flashcard(BaseModel):
    front: str = Field(description="Front of the card (concept/term)")
    back: str = Field(description="Back of the card (definition/explanation)")

class FlashcardOutput(BaseModel):
    is_valid_study_material: bool = Field(description="Set to false if the document is a resume, CV, or non-educational.", default=True)
    title: str = Field(description="Title for the flashcard deck", default="Flashcards")
    flashcards: List[Flashcard] = Field(description="List of flashcards")

class SummaryOutput(BaseModel):
    is_valid_study_material: bool = Field(description="Set to false if the document is a resume, CV, or non-educational.", default=True)
    title: str = Field(description="Title of the summary", default="Summary")
    summary: str = Field(description="The detailed summary content")

class StudyPlanTask(BaseModel):
    day: str = Field(description="Day number or identifier (e.g., 'Day 1')")
    topic: str = Field(description="Topic to study")
    duration: str = Field(description="Suggested duration (e.g., '2 hours')")

class StudyPlanOutput(BaseModel):
    is_valid_study_material: bool = Field(description="Set to false if the document is a resume, CV, or non-educational.", default=True)
    title: str = Field(description="Title of the study plan", default="Study Plan")
    tasks: List[StudyPlanTask] = Field(description="List of study tasks")

class Concept(BaseModel):
    name: str = Field(description="Name of the concept")
    explanation: str = Field(description="Detailed explanation of the concept")

class ConceptsOutput(BaseModel):
    title: str = Field(description="Title for the concepts", default="Key Concepts")
    concepts: List[Concept] = Field(description="List of extracted concepts")

class Resource(BaseModel):
    title: str = Field(description="Title of the resource")
    type: str = Field(description="Type of resource (e.g., 'Video', 'Article', 'Book')")
    description: str = Field(description="Brief description of why this resource is useful")
    url: str = Field(description="URL to the resource (can be a search query URL if exact link is unknown)")

class ResourcesOutput(BaseModel):
    title: str = Field(description="Title for the resources list", default="Learning Resources")
    resources: List[Resource] = Field(description="List of suggested resources")
