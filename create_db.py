from flask import Flask
from sqlalchemy import create_engine, text
from models import db
from config import Config

def create_database():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)

    with app.app_context():
        # 創建數據庫
        engine = create_engine(Config.SQLALCHEMY_DATABASE_URI.rsplit('/', 1)[0])
        with engine.connect() as conn:
            conn.execute(text("CREATE DATABASE IF NOT EXISTS tinyurl"))

        # 創建表
        db.create_all()

if __name__ == '__main__':
    create_database()
    print("Database and tables created successfully!")
