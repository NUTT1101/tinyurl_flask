from flask import Flask, request, jsonify, redirect, current_app, render_template
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, Role, UserRole, URL, URLAccess
from config import Config
import random
import string
import qrcode
from io import BytesIO
import base64
import logging

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)
jwt = JWTManager(app)

# 設置日誌
logging.basicConfig(level=logging.INFO)

# URL 限制常量
URL_LIMITS = {
    'low': 1,
    'normal': 5,
    'premium': 100,
    'super': float('inf')  # Unlimited
}

# 輔助函數
def generate_short_url():
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for _ in range(6))

def generate_qr_code(url):
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode()

# 路由
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register')
def register():
    return render_template('register.html')

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if user and check_password_hash(user.password_hash, data.get('password')):
        access_token = create_access_token(identity=user.id)
        current_app.logger.info(f"User logged in: {user.username}")
        return jsonify(access_token=access_token), 200
    return jsonify({"message": "Invalid username or password"}), 401

@app.route('/shorten', methods=['POST'])
@jwt_required()
def shorten_url():
    user_id = get_jwt_identity()
    data = request.get_json()
    original_url = data.get('original_url')
    custom_short_url = data.get('custom_short_url')

    user = User.query.get(user_id)
    user_role = user.roles[0] if user.roles else None
    user_urls_count = URL.query.filter_by(user_id=user_id).count()

    if not user_role:
        return jsonify({"message": "User has no assigned role"}), 403

    role_name = user_role.role_name
    url_limit = URL_LIMITS.get(role_name, 0)
    
    if user_urls_count >= url_limit and role_name != 'super':
        return jsonify({"message": f"URL limit reached for {role_name} tier users. Your limit is {url_limit}."}), 403

    if custom_short_url:
        if not custom_short_url.isalnum() or len(custom_short_url) > 20:
            return jsonify({"message": "Invalid custom short URL"}), 400
        if URL.query.filter_by(short_url=custom_short_url).first():
            return jsonify({"message": "Custom short URL already in use"}), 400
        short_url = custom_short_url
    else:
        short_url = generate_short_url()
        while URL.query.filter_by(short_url=short_url).first():
            short_url = generate_short_url()

    new_url = URL(original_url=original_url, short_url=short_url, user_id=user_id)
    db.session.add(new_url)
    db.session.commit()

    qr_code = generate_qr_code(f"{request.host_url}{short_url}")
    current_app.logger.info(f"New URL shortened: {short_url} for user {user.username}")
    return jsonify({
        "short_url": f"{request.host_url}{short_url}",
        "qr_code": qr_code
    }), 201

@app.route('/<short_url>')
def redirect_url(short_url):
    url = URL.query.filter_by(short_url=short_url).first_or_404()
    url.click_count += 1
    db.session.commit()

    access_log = URLAccess(url_id=url.id, ip_address=request.remote_addr)
    db.session.add(access_log)
    db.session.commit()

    return redirect(url.original_url)

@app.route('/my_urls', methods=['GET'])
@jwt_required()
def get_my_urls():
    user_id = get_jwt_identity()
    urls = URL.query.filter_by(user_id=user_id).all()
    return jsonify([{
        "id": url.id,
        "original_url": url.original_url,
        "short_url": f"{request.host_url}{url.short_url}",
        "click_count": url.click_count,
        "created_at": url.created_at.isoformat()
    } for url in urls]), 200

@app.route('/url/<int:url_id>', methods=['PUT'])
@jwt_required()
def update_url(url_id):
    user_id = get_jwt_identity()
    url = URL.query.filter_by(id=url_id, user_id=user_id).first_or_404()
    data = request.get_json()
    url.original_url = data.get('original_url', url.original_url)
    db.session.commit()
    return jsonify({"message": "URL updated successfully"}), 200

@app.route('/url/<int:url_id>', methods=['DELETE'])
@jwt_required()
def delete_url(url_id):
    user_id = get_jwt_identity()
    url = URL.query.filter_by(id=url_id, user_id=user_id).first_or_404()
    db.session.delete(url)
    db.session.commit()
    return jsonify({"message": "URL deleted successfully"}), 200

if __name__ == '__main__':
    app.run(debug=True)
