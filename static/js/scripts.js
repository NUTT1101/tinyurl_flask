document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotPassword = document.getElementById('forgotPassword');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    const loginContainer = document.getElementById('loginContainer');
    const registerContainer = document.getElementById('registerContainer');
    const registerModalBody = document.getElementById('registerModalBody');
    const modal = new bootstrap.Modal(document.getElementById('registerModal'));

    // 添加輸入欄位焦點效果
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('input-focus');
        });
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('input-focus');
        });
    });

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            
            fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            })
            .then(response => {
                if (!response.headers.get('content-type').includes('application/json')) {
                    return response.text().then(text => ({ success: false, message: "登入嘗試過多，請稍後再試" }));
                } else {
                    return response.json();
                }
            })
            .then(data => {
                if (data.success) {
                    window.location.href = '/dashboard';
                } else {
                    registerModalBody.innerHTML = `<p>${data.message}</p>`;
                    modal.show();
                }
            })
            .catch((error) => {
                console.error('Error:', error);
            });

            animateButton(this.querySelector('button'));
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('registerUsername').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                registerModalBody.innerHTML = `<p>輸入的密碼不一致</p>`;
                modal.show();
                return;
            }

            fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password }),
            })
            .then(response => {
                if (!response.headers.get('content-type').includes('application/json')) {
                    return response.text().then(text => ({ success: false, message: "註冊嘗試過多，請稍後再試" }));
                } else {
                    return response.json();
                }
            })
            .then(data => {
                registerModalBody.innerHTML = `<p>${data.message}</p>`;
                modal.show();
                if (data.success) {
                    switchForm(registerContainer, loginContainer);
                }
            })
            .catch((error) => {
                console.error('Error:', error);
            });

            animateButton(this.querySelector('button'));
        });
    }

    if (forgotPassword) {
        forgotPassword.addEventListener('click', function(e) {
            e.preventDefault();
            // 這裡添加忘記密碼邏輯
            console.log('忘記密碼請求已發送');
        });
    }

    if (showRegister) {
        showRegister.addEventListener('click', function(e) {
            e.preventDefault();
            switchForm(loginContainer, registerContainer);
        });
    }

    if (showLogin) {
        showLogin.addEventListener('click', function(e) {
            e.preventDefault();
            switchForm(registerContainer, loginContainer);
        });
    }

    function animateButton(button) {
        button.classList.add('animate__animated', 'animate__pulse');
        setTimeout(() => {
            button.classList.remove('animate__animated', 'animate__pulse');
        }, 300); // 縮短動畫時間
    }

    function switchForm(hideForm, showForm) {
        hideForm.classList.remove('animate__fadeIn');
        hideForm.classList.add('animate__fadeOut');
        setTimeout(() => {
            hideForm.style.display = 'none';
            showForm.style.display = 'block';
            showForm.classList.remove('animate__fadeOut');
            showForm.classList.add('animate__fadeIn');
        }, 250); // 縮短切換時間
    }
});
