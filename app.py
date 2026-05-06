from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import yfinance as yf
import numpy as np
import pandas as pd
from tensorflow.keras.models import load_model
from sklearn.preprocessing import MinMaxScaler
import os
import requests

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

LOOK_BACK = 60

@app.get("/")
async def read_index():
    return FileResponse("static/index.html")

@app.get("/api/search")
async def search_symbols(q: str):
    try:
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={q}"
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers)
        data = response.json()
        quotes = data.get('quotes', [])
        
        results = []
        for quote in quotes:
            exch = quote.get('exchange')
            if exch in ['NSI', 'BSE']:
                results.append({
                    "symbol": quote.get('symbol'),
                    "name": quote.get('shortname', quote.get('longname', quote.get('symbol')))
                })
        return {"results": results[:6]}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/info")
async def get_company_info(symbol: str = Query("RELIANCE.NS")):
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        return {
            "name": info.get("longName", symbol),
            "sector": info.get("sector", "N/A"),
            "current_price": info.get("currentPrice", info.get("regularMarketPrice", "N/A")),
            "symbol": symbol,
            "performance": {
                "dayLow": info.get("dayLow", "N/A"),
                "dayHigh": info.get("dayHigh", "N/A"),
                "open": info.get("regularMarketOpen", "N/A"),
                "prevClose": info.get("previousClose", "N/A"),
                "volume": info.get("volume", "N/A"),
                "bid": info.get("bid", "N/A"),
                "ask": info.get("ask", "N/A"),
            },
            "fundamentals": {
                "marketCap": info.get("marketCap", "N/A"),
                "roe": info.get("returnOnEquity", "N/A"),
                "pe": info.get("trailingPE", "N/A"),
                "pb": info.get("priceToBook", "N/A"),
                "debtToEquity": info.get("debtToEquity", "N/A"),
                "bookValue": info.get("bookValue", "N/A"),
                "divYield": info.get("dividendYield", "N/A"),
                "fiftyTwoWeekHigh": info.get("fiftyTwoWeekHigh", "N/A"),
                "fiftyTwoWeekLow": info.get("fiftyTwoWeekLow", "N/A"),
            }
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/financials")
async def get_financials(symbol: str = Query("RELIANCE.NS")):
    try:
        ticker = yf.Ticker(symbol)
        fin = ticker.financials
        if fin is None or fin.empty:
            return {"error": "No financial data available"}
        
        # Convert to dictionary format safe for JSON
        fin_dict = fin.fillna(0).to_dict()
        
        formatted_data = []
        for date, values in fin_dict.items():
            formatted_data.append({
                "date": date.strftime('%Y-%m-%d') if hasattr(date, 'strftime') else str(date),
                "totalRevenue": values.get("Total Revenue", 0),
                "netIncome": values.get("Net Income", 0)
            })
        
        return {"financials": formatted_data[:4]} # Return last 4 years
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/shareholders")
async def get_shareholders(symbol: str = Query("RELIANCE.NS")):
    try:
        ticker = yf.Ticker(symbol)
        holders = ticker.major_holders
        if holders is None or holders.empty:
            return {"error": "No shareholder data available"}
            
        # major_holders typically returns 2 columns: Value and Breakdown
        # We need to map it to JSON
        # Values look like: 50.39%, 10.20%, etc.
        data_dict = {}
        for index, row in holders.iterrows():
            key = str(row.iloc[1]).replace(" %", "")
            val = str(row.iloc[0]).replace("%", "")
            try:
                data_dict[key] = float(val)
            except:
                data_dict[key] = val
        
        return {"shareholders": data_dict}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/data")
async def get_stock_data(symbol: str = Query("RELIANCE.NS"), timeframe: str = Query("1d")):
    try:
        # 1. Fetch Chart Data based on requested timeframe
        tf_map = {
            "1d": {"period": "1d", "interval": "1m"},
            "1w": {"period": "5d", "interval": "5m"},
            "1m": {"period": "1mo", "interval": "1d"},
            "3m": {"period": "3mo", "interval": "1d"},
            "6m": {"period": "6mo", "interval": "1d"},
            "1y": {"period": "1y", "interval": "1d"},
        }
        
        tf_settings = tf_map.get(timeframe, tf_map["1d"])
        
        chart_data = yf.download(symbol, period=tf_settings["period"], interval=tf_settings["interval"])
        
        if chart_data.empty:
            return {"error": f"No chart data found for symbol {symbol}"}
            
        # Convert index timezone to IST if needed, but for simplicity we'll just format it
        # Clean data: remove duplicates and handle NaNs
        chart_data = chart_data.sort_index()
        chart_data = chart_data[~chart_data.index.duplicated(keep='last')]
        chart_data = chart_data.ffill().fillna(0)

        if timeframe == "1d":
            dates = chart_data.index.strftime('%H:%M').tolist()
        elif timeframe == "1w":
            dates = chart_data.index.strftime('%a %H:%M').tolist()
        else:
            dates = chart_data.index.strftime('%b %d').tolist()

        is_multi = isinstance(chart_data['Close'], pd.DataFrame)
        close_col = chart_data['Close'].iloc[:, 0] if is_multi else chart_data['Close']
        prices = close_col.values.tolist()
        
        sma_20 = close_col.rolling(window=20).mean().fillna(0).tolist()
        sma_50 = close_col.rolling(window=50).mean().fillna(0).tolist()
        
        # 2. Fetch Prediction Data (ALWAYS 1m interval for the AI model)
        model_data = yf.download(symbol, period="7d", interval="1m")
        
        predictions = {"rnn": None, "lstm": None, "gru": None}
        
        if not model_data.empty and os.path.exists("models/universal/rnn_model.keras"):
            if isinstance(model_data['Close'], pd.DataFrame):
                close_series_model = model_data['Close'].iloc[:, 0]
            else:
                close_series_model = model_data['Close']
                
            scaler = MinMaxScaler(feature_range=(0, 1))
            full_values = close_series_model.values.astype('float32').reshape(-1, 1)
            scaler.fit(full_values)
            
            last_60_mins = close_series_model.values[-LOOK_BACK:]
            if len(last_60_mins) == LOOK_BACK:
                last_60_mins = last_60_mins.astype('float32').reshape(-1, 1)
                last_60_mins_scaled = scaler.transform(last_60_mins)
                X_test = np.reshape(last_60_mins_scaled, (1, LOOK_BACK, 1))
                
                rnn_model = load_model("models/universal/rnn_model.keras")
                lstm_model = load_model("models/universal/lstm_model.keras")
                gru_model = load_model("models/universal/gru_model.keras")
                
                pred_rnn = scaler.inverse_transform(rnn_model.predict(X_test, verbose=0))[0][0]
                pred_lstm = scaler.inverse_transform(lstm_model.predict(X_test, verbose=0))[0][0]
                pred_gru = scaler.inverse_transform(gru_model.predict(X_test, verbose=0))[0][0]
                
                predictions = {
                    "rnn": float(pred_rnn),
                    "lstm": float(pred_lstm),
                    "gru": float(pred_gru)
                }
        
        return {
            "dates": dates,
            "prices": prices,
            "sma_20": sma_20,
            "sma_50": sma_50,
            "predictions": predictions,
            "symbol": symbol
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
