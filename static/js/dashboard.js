document.addEventListener('DOMContentLoaded', function() {
    const shortenForm = document.getElementById('shortenForm');
    const resultDiv = document.getElementById('result');
    const shortUrlLink = document.getElementById('shortUrl');
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    const urlList = document.getElementById('urlList');
    const logoutLink = document.getElementById('logout');
    const homeLink = document.getElementById('homeLink');
    const myUrlsLink = document.getElementById('myUrlsLink');
    const shortenUrlSection = document.getElementById('shortenUrlSection');
    const myUrlsSection = document.getElementById('myUrlsSection');

    function showSection(sectionId) {
        const sections = [shortenUrlSection, myUrlsSection];
        const links = [homeLink, myUrlsLink];

        sections.forEach(section => {
            section.classList.add('section-hidden');
            section.classList.remove('section-visible');
        });

        links.forEach(link => link.classList.remove('active'));

        setTimeout(() => {
            sections.forEach(section => section.style.display = 'none');

            if (sectionId === 'myurls') {
                myUrlsSection.style.display = 'block';
                fetchAndDisplayUrls();
                myUrlsLink.classList.add('active');
            } else {
                shortenUrlSection.style.display = 'block';
                homeLink.classList.add('active');
            }

            setTimeout(() => {
                const activeSection = sectionId === 'myurls' ? myUrlsSection : shortenUrlSection;
                activeSection.classList.remove('section-hidden');
                activeSection.classList.add('section-visible');
            }, 50);
        }, 300);
    }

    function handleHashChange() {
        const hash = window.location.hash.slice(1);
        showSection(hash);
    }

    window.addEventListener('hashchange', handleHashChange);

    homeLink.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.hash = 'shorten';
    });

    myUrlsLink.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.hash = 'myurls';
    });

    // 處理表單提交
    shortenForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const originalUrl = document.getElementById('originalUrl');
        const customShortUrl = document.getElementById('customShortUrl');
        const originalUrlError = document.getElementById('originalUrlError');
        const customShortUrlError = document.getElementById('customShortUrlError');

        // 重置錯誤訊息
        originalUrlError.textContent = '';
        customShortUrlError.textContent = '';
        originalUrl.classList.remove('is-invalid');
        customShortUrl.classList.remove('is-invalid');

        fetch('/shorten', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ original_url: originalUrl.value, custom_short_url: customShortUrl.value }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.short_url) {
                shortUrlLink.href = data.short_url;
                shortUrlLink.textContent = data.short_url;
                resultDiv.style.display = 'block';
                
                // 生成QR碼
                qrCodeContainer.innerHTML = '';
                new QRCode(qrCodeContainer, {
                    text: data.short_url,
                    width: 256,
                    height: 256
                });

                // 顯示或隱藏"已縮過該網址"訊息
                document.getElementById('alreadyShortenedMessage').style.display = data.already_shortened ? 'block' : 'none';
            } else {
                if (data.errors) {
                    if (data.errors.original_url) {
                        originalUrl.classList.add('is-invalid');
                        originalUrlError.textContent = data.errors.original_url;
                    }
                    if (data.errors.custom_short_url) {
                        customShortUrl.classList.add('is-invalid');
                        customShortUrlError.textContent = data.errors.custom_short_url;
                    }
                } else {
                    alert(data.message || '發生錯誤，請稍後再試。');
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('發生錯誤，請稍後再試。');
        });
    });

    // 複製功能
    new ClipboardJS('.copy-icon');
    document.querySelector('.copy-icon').addEventListener('click', function() {
        document.querySelector('.copy-success-icon').style.display = 'inline-block';
        setTimeout(() => {
            document.querySelector('.copy-success-icon').style.display = 'none';
        }, 2000);
    });

    // 獲取並顯示URL列表
    function fetchAndDisplayUrls() {
        fetch('/api/my_urls')
        .then(response => response.json())
        .then(data => {
            urlList.innerHTML = data.map(url => `
                <div class="url-item mb-3">
                    <p>短網址: <a href="${url.short_url}" target="_blank">${url.short_url}</a> 
                       <i class="bi bi-clipboard copy-icon" data-clipboard-text="${url.short_url}"></i>
                       <i class="bi bi-qr-code show-qr-icon" data-url="${url.short_url}"></i>
                    </p>
                    <p>原始網址: ${url.original_url}</p>
                    <p>點擊次數: ${url.click_count}</p>
                    <p>創建時間: ${new Date(url.created_at).toLocaleString()}</p>
                    <button class="btn btn-sm btn-danger delete-url" data-id="${url.id}">刪除</button>
                    <button class="btn btn-sm btn-primary edit-url" data-id="${url.id}">編輯</button>
                </div>
            `).join('');

            // 添加刪除和編輯事件監聽器
            document.querySelectorAll('.delete-url').forEach(button => {
                button.addEventListener('click', deleteUrl);
            });
            document.querySelectorAll('.edit-url').forEach(button => {
                button.addEventListener('click', editUrl);
            });
            document.querySelectorAll('.show-qr-icon').forEach(icon => {
                icon.addEventListener('click', showQRCode);
            });
        });
    }

    // 刪除URL
    function deleteUrl(e) {
        const urlId = e.target.dataset.id;
        if (confirm('確定要刪除這個短網址嗎？')) {
            fetch(`/api/url/${urlId}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                fetchAndDisplayUrls();
            });
        }
    }

    // 編輯URL
    function editUrl(e) {
        const urlId = e.target.dataset.id;
        const newUrl = prompt('請輸入新的原始網址：');
        if (newUrl) {
            fetch(`/api/url/${urlId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ original_url: newUrl }),
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                fetchAndDisplayUrls();
            });
        }
    }

    // 顯示QR碼
    function showQRCode(e) {
        const url = e.target.dataset.url;
        const qrCodeContainer = document.createElement('div');
        new QRCode(qrCodeContainer, {
            text: url,
            width: 256,
            height: 256
        });
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.appendChild(qrCodeContainer);
        document.body.appendChild(modal);
        modal.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    // 處理登出
    logoutLink.addEventListener('click', function(e) {
        e.preventDefault();
        fetch('/logout', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.message === "Logout successful") {
                window.location.href = '/';
            }
        });
    });

    // 初始加載時設置正確的活動狀態和顯示
    if (window.location.hash === '' || window.location.hash === '#shorten') {
        showSection('shorten');
    } else if (window.location.hash === '#myurls') {
        showSection('myurls');
    }
});
