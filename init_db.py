from app import app, db
from models import Role, User, UserRole

def init_db():
    with app.app_context():
        # 創建角色
        roles = ['low', 'normal', 'premium', 'super']
        for role_name in roles:
            role = Role.query.filter_by(role_name=role_name).first()
            if not role:
                new_role = Role(role_name=role_name, description=f"{role_name} user")
                db.session.add(new_role)
        
        db.session.commit()
        print("Roles initialized successfully")

if __name__ == '__main__':
    init_db()
