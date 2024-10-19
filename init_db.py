from app import app, db
from models import Role, User, UserRole

def init_db():
    with app.app_context():
        # 創建角色
        roles = {
            'low': 1,
            'normal': 5,
            'premium': 100,
            'super': 999999999  # 使用 MySQL INT 的最大值來代表"無限"
        }
        
        for role_name, url_limit in roles.items():
            role = Role.query.filter_by(name=role_name).first()
            if not role:
                new_role = Role(name=role_name, description=f"{role_name} user", url_limit=url_limit)
                db.session.add(new_role)
        
        db.session.commit()
        print("Roles initialized successfully")

if __name__ == '__main__':
    init_db()
