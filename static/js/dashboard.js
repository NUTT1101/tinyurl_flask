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
    const editOriginalUrl = document.getElementById('editOriginalUrl');
    const urlValidationFeedback = document.getElementById('urlValidationFeedback');
    const updateUrlBtn = document.getElementById('updateUrlBtn');

    const deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    const qrModal = new bootstrap.Modal(document.getElementById('qrModal'));
    const editUrlModal = new bootstrap.Modal(document.getElementById('editUrlModal'));


    let urlToDelete = null;

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
        const originalUrl = document.getElementById('originalUrl').value;
        const customShortUrl = document.getElementById('customShortUrl').value;

        fetch('/api/shorten', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ original_url: originalUrl, custom_short_url: customShortUrl }),
        })
        .then(response => {
            return response.json()
        })
        .then(data => {
            if (data.success) {
                shortUrlLink.href = data.short_url;
                shortUrlLink.textContent = data.short_url;
                resultDiv.style.display = 'block';
                displayResult(data);
                showToast('短網址產生成功');
            } else {
                showToast(data.message || '縮短網址時發生錯誤');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('縮短網址時發生錯');
        });
    });

    const clipboard = new ClipboardJS('.copy-icon');
    clipboard.on('success', function(e) {
        const shortUrl = document.getElementById('shortUrl').href;
        navigator.clipboard.writeText(shortUrl);
        const copy = document.querySelector('.copy-icon');
        const success = document.querySelector('.copy-success-icon');
        copy.style.display = 'none';
        success.style.display = 'inline-block';
        setTimeout(() => {
            copy.style.display = 'inline-block';
            success.style.display = 'none';
        }, 2000);
        showToast('短網址已複製到剪貼簿');
        e.clearSelection();
    });

    function formatDate(dateString) {
        const options = { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
        };
        return new Date(dateString).toLocaleString('zh-TW', options);
    }

    function fetchAndDisplayUrls() {
        fetch('/api/my_urls')
        .then(response => response.json())
        .then(data => {
            urlList.innerHTML = data.map(url => `
                <div class="url-item card mb-3" data-id="${url.id}">
                    <div class="card-body">
                        <h5 class="card-title text-truncate">
                            <a href="${url.short_url}" target="_blank">${url.short_url}</a>
                        </h5>
                        <p class="card-text text-truncate">${url.original_url}</p>
                        <p class="card-text"><small class="text-muted">點擊次數: ${url.click_count}</small></p>
                        <p class="card-text"><small class="text-muted">創建時間: ${formatDate(url.created_at)}</small></p>
                        <div class="row g-2">
                            <div class="col-6 col-md-3">
                                <button class="btn btn-outline-custom w-100 copy-icon" data-clipboard-text="${url.short_url}" title="複製">
                                    <i class="bi bi-clipboard"></i> 複製
                                </button>
                            </div>
                            <div class="col-6 col-md-3">
                                <button class="btn btn-outline-custom w-100 show-qr-icon" data-url="${url.short_url}" title="QR碼">
                                    <i class="bi bi-qr-code"></i> QR碼
                                </button>
                            </div>
                            <div class="col-6 col-md-3">
                                <button class="btn btn-outline-primary w-100 edit-url" data-id="${url.id}" title="編輯">
                                    <i class="bi bi-pencil"></i> 編輯
                                </button>
                            </div>
                            <div class="col-6 col-md-3">
                                <button class="btn btn-outline-danger w-100 delete-url" data-id="${url.id}" title="刪除">
                                    <i class="bi bi-trash"></i> 刪除
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            addUrlEventListeners();
        })
        .catch(error => {
            console.error('Error fetching URLs:', error);
            showToast('加載 URL 列表時發生錯誤');
        });
    }

    function addUrlEventListeners() {
        document.querySelectorAll('.show-qr-icon').forEach(button => {
            button.addEventListener('click', function() {
                const shortCode = this.getAttribute('data-url');
                const url = `${window.location.origin}/${shortCode}`;
                console.log("URL for QR Code:", url);

                const qrCodeContainer = document.getElementById('qrCodeModalContainer');
                const qrCodeUrl = document.getElementById('qrCodeUrl');
                qrCodeUrl.textContent = url;
                qrCodeUrl.href = shortCode;
                
                qrCodeContainer.innerHTML = ''; // 清空容器

                try {
                    const qr = new QRious({
                        element: document.createElement('canvas'),
                        value: url,
                        size: 300
                    });
                    
                    const img = new Image();
                    img.src = qr.toDataURL();
                    qrCodeContainer.appendChild(img);
                    qrModal.show();
                } catch (error) {
                    console.error("QR Code generation error:", error);
                    showToast("生成 QR 碼時發生錯誤");
                }
            });
        });

        document.querySelectorAll('.edit-url').forEach(button => {
            button.addEventListener('click', function() {
                const urlId = this.getAttribute('data-id');
                const urlItem = this.closest('.url-item');
                const originalUrl = urlItem.querySelector('.card-text').textContent.replace('原始網址: ', '');
                document.getElementById('editUrlId').value = urlId;
                document.getElementById('editOriginalUrl').value = originalUrl;
                editUrlModal.show();
            });
        });

        document.querySelectorAll('.delete-url').forEach(button => {
            button.addEventListener('click', function() {
                urlToDelete = this.getAttribute('data-id');
                deleteConfirmModal.show();
            });
        });
    }

    editOriginalUrl.addEventListener('input', validateUrl);

    document.getElementById('editUrlModal').addEventListener('show.bs.modal', function (event) {
        const button = event.relatedTarget;
        if (button) {
            const urlId = button.getAttribute('data-id');
            const urlItem = document.querySelector(`.url-item[data-id="${urlId}"]`);
            const originalUrl = urlItem.querySelector('.card-text').textContent;
    
            document.getElementById('editUrlId').value = urlId;
            editOriginalUrl.value = originalUrl;
            
            // 重置表單狀態
            editOriginalUrl.classList.remove('is-valid', 'is-invalid');
            urlValidationFeedback.style.display = 'none';
            urlValidationFeedback.textContent = '';
            updateUrlBtn.disabled = false;
    
            // 立即驗證 URL
            validateUrl();
        }
    });

    function validateUrl() {
        const url = editOriginalUrl.value.trim();
        let isValid = isValidUrl(url);

        if (isValid) {
            editOriginalUrl.classList.remove('is-invalid');
            editOriginalUrl.classList.add('is-valid');
            urlValidationFeedback.style.display = 'none';
            updateUrlBtn.disabled = false;
        } else {
            editOriginalUrl.classList.remove('is-valid');
            editOriginalUrl.classList.add('is-invalid');
            urlValidationFeedback.textContent = '請輸入有效的網址';
            urlValidationFeedback.style.display = 'block';
            updateUrlBtn.disabled = true;
        }
    }

    function isValidUrl(string) {
        const urlPattern = new RegExp('^(https?:\\/\\/)?'+ // 協議
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // 域名
            '((\\d{1,3}\\.){3}\\d{1,3}))'+ // 或 IP (v4) 地址
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // 端口和路徑
            '(\\?[;&a-z\\d%_.~+=-]*)?'+ // 查詢字符串
            '(\\#[-a-z\\d_]*)?$','i'); // 錨點
        return !!urlPattern.test(string);
    }

    document.getElementById('editUrlForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const urlId = document.getElementById('editUrlId').value;
        const newUrl = editOriginalUrl.value;

        fetch(`/api/url/${urlId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ original_url: newUrl }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('短網址已成功更新');
                fetchAndDisplayUrls();
                editUrlModal.hide();
            } else {
                showToast('更新失敗：' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('更新時發生錯誤');
        });
    });

    function deleteUrl(urlId) {
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
                urlItem.classList.add('fade-out');
                setTimeout(() => {
                    urlItem.remove();
                    showToast('短網址已成刪除');
                }, 150);
            } else {
                showToast('刪除失敗：' + (data.message || '未知錯誤'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('刪除時發生錯誤');
        });
    }

    document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
        if (urlToDelete) {
            deleteUrl(urlToDelete);
            deleteConfirmModal.hide();
        }
    });

    logoutLink.addEventListener('click', function(e) {
        e.preventDefault();
        fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = '/';
            } else {
                showToast('登出失敗');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('登出時發生錯誤');
        });
    });

    function showToast(message) {
        const toastBody = document.getElementById('toastBody');
        toastBody.textContent = message;
        const toast = new bootstrap.Toast(document.getElementById('toast'));
        toast.show();
    }

    function displayResult(data) {
        const qrCodeCanvas = document.getElementById('qrCodeResult');
    
        // 生成 QR 码
        new QRious({
            element: qrCodeCanvas,
            value: data.short_url,
            size: 300,
        });

        // 滚动到 #UrlResultTitle 元素
        setTimeout(() => {
            const finalElement = document.getElementById('scrollToQR');
            if (finalElement) {
                finalElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }

    // 初始化頁面
    handleHashChange();
});
