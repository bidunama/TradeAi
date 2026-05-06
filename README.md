# TradeAI Pro - Universal Market Predictor

TradeAI Pro is a modern, high-performance financial terminal and AI recommendation engine designed specifically for analyzing the Indian Stock Market (NSE/BSE). It features a beautiful, responsive "Glassmorphism" UI, real-time market data, and a suite of Deep Learning models (RNN, LSTM, GRU) that instantly analyze and predict price movements for *any* listed stock.

# some Screenshot 
<img width="1437" height="824" alt="Screenshot 2026-05-06 at 3 29 54 PM" src="https://github.com/user-attachments/assets/4b052b6e-4079-4a6a-a22c-05bbbd66f43a" />


## Features

- **Universal AI Prediction Engine:** Leverages TensorFlow/Keras deep learning models (RNN, LSTM, GRU) to predict price movements on-the-fly for any requested ticker without requiring individual retraining.
- **Real-Time Data & Charting:** Integrates directly with Yahoo Finance (`yfinance`) to pull live stock data, bid/ask spreads, and volume, displayed on a responsive Chart.js interface.
- **Live Search & Autocomplete:** Features a proxy-enabled real-time search bar that auto-resolves Indian companies (e.g. searching "Zomato" instantly resolves to `ZOMATO.NS`).
- **Deep Fundamental Analysis:** Instantly calculates and displays critical metrics like P/E Ratio, ROE, Debt to Equity, and Dividend Yield.
- **Interactive Financial Glossary:** Clickable terminology directly on the dashboard that explains complex financial jargon in simple terms.
- **Dark Glassy UI:** A premium, modern dark mode interface with glowing accents and frosted glass panels.

## 🛠️ Technology Stack

- **Backend:** Python, FastAPI, Uvicorn
- **AI/ML:** TensorFlow (Keras), Scikit-Learn, NumPy, Pandas
- **Data Source:** Yahoo Finance API (`yfinance`, `requests`)
- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript, Chart.js

##  Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tradeai-pro.git
   cd tradeai-pro
   ```

2. **Create and activate a virtual environment**
   ```bash
   # On macOS/Linux
   python3 -m venv venv
   source venv/bin/activate

   # On Windows
   python -m venv venv
   .\venv\Scripts\activate
   ```

3. **Install the required dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Train the Universal AI Models (First Time Only)**
   Before running the app, you need to generate the Universal Deep Learning models:
   ```bash
   python train_models.py
   ```
   *(This will download benchmark data, train the RNN, LSTM, and GRU models, and save them in the `models/universal/` directory.)*

5. **Run the FastAPI Server**
   ```bash
   python app.py
   ```
   Or run via Uvicorn directly:
   ```bash
   uvicorn app:app --reload --host 0.0.0.0 --port 8000
   ```

6. **Open the Application**
   Open your web browser and navigate to: `http://localhost:8000`

## ☁️ Free Cloud Deployment (Hugging Face)

Because this application uses heavy Machine Learning libraries like TensorFlow, standard free tiers (like Vercel or Render) will crash due to low RAM (512MB limits).

**Hugging Face Spaces** provides a completely free tier with **16GB of RAM**, which is perfect for this app!

1. Create a free account on [Hugging Face](https://huggingface.co/).
2. Click **New Space** in your profile.
3. Name your space (e.g. `TradeAI-Pro`).
4. For the **License**, choose whatever you prefer (e.g. MIT).
5. For the **Space SDK**, select **Docker** (Blank).
6. Under Space Hardware, leave it as the free **CPU basic (16GB)** tier.
7. Click **Create Space**.
8. Connect your GitHub repository to your Hugging Face Space, or clone the Space repository and push your code (including the provided `Dockerfile`) to it.
9. Hugging Face will automatically read the `Dockerfile`, build your TensorFlow environment, and host your app for free!

## 📂 Project Structure

```
tradeai-pro/
├── app.py                  # Main FastAPI backend server
├── train_models.py         # Script to train and save the Deep Learning models
├── requirements.txt        # Python package dependencies
├── .gitignore              # Git ignore file
├── models/
│   └── universal/          # Contains the generated .keras AI models
└── static/                 # Frontend assets
    ├── index.html          # Main HTML layout
    ├── style.css           # UI Styling (Dark Glassmorphism)
    └── script.js           # Client-side logic and chart rendering
```

##  Disclaimer
*This project is for educational purposes only. The AI predictions are based on historical trailing data and pattern recognition. Do not use this application to make real-world financial or investment decisions.*
