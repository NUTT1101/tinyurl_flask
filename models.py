from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Role(db.Model):
    __tablename__ = 'roles'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(64), unique=True, nullable=False)
    description = db.Column(db.String(256))
    url_limit = db.Column(db.Integer, nullable=False)
    color_code = db.Column(db.String(6), nullable=False)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime)
    roles = db.relationship('Role', secondary='user_roles', backref=db.backref('users', lazy='dynamic'))
    urls = db.relationship('URL', backref='user', lazy='dynamic')

class URL(db.Model):
    __tablename__ = 'urls'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    original_url = db.Column(db.String(2048), nullable=False)
    short_url = db.Column(db.String(20), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    click_count = db.Column(db.Integer)
    created_at = db.Column(db.DateTime)
    accesses = db.relationship('URLAccess', backref='url', lazy='dynamic', cascade='all, delete-orphan')

class URLAccess(db.Model):
    __tablename__ = 'url_access'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    url_id = db.Column(db.Integer, db.ForeignKey('urls.id'), nullable=False)
    access_time = db.Column(db.DateTime)
    ip_address = db.Column(db.String(45), nullable=False)

class UserRole(db.Model):
    __tablename__ = 'user_roles'
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True, nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'), primary_key=True, nullable=False)
