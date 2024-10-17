let qrModal;

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

    // 初始化 QR 碼模態框
    qrModal = new bootstrap.Modal(document.getElementById('qrModal'));

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

function addUrlEventListeners() {
    // 複製按鈕
    new ClipboardJS('.copy-icon');
    document.querySelectorAll('.copy-icon').forEach(button => {
        button.addEventListener('click', function() {
            showToast('短網址已複製到剪貼板');
        });
    });

    // QR 碼按鈕
    document.querySelectorAll('.show-qr-icon').forEach(button => {
        button.addEventListener('click', function() {
            const url = this.getAttribute('data-url');
            showQRCode(url);
        });
    });

    // 編輯按鈕
    document.querySelectorAll('.edit-url').forEach(button => {
        button.addEventListener('click', function() {
            const urlId = this.getAttribute('data-id');
            editUrl(urlId);
        });
    });

    // 刪除按鈕
    document.querySelectorAll('.delete-url').forEach(button => {
        button.addEventListener('click', function() {
            const urlId = this.getAttribute('data-id');
            deleteUrl(urlId);
        });
    });
}

function showToast(message) {
    const toast = new bootstrap.Toast(document.getElementById('toast'));
    document.getElementById('toastBody').textContent = message;
    toast.show();
}

function showQRCode(url) {
    const qrContainer = document.getElementById('qrCodeContainer');
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
        text: url,
        width: 128,
        height: 128
    });
    document.getElementById('qrModalLabel').textContent = '短網址 QR 碼';
    qrModal.show();
}

function editUrl(urlId) {
    // 獲取當前 URL 信息
    fetch(`/api/url/${urlId}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('editUrlId').value = data.id;
            document.getElementById('editOriginalUrl').value = data.original_url;
            new bootstrap.Modal(document.getElementById('editUrlModal')).show();
        })
        .catch(error => console.error('Error:', error));
}

function deleteUrl(urlId) {
    if (confirm('確定要刪除這個短���址嗎？')) {
        const urlItem = document.querySelector(`.url-item[data-id="${urlId}"]`);
        
        fetch(`/api/url/${urlId}`, { 
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Delete response:', data);
            if (data.success) {
                // 添加淡出效果
                urlItem.classList.add('fade-out');
                
                // 幾乎立即移除元素
                setTimeout(() => {
                    urlItem.remove();
                    showToast('短網址已成功刪除');
                }, 60); // 60毫秒後移除元素，略長於過渡時間
            } else {
                showToast('刪除失敗：' + (data.message || '未知錯誤'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('刪除時發生錯誤');
        });
    }
}

// 獲取並顯示URL列表
function fetchAndDisplayUrls() {
    fetch('/api/my_urls')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        urlList.innerHTML = `
            <div class="url-list">
                ${data.map(url => `
                    <div class="url-item card mb-3" data-id="${url.id}">
                        <div class="card-body p-2">
                            <h5 class="card-title mb-1 text-truncate">
                                <a href="${url.short_url}" target="_blank" title="${url.short_url}">${url.short_url}</a>
                            </h5>
                            <p class="card-text mb-1 small text-muted text-truncate" title="${url.original_url}">
                                ${url.original_url}
                            </p>
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <small class="text-muted">點擊: ${url.click_count}</small>
                                <small class="text-muted">${new Date(url.created_at).toLocaleString()}</small>
                            </div>
                            <div class="btn-group btn-group-sm w-100" role="group">
                                <button class="btn btn-outline-secondary copy-icon" data-clipboard-text="${url.short_url}" title="複製">
                                    <i class="bi bi-clipboard"></i> 複製
                                </button>
                                <button class="btn btn-outline-secondary show-qr-icon" data-url="${url.short_url}" title="QR碼">
                                    <i class="bi bi-qr-code"></i> QR碼
                                </button>
                                <button class="btn btn-outline-primary edit-url" data-id="${url.id}" title="編輯">
                                    <i class="bi bi-pencil"></i> 編輯
                                </button>
                                <button class="btn btn-outline-danger delete-url" data-id="${url.id}" title="刪除">
                                    <i class="bi bi-trash"></i> 刪除
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // 添加事件監聽器
        addUrlEventListeners();
    })
    .catch(error => {
        console.error('Error fetching URLs:', error);
        showToast('加載 URL 列表時發生錯誤');
    });
}

// 處理編輯表單提交
document.getElementById('editUrlForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const urlId = document.getElementById('editUrlId').value;
    const newOriginalUrl = document.getElementById('editOriginalUrl').value;

    fetch(`/api/url/${urlId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ original_url: newOriginalUrl }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('短網址已成功更新');
            fetchAndDisplayUrls();
            bootstrap.Modal.getInstance(document.getElementById('editUrlModal')).hide();
        } else {
            showToast('更新失敗：' + data.message);
        }
    })
    .catch(error => console.error('Error:', error));
});
