# Sales Chatbot Dashboard - AnVie Spa

## 📊 Giới thiệu

Đây là dự án Dashboard để theo dõi và phân tích hiệu suất hoạt động của hệ thống Chatbot Bán hàng tự động cho AnVie Spa. Dashboard cung cấp các chỉ số quan trọng, danh sách khách hàng và chi tiết các phiên tương tác.

Dự án bao gồm:
* **Frontend:** Giao diện Dashboard được xây dựng bằng Next.js (React) và TypeScript, sử dụng Tailwind CSS và shadcn/ui cho giao diện người dùng.
* **Backend:** API được xây dựng bằng FastAPI (Python), kết nối với Google BigQuery để truy vấn dữ liệu.

---

## ✨ Tính năng chính

* **Thống kê tổng quan:**
    * Tỉ lệ tự động hóa trung bình.
    * Số lượng đơn hàng mới.
    * Thời gian phản hồi trung bình của khách hàng.
    * Thời gian phản hồi trung bình của Agent.
    * Thời gian hoàn thành đơn hàng trung bình.
    * Số lượng khách hàng mới và khách hàng quay lại.
* **Lọc theo thời gian:** Xem dữ liệu theo Giờ, Ngày, Tháng, Năm.
* **Quản lý khách hàng:**
    * Xem danh sách tất cả khách hàng tương tác với bot.
    * Tìm kiếm khách hàng theo tên, email, số điện thoại.
    * Xem thông tin chi tiết của từng khách hàng (SĐT, Email, Chế độ điều khiển).
* **Chi tiết phiên chat:**
    * Xem danh sách các phiên chat của một khách hàng.
    * Xem thống kê chi tiết cho từng khách hàng (số đơn, thời gian hoàn thành, thời gian phản hồi, tỉ lệ tự động).
    * Xem lại lịch sử tin nhắn chi tiết của từng phiên chat.

---

## 🛠️ Công nghệ sử dụng

**Frontend (Thư mục `dashboard`):**
* [Next.js](https://nextjs.org/) (React Framework)
* [TypeScript](https://www.typescriptlang.org/)
* [Tailwind CSS](https://tailwindcss.com/)
* [shadcn/ui](https://ui.shadcn.com/) (Bộ sưu tập component UI)
* [Lucide React](https://lucide.dev/) (Icons)
* [Recharts](https://recharts.org/) (Thư viện biểu đồ - có component nhưng chưa sử dụng)
* [pnpm](https://pnpm.io/) (Trình quản lý gói)

**Backend (Thư mục `app`):**
* [Python](https://www.python.org/)
* [FastAPI](https://fastapi.tiangolo.com/) (Web framework)
* [Google BigQuery](https://cloud.google.com/bigquery) (Cơ sở dữ liệu)
* `google-cloud-bigquery` (Thư viện Python cho BigQuery)
* `python-dotenv` (Quản lý biến môi trường)
* `uvicorn` (ASGI server)
* `Rich` (Logging đẹp mắt)
* `Pydantic` (Validation dữ liệu)

---

## 🚀 Cài đặt và Chạy dự án

### Backend (FastAPI)

1.  **Clone Repository:** (Nếu chưa có)
    ```bash
    git clone <your-repository-url>
    cd <your-repository-directory>
    ```
2.  **Tạo môi trường ảo:** (Khuyến nghị)
    ```bash
    python -m venv venv
    source venv/bin/activate # Linux/macOS
    # hoặc
    .\venv\Scripts\activate # Windows
    ```
3.  **Cài đặt Dependencies:** (Giả sử bạn có file `requirements.txt`)
    ```bash
    pip install -r requirements.txt
    ```
4.  **Cấu hình Google Cloud Credentials:**
    * Đặt file JSON key của Google Cloud Service Account vào thư mục `app/auth/` và đảm bảo tên file là `bigquerry_auth.json`.
    * **Quan trọng:** Đảm bảo Service Account có quyền truy cập (ít nhất là `BigQuery Data Viewer` và `BigQuery Job User`) vào project `first-project-450716` trên Google Cloud.
5.  **Cấu hình Biến Môi trường:**
    * Tạo file `.env` trong thư mục gốc của backend (ngang hàng với `app`).
    * Thêm các biến sau vào file `.env`:
        ```dotenv
        GCP_PROJECT_ID="first-project-450716"
        GCP_AUTH_PATH="app/auth/bigquerry_auth.json"
        ```
        *(Điều chỉnh `GCP_PROJECT_ID` nếu cần)*
6.  **Chạy Backend Server:**
    ```bash
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    ```
    API sẽ chạy tại `http://localhost:8000`.

### Frontend (Next.js)

1.  **Điều hướng đến thư mục Frontend:**
    ```bash
    cd dashboard
    ```
2.  **Cài đặt Dependencies:**
    ```bash
    pnpm install
    ```
    *(Lệnh này đọc file `pnpm-lock.yaml` và cài đặt các gói cần thiết)*
3.  **Cấu hình Biến Môi trường:**
    * Tạo file `.env.local` trong thư mục `dashboard`.
    * Thêm URL của backend API vào file:
        ```dotenv
        NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
        ```
        *(Thay đổi URL nếu backend của bạn chạy ở địa chỉ khác, ví dụ: `https://gjkpcr5d-8000.asse.devtunnels.ms` như trong file bạn đã cung cấp)*
4.  **Chạy Frontend Development Server:**
    ```bash
    pnpm dev
    ```
   
5.  **Truy cập Dashboard:** Mở trình duyệt và truy cập `http://localhost:3000`.

---

## ⚙️ Cấu hình

* **Backend:**
    * `GCP_PROJECT_ID`: ID của Google Cloud Project chứa dữ liệu BigQuery.
    * `GCP_AUTH_PATH`: Đường dẫn đến file JSON key của Service Account.
* **Frontend:**
    * `NEXT_PUBLIC_API_BASE_URL`: URL đầy đủ của Backend API.

---

## 📂 Cấu trúc thư mục (Tổng quan)