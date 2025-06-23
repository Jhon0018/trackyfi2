import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import logging
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from functools import wraps
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, auth
from services.price_service import find_asset_price
from extensions import db
from models import Asset

# Inicialización Flask y middlewares
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'change-me')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///portfolio.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
CORS(app, origins=["http://localhost:5000", "http://localhost:3000"])

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Firebase Admin
cred = credentials.Certificate(r'd:\TrackYfi\trackyfi-317e1-firebase-adminsdk-fbsvc-e40e78df9b.json')
firebase_admin.initialize_app(cred)

# Base de datos
db.init_app(app)

from models import Asset  # Importa aquí, después de inicializar db

# Decorador autenticación
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Token faltante'}), 401
        try:
            decoded = auth.verify_id_token(token)
            request.user_id = decoded['uid']
            request.user_email = decoded.get('email')
        except Exception as e:
            logger.error(f"Token inválido: {e}")
            return jsonify({'error': 'Token inválido'}), 401
        return f(*args, **kwargs)
    return decorated

# API: Obtener assets
@app.route('/api/assets', methods=['GET'])
@require_auth
def api_get_assets():
    assets = Asset.query.filter_by(user_id=request.user_id).all()
    data = []
    for a in assets:
        price = find_asset_price(a)
        if price is None:
            continue
        v = a.quantity * price
        p = v - (a.quantity * a.purchase_price)
        data.append({**a.to_dict(), 'current_price': price, 'value': v, 'profit': p, 'is_crypto': a.is_crypto()})
    return jsonify(
        success=True,
        data=data,
        total_value=sum(x['value'] for x in data),
        total_investment=sum(a.quantity * a.purchase_price for a in assets)
    )

# API: Agregar asset
@app.route('/api/assets', methods=['POST'])
@require_auth
def api_add_asset():
    data = request.get_json()
    name, ticker, isin = data.get('name'), data.get('ticker', ''), data.get('isin', '')
    qty, pr = float(data.get('quantity', 0)), float(data.get('purchase_price', 0))
    if not name or qty <= 0 or pr <= 0:
        return jsonify(success=False, error='Datos inválidos'), 400
    existing = Asset.query.filter_by(user_id=request.user_id).filter(
        (Asset.ticker == ticker) | (Asset.isin == isin)
    ).first()
    if existing:
        total_q = existing.quantity + qty
        existing.purchase_price = ((existing.purchase_price * existing.quantity) + (pr * qty)) / total_q
        existing.quantity = total_q
        existing.updated_at = datetime.utcnow()
    else:
        new = Asset(
            name=name,
            ticker=ticker.upper(),
            isin=isin.upper(),
            quantity=qty,
            purchase_price=pr,
            user_id=request.user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.session.add(new)
    db.session.commit()
    return jsonify(success=True, message='Activo agregado/actualizado')

# Endpoints adicionales para edición, borrado, etc. (como en tu versión)

# Rutas del frontend
@app.route('/')
def dashboard():
    return render_template('inicio.html')

@app.route('/inicio')
def inicio():
    return render_template('inicio.html')

@app.route('/shared/<string:share_id>')
def shared_view(share_id):
    # Aquí puedes cargar los datos de la cartera compartida usando share_id
    return render_template('shared_view.html', share_id=share_id)

@app.route('/movements')
def movements():
    return render_template('movements.html')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
