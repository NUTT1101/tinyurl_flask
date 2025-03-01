import logging
import os
import random
import re
import string
from datetime import datetime
import threading
import pymysql
from flask import Flask, request, jsonify, render_template, redirect, url_for, current_app
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, set_access_cookies, \
    unset_jwt_cookies, verify_jwt_in_request
from werkzeug.security import generate_password_hash, check_password_hash
from zxcvbn import zxcvbn
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import time
from datetime import datetime, timedelta
from collections import defaultdict

import create_db
from config import Config
from models import db, User, Role, UserRole, URL

create_db.create_database()

pymysql.install_as_MySQLdb()

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)
jwt = JWTManager(app)
    
# 設置日誌
logging.basicConfig(level=logging.INFO)

# 初始化限流器
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

# 追蹤 IP 訪問記錄
ip_access_records = defaultdict(list)
suspicious_ips = set()
SUSPICIOUS_THRESHOLD = 100  # 每分鐘訪問次數閾值

def is_suspicious_ip(ip):
    """檢查 IP 是否可疑"""
    current_time = datetime.now()
    # 清理舊記錄
    ip_access_records[ip] = [t for t in ip_access_records[ip] 
                           if current_time - t < timedelta(minutes=1)]
    
    # 添加新記錄
    ip_access_records[ip].append(current_time)
    
    # 檢查訪問頻率
    if len(ip_access_records[ip]) > SUSPICIOUS_THRESHOLD:
        suspicious_ips.add(ip)
        return True
    return False

@app.before_request
def check_request_security():
    """請求安全檢查"""
    ip = get_remote_address()
    
    # 檢查是否是已知的可疑 IP
    if ip in suspicious_ips:
        return jsonify({"message": "Access denied"}), 403
    
    # 檢查請求頻率
    if is_suspicious_ip(ip):
        app.logger.warning(f"Suspicious activity detected from IP: {ip}")
        return jsonify({"message": "Too many requests"}), 429
    
    # 檢查 User-Agent
    user_agent = request.headers.get('User-Agent', '')
    if not user_agent or len(user_agent) < 10:
        return jsonify({"message": "Invalid request"}), 400

def setup_roles():
    with app.app_context():
        # 創建角色
        roles = {
            'low': {'url_limit': 1, 'description': '低能', 'color_code': '222222'},
            'normal': {'url_limit': 5, 'description': '普通', 'color_code': '00AA00'},
            'premium': {'url_limit': 100, 'description': '高級', 'color_code': 'FFAA00'},
        }

        for role_name, url_limit in roles.items():
            role = Role.query.filter_by(name=role_name).first()
            if not role:
                new_role = Role(name=role_name, description=url_limit['description'], url_limit=url_limit['url_limit'], color_code=url_limit['color_code'])
                db.session.add(new_role)
        
        db.session.commit()
setup_roles()


# 輔助函數
def generate_short_url():
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for _ in range(1, 5))

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    # Token 過期後，重定向到登錄頁面
    return redirect(url_for('index'))

# JWT 未授權時的處理邏輯
@jwt.unauthorized_loader
def unauthorized_callback(error):
    # 未提供 Token 或未授權時，重定向到登錄頁面
    return redirect(url_for('index'))

# 路由
@app.route('/')
def index():
    try:
        verify_jwt_in_request()
        return redirect(url_for('dashboard'))
    except:
        return render_template('index.html')

@app.route('/register', methods=['POST'])
@limiter.limit("7 per day", error_message="註冊嘗試過多，請稍後再試")  # 每天最多 10 次請求
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not username.strip() or not email.strip() or not password.strip():  
        return jsonify({"message": "資料格式錯誤 fuck you"}), 400

    if len(username) < 4 or len(username) > 32:
        return jsonify({"message": "帳號長度至少 4 個字元，最多 32 個字元"}), 400

    if len(password) > 32:
        return jsonify({"message": "密碼長度不可以超過 32 個字元"}), 400

    if username.lower() in ['admin', 'root', 'dev']:
        return jsonify({"message": "帳號不得為有非法單字"}), 400

    if User.query.filter_by(username=username).first() or User.query.filter_by(email=email).first():
        return jsonify({"message": "無法創建帳號"}), 400

    if not re.match("^[A-Za-z0-9]+$", username):
        return jsonify({"message": "帳號只能包含英文及數字"}), 400

    # 檢查 email 是否合法，使用嚴謹的正則表達式
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return jsonify({"message": "電子郵件格式錯誤"}), 400
    
    # zxcvbn 檢查密碼強度
    strength = zxcvbn(password)
    if strength['score'] < 3:
        return jsonify({"message": "密碼強度不足"}), 400

    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
    new_user = User(username=username, email=email, password_hash=hashed_password, created_at=datetime.now())
    db.session.add(new_user)

    low_role = Role.query.filter_by(name='normal').first()

    if low_role:
        user_role = UserRole(user_id=new_user.id, role_id=low_role.id)
        db.session.add(user_role)
    
    db.session.commit()

    return jsonify({"message": "使用者創建成功", "success": True}), 201


