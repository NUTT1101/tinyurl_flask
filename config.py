import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key'
    SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:!Shawn1101@localhost/tinyurl'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'your-jwt-secret-key'
    JWT_TOKEN_LOCATION = ['cookies']
    JWT_COOKIE_SECURE = False  # 在生產環境中應設為 True
    JWT_COOKIE_CSRF_PROTECT = False  # 在生產環境中應設為 True
    JWT_ACCESS_TOKEN_EXPIRES = 3600  # 1 小時
