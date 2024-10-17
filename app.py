from flask import Flask, request, jsonify, render_template, redirect, url_for, current_app
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, set_access_cookies, unset_jwt_cookies, verify_jwt_in_request
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, Role, UserRole, URL, URLAccess
from config import Config
import random
import string
import qrcode
from io import BytesIO
import base64
import logging
import pymysql
pymysql.install_as_MySQLdb()

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
    try:
        verify_jwt_in_request()
        # 如果驗證成功，重定向到儀表板
        return redirect(url_for('dashboard'))
    except:
        # 如果驗證失敗（令牌不存在或已過期），顯示登入頁面
        return render_template('index.html')

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if User.query.filter_by(username=username).first():
        return jsonify({"message": "Username already exists"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already exists"}), 400

    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
    new_user = User(username=username, email=email, password_hash=hashed_password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User created successfully"}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if user and check_password_hash(user.password_hash, data.get('password')):
        access_token = create_access_token(identity=user.id)
        response = jsonify({"message": "Login successful"})
        set_access_cookies(response, access_token)
        return response, 200
    return jsonify({"message": "Invalid username or password"}), 401

@app.route('/logout', methods=['POST'])
def logout():
    response = jsonify({"message": "Logout successful"})
    unset_jwt_cookies(response)
    return response, 200

@app.route('/dashboard')
@jwt_required()
def dashboard():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    return render_template('dashboard.html', username=user.username)

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

@app.route('/my_urls')
@jwt_required()
def my_urls():
    current_user = get_jwt_identity()
    return render_template('my_urls.html', username=current_user)

@app.route('/api/my_urls')
@jwt_required()
def api_my_urls():
    current_user_id = get_jwt_identity()
    logging.info(f"Current user ID: {current_user_id}")
    
    user = User.query.get(current_user_id)
    if user is None:
        logging.warning(f"User not found for ID: {current_user_id}")
        return jsonify({"error": "User not found"}), 404
    
    logging.info(f"User found: {user.username}, ID: {user.id}")
    
    urls = URL.query.filter(URL.user_id == user.id, URL.id.isnot(None)).all()
    
    return jsonify([{
        'id': url.id,
        'original_url': url.original_url,
        'short_url': url.short_url,
        'click_count': url.click_count,
        'created_at': url.created_at.isoformat()
    } for url in urls])

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
    current_user = get_jwt_identity()
    url = URL.query.filter_by(id=url_id, user_id=current_user).first()
    
    if not url:
        return jsonify({"success": False, "message": "URL not found or you don't have permission to delete it"}), 404

    try:
        db.session.delete(url)
        db.session.commit()
        return jsonify({"success": True, "message": "URL deleted successfully"})
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting URL: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/url/<int:url_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def manage_url(url_id):
    current_user = get_jwt_identity()
    url = URL.query.filter_by(id=url_id, user_id=current_user).first()
    
    if not url:
        return jsonify({"success": False, "message": "URL not found"}), 404

    if request.method == 'GET':
        return jsonify({
            "id": url.id,
            "original_url": url.original_url,
            "short_url": url.short_url,
            "click_count": url.click_count,
            "created_at": url.created_at.isoformat()
        })

    elif request.method == 'PUT':
        data = request.get_json()
        new_original_url = data.get('original_url')
        if new_original_url:
            url.original_url = new_original_url
            db.session.commit()
            return jsonify({"success": True, "message": "URL updated successfully"})
        return jsonify({"success": False, "message": "Invalid data"}), 400

    elif request.method == 'DELETE':
        db.session.delete(url)
        db.session.commit()
        return jsonify({"success": True, "message": "URL deleted successfully"})

if __name__ == '__main__':
    app.run(debug=True)
