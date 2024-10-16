document.addEventListener('DOMContentLoaded', function() {
    const urlList = document.getElementById('urlList');
    const logoutLink = document.getElementById('logout');

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

            // 初始化複製功能
            new ClipboardJS('.copy-icon');

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

    // 初始加載URL列表
    fetchAndDisplayUrls();
});
