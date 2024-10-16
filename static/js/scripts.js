document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotPassword = document.getElementById('forgotPassword');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    const loginContainer = document.getElementById('loginContainer');
    const registerContainer = document.getElementById('registerContainer');

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
            // 這裡添加登入邏輯
            console.log('登入請求已發送');
            animateButton(this.querySelector('button'));
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // 這裡添加註冊邏輯
            console.log('註冊請求已發送');
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
