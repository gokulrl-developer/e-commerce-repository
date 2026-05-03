# 👜 CarryMart

A full-stack e-commerce platform for buying and managing bags, built using **Express.js** and **Vanilla JavaScript**, following the **MVC (Model-View-Controller)** architecture.

---

## 🌐 Live Link

🔗 https://carry-mart.shop 

---

## 📌 Features

### 👤 User Features

* Browse, search, and filter products  
* View detailed product information  
* Add items to cart and manage cart  
* Seamless and secure checkout experience  
* Multiple payment options (Wallet, Online Payment, Cash on Delivery)  
* View order history and cancel orders  
* Manage user profile and account settings  
* Wallet system with transaction history  
* Wishlist for saving favorite products  

### 🛠️ Admin Features

* Manage categories, products, coupons, and offers  
* Order management and status updates  
* User management  
* Sales report generation  
* Dashboard with analytics and insights  
---

## 🏗️ Tech Stack

**Frontend**

* HTML5
* CSS3 
* Tailwind CSS
* Vanilla JavaScript
* EJS
* SweetAlert2

**Backend**

* Node.js
* Express.js
* Express Session

**Database**

* MongoDB 

**Payments and Integrations**

* Razorpay (Online payment)
* Nodemailer (email services – OTP, notifications)

**File Upload**

* Cloudinary
* Multer

**Reports and Utilities**

* ExcelJS
* PDFKit

---

## ✨ Key Highlights

- Full-stack MVC architecture implementation
- Inventory management  
- Real-world e-commerce features (cart, wallet, orders, admin dashboard,coupons,offers ...)  
- Integrated Razorpay payment gateway  
- Google OAuth authentication  
- Cloud-based image storage using Cloudinary  
- Sales reporting with Excel/PDF generation  

---

## 📂 Project Structure

```
carrymart/
│
├── config/           # DB and app configuration
├── constants/        # Centralised file for constants
├── controllers/      # Request handling logic
├── middlewares/      # Custom middleware functions
├── models/           # Database schemas/models
├── routes/           # Route definitions
├── views/            # Frontend templates (EJS)
├── utils/            # Utility function definitions
├── public/           # Static assets (CSS, JS, images)
│
├── app.js            # Entry point and app set up
│
├── .env              # Environment variables
├── input.css         # tailwind input
├── tailwind.config.js   # tailwind configuration file
├── package.json
└── README.md
```

---

## ⚙️ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/gokulrl-developer/e-commerce-repository.git
cd e-commerce-repository
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

Create a `.env` file in the root directory:

```
PORT=port
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=your_secret_key
```
📌 For the complete list of required environment variables, refer to the .env.example file in the repository.

### 4. Run the application

```bash
npm run dev
```

App will run on mentioned port


---


## 📸 Screenshots

### 🏠 Product listing page

Users can browse and explore different categories of bags.

<img width="1351" height="2231" alt="carry-mart shop_shopAll_page=1 limit=9" src="https://github.com/user-attachments/assets/a9a7d6cf-5bb8-423b-a0e2-88c95baa9b41" />

---

### 🛍️ Product Details Page

Detailed view of a selected product with pricing and description.
<img width="1351" height="2095" alt="carry-mart shop_product_6972f2ddd5cc22e809f1e593" src="https://github.com/user-attachments/assets/738ce1de-2f8d-4de7-a4c7-359b0f3bbe39" />

---

### 🛒 Cart Page

Manage selected items before checkout.
<img width="1351" height="774" alt="carry-mart shop_cart" src="https://github.com/user-attachments/assets/2c3f9233-e07f-44ef-b3e5-6c4283611537" />

---

### 💳 Change Status

Admin changes status of order.
<img width="1110" height="583" alt="Screenshot 2026-05-03 115917" src="https://github.com/user-attachments/assets/ee37c435-79dc-4467-92e5-3f14a0e0a612" />

---

### 🛠️ Generate Report

Admin Generate Report
<img width="1101" height="523" alt="Screenshot 2026-05-03 120032" src="https://github.com/user-attachments/assets/9463bab8-8a10-4050-8579-e286c2da9bcf" />

---


## 🧠 Architecture

This project follows the **MVC architecture**:

* **Model** → Handles database logic
* **View** → UI (HTML/CSS/JS)
* **Controller** → Handles request/response flow

---


## 🚀 Deployment

The application is deployed and accessible at:

🔗 https://carry-mart.shop  

- Hosted on Google Cloud  
- MongoDB Atlas used for database  
- Cloudinary used for media storage  

## 🤝 Contributing

This is a personal portfolio project and is not open for contributions.

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

**Gokul R.L**

-github profile: https://github.com/gokulrl-developer