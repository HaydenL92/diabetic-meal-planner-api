# 🍽️ Diabetic Meal Planner API (v0.1.0)

A backend API that helps diabetic users track blood glucose, log meals, and receive personalized meal recommendations.

Built with **FastAPI**, the API includes authentication (JWT), per-user data, a rule-based recommendation engine, and is ready for future machine learning integration.

---

## 🚀 Features (v0.1.0)

### 🔐 Authentication
- User registration with **hashed passwords** (bcrypt / passlib)
- Login with **JWT access tokens**
- Protected endpoints using HTTP Bearer Authentication

### 🩸 Blood Glucose Tracking
- Log blood glucose readings with timestamps + context (pre-meal, post-meal, fasting, exercise, etc.)
- Retrieve BG history **per user**

### 🍽 Meal Logging
- Log meals with BG-before and BG-after values
- Track how specific foods influence blood glucose
- Retrieve meal logs **per user**

### 🧠 Meal Recommendation Engine
Rule-based recommendations based on:
- Current blood glucose level
- Hunger level (1–10)
- Time of day (breakfast, lunch, dinner)
- Carbohydrate level of meals
- Nutrition tags (e.g., `high_protein`, `fast_carbs`)

Each recommendation includes **explanations** so users understand *why* the suggestion fits their situation.

### 🗂️ Database
- SQLAlchemy ORM models for:
  - Users
  - Meals
  - Blood Glucose Readings
  - Meal Logs
- Default database: SQLite  
- PostgreSQL upgrade planned in **v0.2**

---

## 🧱 Tech Stack

- **Python 3.10+**
- **FastAPI**
- **Uvicorn**
- **SQLAlchemy**
- **Pydantic**
- **JWT Auth (python-jose)**
- **Passlib (bcrypt hashing)**
- **SQLite → PostgreSQL (coming soon)**

---

## 📚 API Documentation

FastAPI automatically generates interactive docs:

**Swagger UI:**  
👉 http://localhost:8000/docs

**ReDoc:**  
👉 http://localhost:8000/redoc

---

## 🛠️ Installation & Setup

# 1. Clone the repository
git clone https://github.com/HaydenL92/diabetic-meal-planner-api.git
cd diabetic-meal-planner-api

# 2. Create and activate a virtual environment
python -m venv .venv

# Windows PowerShell:
.venv\Scripts\Activate.ps1

# macOS / Linux:
# source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the API server
uvicorn app.main:app --reload --port 8000

# API now available at:
# http://localhost:8000
# http://localhost:8000/docs

### 📦 Project Structure

app/
 ├── main.py               # FastAPI application & router registration
 ├── models.py             # SQLAlchemy ORM models
 ├── schemas.py            # Pydantic schemas (request/response models)
 ├── db.py                 # Database engine + session
 ├── deps.py               # Authentication + DB dependencies
 ├── security.py           # Password hashing + JWT creation
 ├── routes_auth.py        # Login & token endpoints
 ├── routes_meals.py       # Meal CRUD endpoints
 ├── routes_diabetes.py    # BG readings, meal logs, recommendations
 └── __init__.py

### 🛤️ Roadmap / Version Progress

##v0.1.0 (Current)

-FastAPI backend
-JWT authentication
-Password hashing
-User creation and login
-Blood glucose tracking
-Meal logging
-Rule-based recommendation engine
-Per-user protected data

## v0.2.0 (Next Release)

-Switch from SQLite → PostgreSQL
-Docker support (Dockerfile + docker-compose)
-Environment variables for production
-Improved database schemas

## v0.3.0

-Frontend (Next.js / React)
-User login + registration UI
-BG tracking form
-Meal logging form
-Live recommendations
-Data visualization with charts

## v0.4.0

-ML-powered recommendations
-Personalized response modeling
-Predictive trending (“Your BG usually rises 30–50 points after meal X”)
-Early warning suggestions

## v0.5.0

-Fully deployed version
-Backend on Render/Railway
-Frontend on Vercel
-Public API docs

### 📄 License

MIT License — free to use, improve, or modify.

### 👤 Author

Hayden Lane
GitHub: https://github.com/HaydenL92
