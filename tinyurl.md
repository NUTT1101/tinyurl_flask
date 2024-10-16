## 專案名稱
縮!

## 專案簡介
短網址服務網頁，使用者可以輸入網址，系統會自動產生或是使用者可以自動設定短址，使用者可以將短網址分享給其他人，其他人可以透過短網址連接到原始網址。


## 技術
- 前端：HTML、CSS、JavaScript、Bootstrap(RWD、QRcode、Modal)
- 後端：Flask
- 資料庫：MySQL
- 認證：JSON Web Tokens (JWT)

## 畫面設計說明
- 畫面構成
    - Header
        - 網站名稱：縮!
        - 登入後顯示使用者名稱
        - 登入後顯示登出按鈕
    - Body
        - 登入前：
            - 登入
                - 輸入 username 和 password
                - 按下登入按鈕
            - 註冊
                - 輸入 username、email 和 password
                - 按下註冊按鈕
        - 登入後：
            一頁式網站:
            - 縮!
                - 輸入原始網址
                    - 如果輸入的原始網址格式不正確，則會顯示錯誤訊息
                - 輸入自訂短網址(最多 20 個字元，且只能包含大小寫英文、數字，不可包含特殊符號與其他文字，預設為隨機產生)
                    - 如果輸入的自訂短網址已被其他使用者使用，則會顯示錯誤訊息
                - 按下「縮!」按鈕
                    - 當按下「縮!」按鈕後:
                        - 如果輸入的原始網址格式正確，則會顯示:
                            - 短網址(hyperlink)+複製icon(copy icon, 點擊後會複製短網址, 並顯示打勾icon表示已複製)
                            - QRcode(256 * 256 的 QRcode)
                        - 確認該使用者是否已縮過該網址，如果已縮過，則會顯示:
                            - 您已縮過該網址(淺色偏深紅色字體)
                            - 短網址(hyperlink)+複製icon(copy icon, 點擊後會複製短網址, 並顯示打勾icon表示已複製)
                            - QRcode(256 * 256 的 QRcode)
            - 我的網址
                - 顯示所有短網址(short_url, original_url, click_count, created_at, show_qrcode)
                - 可以點擊短網址導向原始網址
                - 可以點擊短網址旁的刪除按鈕刪除該短網址
                - 可以點擊短網址旁的編輯按鈕修改該短網址的原始網址
                - 可以點擊短網址旁的複製按鈕複製該短網址
                - 可以點擊短網址旁的 QRcode 按鈕顯示 QRcode
    - footer
        -  copyright {project_name} @ {create_year} ~ {current_year}

## 功能
1. 登入功能
- 每個人都可以註冊一個帳號，帳號包含 username 和 password。
- 使用者可以透過 username 和 password 登入系統。
- 除 login 和 register 之外，其他功能都需要登入才能使用。
- 登入後會導向首頁，並顯示 Hello username。
2. 縮網址服務
- 使用者可以輸入原始網址，並且選擇是否要自訂短網址。
- 如果使用者選擇自訂短網址，則會檢查該短網址是否已被其他使用者使用，如果已被使用，則會顯示錯誤訊息。
- 如果使用者選擇不自訂短網址，則會自動產生一個短網址。
3. 我的網址
- 使用者可以點擊短網址旁的複製按鈕複製該短網址。
- 使用者可以點擊短網址旁的刪除按鈕刪除該短網址。
- 使用者可以點擊短網址旁的編輯按鈕修改該短網址的原始網址。
- 使用者可以點擊短網址旁的 QRcode 按鈕顯示 QRcode。
4. 登出功能
- 使用者可以點擊登出按鈕登出系統。
5. 普通、高級、超級使用者
- 低能使用者：縮網址數量限制 1 個。
- 普通使用者：縮網址數量限制 10 個。
- 高級使用者：縮網址數量限制 100 個。
- 超級使用者：縮網址數量限制 無限。

## 資料庫設計
- users 表：包含 username、email、password_hash 和 created_at。
- roles 表：包含 role_name 和 description。
- user_roles 表：包含 user_id 和 role_id，用于关联 users 和 roles。
- urls 表：包含 original_url、short_url、user_id、click_count 和 created_at。
- url_access 表：包含 url_id、access_time 和 ip_address。

