# TOEFL iBT® Complete the Words Practice App

[English](#english) | [한국어](#한국어)

---

## English

An interactive web application designed to help TOEFL iBT candidates practice the "Complete the Words" reading question type. The application generates paragraph-length academic reading exercises using the Google Gemini API, automatically masks key academic words, and allows users to fill in the missing letters in a real-time, interactive interface.

### 🚀 Features

- **Dynamic Problem Generation:** Automatically generates high-quality, university-level academic reading paragraphs using the `gemini-2.5-flash` model.
- **Categorized TOEFL Topics:** Balanced selection of passages across Humanities & Arts, Social Sciences, History & Archaeology, and Natural Sciences.
- **Real-Time Input Validation:** Custom character-by-character input boxes for word completions with automatic tab/arrow-key navigation.
- **Automatic Grading & Reveal:** Instantly grades answers and reveals correct spelling for any missed words.
- **Timer & Stats:** Displays practice time and overall performance metrics upon completion.

### 🛠️ Tech Stack

- **Backend:** FastAPI (Python 3.10+)
- **AI Integration:** Google GenAI SDK (`gemini-2.5-flash`)
- **Frontend:** Vanilla HTML5, CSS3, and JavaScript (statically served by FastAPI)

### 💻 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repository-url>
   cd tofel
   ```

2. **Install Python dependencies:**
   It is recommended to use a virtual environment (e.g., `venv` or Conda).
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Configure environment variables:**
   - Copy `.env.example` to a new file named `.env` in the root directory.
   - Open `.env` and enter your Gemini API key:
     ```env
     GEMINI_API_KEY=your_actual_api_key_here
     ```
     *(You can get an API key for free from [Google AI Studio](https://aistudio.google.com/))*

### 🏃 Running the Application

- **On Windows:**
  Simply double-click `run.bat` in the root folder. It will start the FastAPI server and automatically open the application in your default web browser (`http://localhost:8000`).

- **Via Terminal (Any OS):**
  Navigate to the `backend` directory and start the server using Uvicorn:
  ```bash
  cd backend
  python -m uvicorn main:app --port 8000 --reload
  ```
  Then, open your browser and navigate to `http://localhost:8000`.

---

## 한국어

TOEFL iBT 리딩 영역의 "Complete the Words (단어 완성하기)" 문제 유형을 연습할 수 있는 반응형 웹 애플리케이션입니다. Google Gemini API를 활용하여 실제 시험 난이도의 학술 지문을 실시간으로 생성하고, 핵심 학술 어휘의 뒷부분을 가려 사용자가 직접 타이핑하여 완성할 수 있도록 돕습니다.

### 🚀 주요 기능

- **동적 지문 생성:** `gemini-2.5-flash` 모델을 사용하여 대학 교재 수준의 고품질 학술 지문을 매번 새롭게 생성합니다.
- **다양한 TOEFL 주제 영역:** 인문/예술, 사회과학, 역사/고고학, 자연과학 등 다양한 영역의 지문을 고르게 제공합니다.
- **실시간 입력 시스템:** 글자 단위로 나누어진 전용 입력 칸을 제공하며, 방향키 및 Tab 키로 빠르게 이동할 수 있습니다.
- **자동 채점 및 정답 공개:** 제출 시 오답 유무를 즉시 채점하고 틀린 단어의 올바른 철자를 보여줍니다.
- **타이머 및 통계:** 문제 풀이에 소요된 시간과 정답률 등 통계를 실시간으로 측정합니다.

### 🛠️ 기술 스택

- **백엔드 (Backend):** FastAPI (Python 3.10+)
- **인공지능 연동:** Google GenAI SDK (`gemini-2.5-flash`)
- **프론트엔드 (Frontend):** Vanilla HTML5, CSS3, JavaScript (FastAPI를 통해 정적 파일 서비스)

### 💻 설치 및 설정 방법

1. **저장소 클론:**
   ```bash
   git clone <your-repository-url>
   cd tofel
   ```

2. **파이썬 패키지 설치:**
   가상환경(venv 또는 Conda 등)을 사용하는 것이 권장됩니다.
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **환경 변수 설정:**
   - 프로젝트 루트 디렉토리에 있는 `.env.example` 파일을 복사하여 `.env` 파일을 생성합니다.
   - 생성한 `.env` 파일을 열고 본인의 Gemini API 키를 입력합니다:
     ```env
     GEMINI_API_KEY=본인의_실제_API_키
     ```
     *(API 키는 [Google AI Studio](https://aistudio.google.com/)에서 무료로 발급받으실 수 있습니다.)*

### 🏃 애플리케이션 실행 방법

- **Windows 환경:**
  루트 폴더에 있는 `run.bat` 파일을 더블 클릭하여 실행합니다. FastAPI 서버가 켜지며 기본 웹 브라우저로 앱(`http://localhost:8000`)이 자동 실행됩니다.

- **터미널 실행 (공통):**
  `backend` 폴더로 이동한 후 uvicorn 명령어로 서버를 구동합니다:
  ```bash
  cd backend
  python -m uvicorn main:app --port 8000 --reload
  ```
  서버 구동 후 웹 브라우저를 열고 `http://localhost:8000`에 접속합니다.
