from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from extensions import db


class Asset(db.Model):
    __tablename__ = 'assets'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    ticker = db.Column(db.String(20), nullable=True)
    isin = db.Column(db.String(20), nullable=True)
    quantity = db.Column(db.Float, nullable=False)
    purchase_price = db.Column(db.Float, nullable=False)
    user_id = db.Column(db.String(128), nullable=False)  # Firebase UID
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Asset {self.name}: {self.quantity}@{self.purchase_price}>'

    def is_crypto(self):
        """Determina si el asset es una criptomoneda"""
        return self.isin == "CRIPTO"

    def to_dict(self):
        """Convierte el objeto a diccionario para JSON"""
        return {
            'id': self.id,
            'name': self.name,
            'ticker': self.ticker,
            'isin': self.isin,
            'quantity': self.quantity,
            'purchase_price': self.purchase_price,
            'user_id': self.user_id,
            'is_crypto': self.is_crypto(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
