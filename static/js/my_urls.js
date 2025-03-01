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
        console.log("URL for QR Code:", url);

        if (!url || !isValidUrl(url)) {
            console.error("Invalid URL for QR Code generation");
            alert("無法生成 QR 碼：無效的 URL");
            return;
        }

        const qrCodeContainer = document.getElementById('qrCodeContainer');
        qrCodeContainer.innerHTML = ''; // 清空容器

        try {
            new QRCode(qrCodeContainer, {
                text: url,
                width: 256,
                height: 256,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
            const qrModal = new bootstrap.Modal(document.getElementById('qrModal'));
            qrModal.show();
        } catch (error) {
            console.error("QR Code generation error:", error);
            alert("生成 QR 碼時發生錯誤");
        }
    }

    // 添加一個函數來驗證 URL
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
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

