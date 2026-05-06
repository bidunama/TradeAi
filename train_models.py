import yfinance as yf
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, LSTM, GRU, SimpleRNN, Input
import os
import pickle

# We use a benchmark stock to train the universal model
BENCHMARK_SYMBOL = 'RELIANCE.NS'
LOOK_BACK = 60 # Number of past minutes to use for predicting the next minute

def download_data():
    print(f"Downloading 1-minute interval data for Universal Model training using {BENCHMARK_SYMBOL}...")
    # 7 days is the maximum allowed by Yahoo Finance for 1m interval
    data = yf.download(BENCHMARK_SYMBOL, period='7d', interval='1m')
    return data

def preprocess_data(data):
    # Use closing prices
    dataset = data['Close'].values
    dataset = dataset.astype('float32')
    dataset = dataset.reshape(-1, 1)

    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(dataset)

    x_train, y_train = [], []
    for i in range(LOOK_BACK, len(scaled_data)):
        x_train.append(scaled_data[i-LOOK_BACK:i, 0])
        y_train.append(scaled_data[i, 0])
        
    x_train, y_train = np.array(x_train), np.array(y_train)
    # Reshape for Keras models (samples, time steps, features)
    x_train = np.reshape(x_train, (x_train.shape[0], x_train.shape[1], 1))
    
    return x_train, y_train, scaler

def build_and_train_rnn(x_train, y_train):
    print("Training Universal SimpleRNN...")
    model = Sequential()
    model.add(Input(shape=(x_train.shape[1], 1)))
    model.add(SimpleRNN(50, return_sequences=True))
    model.add(SimpleRNN(50))
    model.add(Dense(1))
    model.compile(optimizer='adam', loss='mean_squared_error')
    model.fit(x_train, y_train, epochs=3, batch_size=64, verbose=1)
    return model

def build_and_train_lstm(x_train, y_train):
    print("Training Universal LSTM...")
    model = Sequential()
    model.add(Input(shape=(x_train.shape[1], 1)))
    model.add(LSTM(50, return_sequences=True))
    model.add(LSTM(50))
    model.add(Dense(1))
    model.compile(optimizer='adam', loss='mean_squared_error')
    model.fit(x_train, y_train, epochs=3, batch_size=64, verbose=1)
    return model

def build_and_train_gru(x_train, y_train):
    print("Training Universal GRU...")
    model = Sequential()
    model.add(Input(shape=(x_train.shape[1], 1)))
    model.add(GRU(50, return_sequences=True))
    model.add(GRU(50))
    model.add(Dense(1))
    model.compile(optimizer='adam', loss='mean_squared_error')
    model.fit(x_train, y_train, epochs=3, batch_size=64, verbose=1)
    return model

if __name__ == "__main__":
    save_dir = 'models/universal'
    os.makedirs(save_dir, exist_ok=True)
    
    data = download_data()
    
    x_train, y_train, scaler = preprocess_data(data)
    
    # We do NOT save the scaler here because the universal model predicts normalized data.
    # We will fit a new scaler dynamically for whatever stock the user requests in app.py.
    # However, we can save a dummy scaler if needed, but it's better to fit it on the fly in app.py.
    # We'll just train and save the models.
    
    rnn_model = build_and_train_rnn(x_train, y_train)
    rnn_model.save(f'{save_dir}/rnn_model.keras')
    
    lstm_model = build_and_train_lstm(x_train, y_train)
    lstm_model.save(f'{save_dir}/lstm_model.keras')
    
    gru_model = build_and_train_gru(x_train, y_train)
    gru_model.save(f'{save_dir}/gru_model.keras')
    
    print("All Universal models trained and saved successfully.")
