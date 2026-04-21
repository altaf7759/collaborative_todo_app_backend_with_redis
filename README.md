# 🚀 Collaborative Task Management System (Backend)

A scalable, production-ready backend system enabling multiple users to collaborate on tasks with secure authentication, Role-Based Access Control (RBAC), and performance optimization using Redis.

---

## 📌 Overview

This project simulates a **real-world collaborative task management system** where multiple users can work together efficiently.

It focuses on:

* Scalability
* Security
* Performance optimization
* Clean backend architecture

---

## ✨ Features

### 👥 Multi-User Collaboration

* Create and manage tasks
* Invite users via email
* Shared task access

### 🔐 Authentication

* JWT-based authentication
* Secure password hashing using bcrypt
* Protected routes using middleware

### 🛡️ Role-Based Access Control (RBAC)

* **Owner**

  * Full access to tasks and collaborators
* **Member**

  * Limited permissions

### 📋 Task Management

* Create, update, delete tasks
* Subtask support
* Assign users to tasks

### ⚡ Performance Optimization

* Redis caching for frequently accessed data
* Reduced database load
* Faster API responses

### 🚦 Rate Limiting

* Redis-based rate limiting
* Prevents API abuse

### 📩 Invitation System

* Email-based onboarding
* Secure invite flow using tokens

### 🐳 Docker Support

* Fully containerized application
* Consistent development & deployment environment

---

## 🏗️ Tech Stack

### Backend

* Node.js
* Express.js

### Database

* MongoDB (Mongoose)

### Caching

* Redis

### Authentication

* JWT (JSON Web Tokens)
* bcrypt

### DevOps

* Docker
* Docker Compose

---

## 🧠 System Design

### 🔹 Architecture

* Modular structure (controllers, routes, services, middleware)
* Separation of concerns

### 🔹 Database Design

Collections:

* Users
* Tasks
* Subtasks
* Roles

### 🔹 Caching Strategy

* Cache frequently accessed data
* Invalidate cache on updates

### 🔹 Rate Limiting

* Request tracking using Redis
* Prevents abuse and DDoS-like patterns

---

## ⚙️ Environment Variables

Create a `.env` file in the root:

```
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
REDIS_URL=your_redis_url
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
```

---

## 🐳 Running with Docker

```
docker-compose up --build
```

---

## ▶️ Running Locally

```
npm install
npm run dev
```

---

## 🔗 API Endpoints (Sample)

### Auth

* `POST /api/auth/register`
* `POST /api/auth/login`

### Tasks

* `POST /api/tasks`
* `GET /api/tasks`
* `PUT /api/tasks/:id`
* `DELETE /api/tasks/:id`

### Subtasks

* `POST /api/tasks/:taskId/subtasks`

### Invitations

* `POST /api/invite`
* `POST /api/accept-invite`

---

## 🔐 Security

* Password hashing (bcrypt)
* JWT authentication
* RBAC authorization
* Rate limiting (Redis)
* Input validation

---

## 📈 Future Improvements

* Real-time updates
* Notifications system
* Frontend integration

---

## 👨‍💻 Author

**Altaf Raja**

---

## 📄 License

MIT License

---

## 💡 Final Note

This project is not just a CRUD application—it demonstrates:

* Real-world backend architecture
* Performance optimization using Redis
* Secure multi-user system design
* Production-ready practices using Docker
