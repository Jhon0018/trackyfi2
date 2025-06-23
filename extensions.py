# backend_estadof.py
from flask import Flask, jsonify
from flask_cors import CORS
import yfinance as yf

app = Flask(__name__)
CORS(app)

# Mapeo de nombres de filas de yfinance a los que espera el frontend
ROW_MAP = {
    "totalRevenue": "Total Revenue",
    "costOfRevenue": "Cost Of Revenue",
    "grossProfit": "Gross Profit",
    "totalOperatingExpenses": "Operating Expense",
    "operatingIncome": "Operating Income",
    "netIncome": "Net Income",
    "ebitda": "EBITDA",
    "basicEPS": "Basic EPS",
    "dilutedEPS": "Diluted EPS",
    "totalAssets": "Total Assets",
    "totalLiab": "Total Liab",
    "totalStockholderEquity": "Total Stockholder Equity",
    "longTermDebt": "Long Term Debt",
    "totalCashFromOperatingActivities": "Total Cash From Operating Activities",
    "totalCashflowsFromInvestingActivities": "Total Cashflows From Investing Activities",
    "totalCashFromFinancingActivities": "Total Cash From Financing Activities",
    "changeInCash": "Change In Cash"
}

def build_statement(df, keys):
    result = []
    for col in df.columns:
        period = {"endDate": {"raw": int(col.timestamp())}}
        for key, row in keys.items():
            possible_rows = row_variants.get(key, [row])
            value = get_value(df, possible_rows, col)
            period[key] = {"raw": float(value)} if value is not None else {}
        result.append(period)
    return result

def get_value(df, possible_rows, col):
    for row in possible_rows:
        if row in df.index:
            return df.loc[row, col]
    return None

row_variants = {
    "totalOperatingExpenses": ["Operating Expense", "Total Operating Expenses", "Operating Expenses"]
}

@app.route('/api/estadof/<symbol>')
def estadof(symbol):
    ticker = yf.Ticker(symbol)
    income = ticker.financials.fillna(0)
    balance = ticker.balance_sheet.fillna(0)
    cashflow = ticker.cashflow.fillna(0)

    income_keys = {k: v for k, v in ROW_MAP.items() if k in [
        "totalRevenue", "costOfRevenue", "grossProfit", "totalOperatingExpenses",
        "operatingIncome", "netIncome", "ebitda", "basicEPS", "dilutedEPS"
    ]}
    balance_keys = {k: v for k, v in ROW_MAP.items() if k in [
        "totalAssets", "totalLiab", "totalStockholderEquity", "longTermDebt"
    ]}
    cashflow_keys = {k: v for k, v in ROW_MAP.items() if k in [
        "totalCashFromOperatingActivities", "totalCashflowsFromInvestingActivities",
        "totalCashFromFinancingActivities", "changeInCash"
    ]}

    response = {
        "incomeStatementHistory": {
            "incomeStatementHistory": build_statement(income, income_keys)
        },
        "balanceSheetHistory": {
            "balanceSheetStatements": build_statement(balance, balance_keys)
        },
        "cashflowStatementHistory": {
            "cashflowStatements": build_statement(cashflow, cashflow_keys)
        }
    }
    return jsonify(response)

if __name__ == "__main__":
    app.run(debug=True)