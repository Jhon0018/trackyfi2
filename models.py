from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import yfinance as yf
import pandas as pd

app = Flask(__name__)
CORS(app)

EODHD_API_TOKEN = "685f4003294516.18931272"  # Cambia por tu token real
EODHD_SEARCH_URL = "https://eodhistoricaldata.com/api/search"

@app.route('/api/dividendos', methods=['GET'])
def obtener_dividendos():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({"error": "Falta el parámetro de búsqueda"}), 400

    # 1. Buscar en EODHD
    params = {
        "api_token": EODHD_API_TOKEN,
        "search_term": query,
        "limit": 1,
        "fmt": "json"
    }
    try:
        response = requests.get(EODHD_SEARCH_URL, params=params)
        response.raise_for_status()
        data = response.json()
        if data and data[0].get("Code"):
            code = data[0]["Code"]
            # Buscar dividendos en EODHD
            div_url = f"https://eodhistoricaldata.com/api/dividends/{code}.US"
            div_params = {"api_token": EODHD_API_TOKEN, "fmt": "json"}
            div_resp = requests.get(div_url, params=div_params)
            div_data = div_resp.json()
            return jsonify({"fuente": "EODHD", "dividendos": div_data})
    except Exception as e:
        print("EODHD error:", e)

    # 2. Fallback: Yahoo Finance
    try:
        ticker = yf.Ticker(query)
        df = ticker.dividends.reset_index()
        if not df.empty:
            df.columns = ["fecha", "dividendo"]
            df["fecha"] = df["fecha"].astype(str)
            dividendos = df.to_dict(orient="records")
            return jsonify({"fuente": "Yahoo", "dividendos": dividendos})
    except Exception as e:
        print("Yahoo error:", e)

    return jsonify({"error": "No se encontraron dividendos"}), 404

if __name__ == "__main__":
    app.run(debug=True)