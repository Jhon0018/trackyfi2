from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import yfinance as yf
import pandas as pd

app = Flask(__name__)
CORS(app)

# --- Configuración de claves ---
OPENFIGI_API_KEY = "dc960015-7dc8-4de3-a61a-c86b03540e26"
ALPHA_VANTAGE_API_KEY = "ZRDVOJKXEOSCNTM9"
EODHD_API_TOKEN = "685f4003294516.18931272"
EODHD_SEARCH_URL = "https://eodhistoricaldata.com/api/search"

# --- Endpoint: Precio por ISIN ---
@app.route('/api/precio_isin/<isin>')
def precio_por_isin(isin):
    try:
        # 1. Consulta OpenFIGI para obtener el ticker
        headers = {
            "Content-Type": "application/json",
            "X-OPENFIGI-APIKEY": 
            "f4ae7665-74e9-41e9-bc73-3764b37f2d2d"
        }
        body = [{"idType": "ID_ISIN", "idValue": isin}]
        figi_resp = requests.post("https://api.openfigi.com/v3/mapping", json=body, headers=headers)
        print("OpenFIGI status:", figi_resp.status_code)
        print("OpenFIGI text:", figi_resp.text)
        figi_data = figi_resp.json()
        if not figi_data or not figi_data[0].get("data"):
            print("No se encontró el ticker para ese ISIN")
            return jsonify({"error": "No se encontró el ticker para ese ISIN"}), 404
        ticker = figi_data[0]["data"][0].get("ticker")
        exchCode = figi_data[0]["data"][0].get("exchCode", "US")

        # 2. Consulta Alpha Vantage para obtener el precio
        symbol = f"{ticker}.{exchCode}" if exchCode and exchCode != "US" else ticker
        av_url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={ALPHA_VANTAGE_API_KEY}"
        av_resp = requests.get(av_url)
        av_data = av_resp.json()
        price = av_data.get("Global Quote", {}).get("05. price")
        if price:
            return jsonify({"isin": isin, "ticker": ticker, "price": float(price)})

        # 3. Fallback: Yahoo Finance
        print("Intentando con Yahoo Finance...")
        yahoo_symbols = [f"{ticker}.L", f"{ticker}.MI", f"{ticker}.AS", ticker]
        for ysym in yahoo_symbols:
            try:
                stock = yf.Ticker(ysym)
                hist = stock.history(period="1d")
                if not hist.empty:
                    last_price = hist['Close'].iloc[-1]
                    return jsonify({"isin": isin, "ticker": ysym, "price": float(last_price)})
            except Exception as e:
                print(f"Yahoo error para {ysym}: {e}")

        print("No se pudo obtener el precio de Alpha Vantage ni Yahoo")
        return jsonify({"error": "No se pudo obtener el precio"}), 404
    except Exception as e:
        print("Error en el endpoint:", e)
        return jsonify({"error": str(e)}), 500

# --- Endpoint: Dividendos por nombre, ticker o ISIN ---
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