@app.route('/login', methods=['POST'])
@limiter.limit("5 per minute", error_message="登入嘗試過多，請稍後再試")  # 每分鐘最多 5 次請求
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if user and check_password_hash(user.password_hash, data.get('password')):
        access_token = create_access_token(identity=user.id)
        response = jsonify({"message": "登入成功", "success": True})
        set_access_cookies(response, access_token)
        return response, 200
    return jsonify({"message": "帳號或密碼錯誤", "success": False}), 401

@app.route('/logout', methods=['POST'])
def logout():
    response = jsonify({"message": "登出成功", "success": True})
    unset_jwt_cookies(response)
    return response, 200

@app.route('/dashboard')
@jwt_required()
def dashboard():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_role = user.roles[0].description
    color_code = user.roles[0].color_code
    user_urls_count = URL.query.filter_by(user_id=current_user_id).count()
    user_url_limit = user.roles[0].url_limit
    return render_template('dashboard.html', username=user.username, user_role=user_role, color_code=color_code, user_urls_count=user_urls_count, user_url_limit=user_url_limit)

@app.route('/api/shorten', methods=['POST'])
@jwt_required()
@limiter.limit("10 per minute")  # 每分鐘最多 10 次請求
def shorten_url():
    user_id = get_jwt_identity()
    data = request.get_json()

    original_url = data.get('original_url')
    custom_short_url = data.get('custom_short_url')
    comment = data.get('comment')

    if len(comment) > 256:
        return jsonify({"message": "備註長度不可以超過 256 個字元"}), 400

    if not comment.strip():
        comment = None

    if not original_url.strip():
        return jsonify({"message": "資料格式錯誤"}), 400
    
    # 檢查 original_url 是否合法，使用嚴謹的正則表達式，允許 http 或 https，不允許 localhost
    if not re.match(r'https?:\/\/(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+([\/a-zA-Z0-9#-_.?=&]*)?', original_url):
        return jsonify({"message": "請輸入正確的網址"}), 400

    user = User.query.get(user_id)
    user_role = user.roles[0] if user.roles else None
    user_urls_count = URL.query.filter_by(user_id=user_id).count()

    if not user_role:
        return jsonify({"message": "此帳號目前無法使用縮網址服務"}), 403
    
    # 檢查是否已經縮過該網址
    if URL.query.filter_by(original_url=original_url, user_id=user_id).first():
        return jsonify({"message": "該網址已被您縮址過，請勿重新縮址", "short_url": f"{request.host_url}{URL.query.filter_by(original_url=original_url, user_id=user_id).first().short_url}"}), 400

    if custom_short_url:
        if not re.match(r'^[a-zA-Z0-9-_]{1,20}$', custom_short_url):
            return jsonify({"message": "自訂網址格式錯誤，只允許英文大小寫和數字和 - _ ，長度限制在 1 到 20 個字元"}), 400
        if URL.query.filter_by(short_url=custom_short_url).first():
            return jsonify({"message": "自訂網址已被使用"}), 400
        short_url = custom_short_url
    else:
        short_url = generate_short_url()
        while URL.query.filter_by(short_url=short_url).first():
            short_url = generate_short_url()

    url_limit = user_role.url_limit
    
    if url_limit != float('inf') and user_urls_count >= url_limit:
        return jsonify({"message": f"網址數量已達上限，請升級帳號。"}), 403

    new_url = URL(original_url=original_url, short_url=short_url, user_id=user_id, click_count=0, created_at=datetime.now(), comment=comment)
    db.session.add(new_url)
    db.session.commit()

    current_app.logger.info(f"New URL shortened: {short_url} for user {user.username}")
    return jsonify({
        "success": True,
        "short_url": f"{request.host_url}{short_url}",
    }), 201

