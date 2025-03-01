document.addEventListener('DOMContentLoaded', function() {
    const shortenForm = document.getElementById('shortenForm');
    const resultDiv = document.getElementById('result');
    const shortUrlLink = document.getElementById('shortUrl');
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
    const allLevelsModal = new bootstrap.Modal(document.getElementById('allLevelsModal'));
    const userRole = document.getElementById('userRole');

    let urlToDelete = null;

    userRole.addEventListener('click', function() {
        allLevelsModal.show();
    });

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
        const comment = document.getElementById('comment').value;

        fetch('/api/shorten', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ original_url: originalUrl, custom_short_url: customShortUrl, comment: comment }),
        })
        .then(response => {
		console.log(response);
            return response.json()
        })
        .then(data => {
            console.log(data);
            if (data.short_url) {
                shortUrlLink.href = data.short_url;
                shortUrlLink.textContent = data.short_url;
                resultDiv.style.display = 'block';
                displayResult(data);
                if (data.success) {
                    showToast('短網址產生成功');
                } else {
                    showToast(data.message);
                }
            } else {
                showToast(data.message || '縮短網址時發生錯誤');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('縮短網址時發生錯');
            window.location.href = '/';
        });
    });

    const clipboard = new ClipboardJS('.copy-icon');
    const clipboardMyUrl = new ClipboardJS('.copy-icon-myurl');
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

    clipboardMyUrl.on('success', function(e) {
        const button = e.trigger;
        const originalUrl = button.getAttribute('data-clipboard-text');
        navigator.clipboard.writeText(`${window.location.origin}/${originalUrl}`);
        showToast('已複製到剪貼簿');
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

    function fetchAndDisplayUserUrlsCount() {
        fetch('/api/my_urls_count')
        .then(response => response.json())
        .then(data => {
            document.getElementById('userUrlsCount').textContent = data.count;
            document.getElementById('userUrlLimit').textContent = data.limit;
        });
    }

    function fetchAndDisplayNoUrlsMessage(length) {
        if (length == 0) {
            document.getElementById('noUrlsMessage').style.display = 'block';
        } else {
            document.getElementById('noUrlsMessage').style.display = 'none';
        }
    }

    function fetchAndDisplayUrls() {
        fetch('/api/my_urls')
        .then(response => response.json())
        .then(data => {
            fetchAndDisplayUserUrlsCount();
            fetchAndDisplayNoUrlsMessage(data.length);

            if (data.length != 0) {
                document.getElementById('urlListContainer').style.display = 'block';
                urlList.innerHTML = data.map(url => `
                    <tr class="url-row" data-id="${url.id}">
                        <!-- 手機版顯示 -->
                        <td class="d-md-none">
                            <div class="mobile-url-info">
                                <div class="mb-2">
                                    <strong>短網址：</strong>
                                    <div class="d-flex align-items-center mt-1">
                                        <a href="${url.short_url}" class="text-truncate me-2" target="_blank" style="max-width: 180px;">
                                            ${url.short_url}
                                        </a>
                                        <button class="btn btn-sm btn-outline-primary copy-icon-myurl" 
                                                data-clipboard-text="${url.short_url}" title="複製">
                                            <i class="bi bi-clipboard"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="mb-2">
                                    <strong>原始網址：</strong>
                                    <div class="text-truncate mt-1" style="max-width: 200px;">
                                        ${url.original_url}
                                    </div>
                                </div>
                                <div class="mb-2">
                                    <strong>備註：</strong>
                                    <div class="text-truncate mt-1" style="max-width: 200px;">
                                        ${url.comment || '-'}
                                    </div>
                                </div>
                                <div class="mb-2">
                                    <strong>點擊次數：</strong>
                                    <span class="ms-1">${url.click_count}</span>
                                </div>
                                <div class="mt-3">
                                    <div class="d-flex justify-content-between gap-2" role="group">
                                        <button class="btn btn-sm btn-outline-primary show-qr-icon flex-grow-1" 
                                                data-url="${url.short_url}" title="QR碼">
                                            <i class="bi bi-qr-code"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-primary edit-url flex-grow-1" 
                                                data-id="${url.id}" title="編輯">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger delete-url flex-grow-1" 
                                                data-id="${url.id}" title="刪除">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </td>

                        <!-- 電腦版顯示 -->
                        <td class="d-none d-md-table-cell">
                            <div class="d-flex align-items-center">
                                <span class="d-md-none me-2"><strong>短網址：</strong></span>
                                <a href="${url.short_url}" class="text-truncate me-2" target="_blank" style="max-width: 200px;">
                                    ${url.short_url}
                                </a>
                                <button class="btn btn-sm btn-outline-primary copy-icon-myurl" 
                                        data-clipboard-text="${url.short_url}" title="複製">
                                    <i class="bi bi-clipboard"></i>
                                </button>
                            </div>
                        </td>
                        <td class="d-none d-md-table-cell">
                            <div class="text-truncate" style="max-width: 300px;">
                                ${url.original_url}
                            </div>
                        </td>
                        <td class="d-none d-md-table-cell">
                            <div class="text-truncate" style="max-width: 150px;">
                                ${url.comment || '-'}
                            </div>
                        </td>
                        <td class="d-none d-md-table-cell text-center">
                            ${url.click_count}
                        </td>
                        <td class="d-none d-md-table-cell">
                            <div class="btn-group" role="group">
                                <button class="btn btn-sm btn-outline-primary show-qr-icon" 
                                        data-url="${url.short_url}" title="QR碼">
                                    <i class="bi bi-qr-code"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-primary edit-url" 
                                        data-id="${url.id}" title="編輯">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-url" 
                                        data-id="${url.id}" title="刪除">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');
                
                addUrlEventListeners();
            }
        })
        .catch(error => {
            console.error('Error fetching URLs:', error);
            showToast('加載 URL 列表時發生錯誤');
            window.location.href = '/';
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
                const row = this.closest('tr');
                
                // 檢查是否為手機版或桌面版
                let originalUrl, comment;
                if (row.querySelector('.d-md-none')) {
                    // 手機版
                    originalUrl = row.querySelector('.mobile-url-info div:nth-child(2) div.text-truncate').textContent.trim();
                    comment = row.querySelector('.mobile-url-info div:nth-child(3) div.mt-1').textContent.trim();
                } else {
                    // 桌面版
                    originalUrl = row.querySelector('td:nth-child(2) div.text-truncate').textContent.trim();
                    comment = row.querySelector('td:nth-child(3) div.text-truncate').textContent.trim();
                }

                document.getElementById('editUrlId').value = urlId;
                document.getElementById('editOriginalUrl').value = originalUrl;
                document.getElementById('editComment').value = comment === '-' ? '' : comment;
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

    // 修改 validateForm 函數
    function validateForm() {
        const url = editOriginalUrl.value.trim();
        const comment = document.getElementById('editComment').value;
        let isValid = isValidUrl(url);

        // 檢查是否有任何變更（URL 或備註）
        const urlId = document.getElementById('editUrlId').value;
        const row = document.querySelector(`tr[data-id="${urlId}"]`);
        
        if (!row) {
            console.error('找不到對應的行元素');
            return;
        }

        let originalUrl, originalComment;
        
        if (row.querySelector('.d-md-none')) {
            // 手機版
            originalUrl = row.querySelector('.mobile-url-info div:nth-child(2) div.text-truncate').textContent.trim();
            originalComment = row.querySelector('.mobile-url-info div:nth-child(3) div.mt-1').textContent.trim();
        } else {
            // 桌面版
            originalUrl = row.querySelector('td:nth-child(2) div.text-truncate').textContent.trim();
            originalComment = row.querySelector('td:nth-child(3) div.text-truncate').textContent.trim();
        }
        originalComment = originalComment === '-' ? '' : originalComment;

        // 檢查是否有任何變更（URL 或備註）
        const hasUrlChanged = url !== originalUrl;
        const hasCommentChanged = comment !== originalComment;
        const hasChanges = hasUrlChanged || hasCommentChanged;

        // 更新 URL 輸入框的視覺反饋
        if (!isValid) {
            editOriginalUrl.classList.remove('is-valid');
            editOriginalUrl.classList.add('is-invalid');
            urlValidationFeedback.textContent = '請輸入有效的網址';
            urlValidationFeedback.style.display = 'block';
        } else {
            editOriginalUrl.classList.remove('is-invalid');
            editOriginalUrl.classList.add('is-valid');
            urlValidationFeedback.style.display = 'none';
        }

        // 更新按鈕狀態
        updateUrlBtn.disabled = hasUrlChanged ? !isValid || !hasChanges : !hasChanges;
    }

    // 修改事件監聽器
    editOriginalUrl.addEventListener('input', validateForm);
    document.getElementById('editComment').addEventListener('input', validateForm);

    // 修改模態框顯示事件處理
    document.getElementById('editUrlModal').addEventListener('show.bs.modal', function (event) {
        const button = event.relatedTarget;
        if (button) {
            const urlId = button.getAttribute('data-id');
            const row = document.querySelector(`tr[data-id="${urlId}"]`);
            
            let originalUrl, comment;
            if (row.querySelector('.d-md-none')) {
                // 手機版
                originalUrl = row.querySelector('.mobile-url-info div:nth-child(2) div.text-truncate').textContent.trim();
                comment = row.querySelector('.mobile-url-info div:nth-child(3) div.mt-1').textContent.trim();
            } else {
                // 桌面版
                originalUrl = row.querySelector('td:nth-child(2) div.text-truncate').textContent.trim();
                comment = row.querySelector('td:nth-child(3) div.text-truncate').textContent.trim();
            }

            document.getElementById('editUrlId').value = urlId;
            editOriginalUrl.value = originalUrl;
            document.getElementById('editComment').value = comment === '-' ? '' : comment;
            
            // 重置表單狀態
            editOriginalUrl.classList.remove('is-valid', 'is-invalid');
            urlValidationFeedback.style.display = 'none';
            urlValidationFeedback.textContent = '';
            updateUrlBtn.disabled = true;  // 初始狀態設為禁用
        }
    });

    document.getElementById('editUrlForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const urlId = document.getElementById('editUrlId').value;
        const newUrl = document.getElementById('editOriginalUrl').value;
        const newComment = document.getElementById('editComment').value;

        fetch(`/api/url/${urlId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                original_url: newUrl,
                comment: newComment
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast(data.message);
                fetchAndDisplayUrls();
                editUrlModal.hide();
            } else {
                showToast('更新失敗：' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('更新時發生錯誤');
            window.location.href = '/';
        });
    });

    function deleteUrl(urlId) {
        // 修改選擇器以匹配表格行
        const row = document.querySelector(`tr[data-id="${urlId}"]`);
        
        if (!row) {
            console.error('找不到要刪除的行');
            return;
        }

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
            if (data.success) {
                row.classList.add('fade-out');
                setTimeout(() => {
                    row.remove();
                    fetchAndDisplayUserUrlsCount();
                    document.getElementById('result').style.display = 'none';
                    if (!urlList.children.length) {
                        fetchAndDisplayNoUrlsMessage(urlList.children.length);
                    }
                    showToast(data.message);
                }, 150);
            } else {
                showToast('刪除失敗：' + (data.message || '未知錯誤'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('刪除時發生錯誤');
            window.location.href = '/';
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
                showToast(data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast(data.message);
            window.location.href = '/';
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
    
        new QRious({
            element: qrCodeCanvas,
            value: data.short_url,
            size: 300,
        });

        setTimeout(() => {
            const finalElement = document.getElementById('scrollToQR');
            if (finalElement) {
                finalElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }

    // 添加 URL 驗證函數
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    handleHashChange();
});
