from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import yfinance as yf

app = Flask(__name__)
CORS(app)

OPENFIGI_API_KEY = "dc960015-7dc8-4de3-a61a-c86b03540e26"
ALPHA_VANTAGE_API_KEY = "ZRDVOJKXEOSCNTM9"

@app.route('/api/precio_isin/<isin>')
def precio_por_isin(isin):
    try:
        # 1. Consulta OpenFIGI para obtener el ticker
        headers = {
            "Content-Type": "application/json",
            "X-OPENFIGI-APIKEY": OPENFIGI_API_KEY
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
        # Prueba con sufijos comunes de Yahoo (puedes ajustar según el exchange)
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

if __name__ == "__main__":
    app.run(debug=True)