@app.route('/<short_url>', methods=['POST'])
def check_short_url(short_url):
    if not re.match(r'^[a-zA-Z0-9-_]{1,20}$', short_url):
        return jsonify({"exists": False}), 200
    url = URL.query.filter_by(short_url=short_url).first()
    return jsonify({"exists": bool(url)}), 200

@app.route('/<short_url>', methods=['GET'])
@limiter.limit("60 per minute")  # 每分鐘最多 60 次訪問
def redirect_url(short_url):
    if not re.match(r'^[a-zA-Z0-9-_]{1,20}$', short_url):
        return render_template('404.html', cause="網址不存在"), 404
    
    url = URL.query.filter_by(short_url=short_url).first()
    if not url:
        return render_template('404.html', cause="網址不存在"), 404
    
    # 記錄訪問資訊
    access_info = {
        'ip': get_remote_address(),
        'user_agent': request.headers.get('User-Agent'),
        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'url_id': url.id
    }
    app.logger.info(f"URL Access: {access_info}")
    
    url.click_count += 1
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
    
    urls = URL.query.filter_by(user_id=user.id).all()
    
    urls = sorted(urls, key=lambda x: x.created_at, reverse=True)
    return jsonify([{
        'id': url.id,
        'original_url': url.original_url,
        'short_url': url.short_url,
        'click_count': url.click_count,
        'created_at': url.created_at.isoformat(),
        'comment': url.comment
    } for url in urls])

@app.route('/api/my_urls_count')
@jwt_required()
def api_my_urls_count():
    current_user_id = get_jwt_identity()
    logging.info(f"Current user ID: {current_user_id}")
    
    user = User.query.get(current_user_id)
    if user is None:
        logging.warning(f"User not found for ID: {current_user_id}")
        return jsonify({"error": "User not found"}), 404
    
    logging.info(f"User found: {user.username}, ID: {user.id}")
    
    urls = URL.query.filter_by(user_id=user.id).all()
    
    return jsonify({
        'count': len(urls), 
        'limit': user.roles[0].url_limit
    })

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
        return jsonify({"success": False, "message": "網址不存在或您無權刪除"}), 404

    try:
        db.session.delete(url)
        db.session.commit()
        return jsonify({"success": True, "message": "網址刪除成功"})
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting URL: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/url/<int:url_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def manage_url(url_id):
    current_user_id = get_jwt_identity()
    url = URL.query.filter_by(id=url_id, user_id=current_user_id).first()
    
    if not url:
        return jsonify({"success": False, "message": "網址不存在"}), 404

    if request.method == 'GET':
        return jsonify({
            "id": url.id,
            "original_url": url.original_url,
            "short_url": url.short_url,
            "click_count": url.click_count,
            "created_at": url.created_at.isoformat(),
            "comment": url.comment
        })

    elif request.method == 'PUT':
        data = request.get_json()
        new_original_url = data.get('original_url')
        new_comment = data.get('comment', '').strip() or None  # 如果是空字串則設為 None
        
        if new_original_url:
            url.original_url = new_original_url
            url.comment = new_comment
            db.session.commit()
            return jsonify({"success": True, "message": "網址更新成功"})
        return jsonify({"success": False, "message": "資料格式錯誤"}), 400

    elif request.method == 'DELETE':
        db.session.delete(url)
        db.session.commit()
        return jsonify({"success": True, "message": "網址刪除成功"})
    
# show all levels with jwt required
@app.route('/api/levels')
@jwt_required()
def api_levels():
    roles = Role.query.all()
    return jsonify([{'name': role.name, 'description': role.description, 'color_code': role.color_code, 'url_limit': role.url_limit} for role in roles])

# 定期清理可疑 IP 列表
def cleanup_suspicious_ips():
    while True:
        time.sleep(3600)  # 每小時執行一次
        current_time = datetime.now()
        for ip in list(suspicious_ips):
            # 如果該 IP 在過去一小時內沒有新的可疑行為，則從列表中移除
            if not ip_access_records[ip] or \
               (current_time - max(ip_access_records[ip])) > timedelta(hours=1):
                suspicious_ips.remove(ip)
                del ip_access_records[ip]

# 啟動清理線程
cleanup_thread = threading.Thread(target=cleanup_suspicious_ips, daemon=True)
cleanup_thread.start()

if __name__ == '__main__':
    app.run(debug=False, port=8787)
