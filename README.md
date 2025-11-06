# 🎉 SMU Events Hub - We Love WAD2

A comprehensive event and club management platform designed for Singapore Management University (SMU). This full-stack application enables students to discover events, manage clubs, and organize campus activities seamlessly.

-----------------------------HOSTED ON CLOUD--------------------------------
link : https://we-love-wad2-qqzk.vercel.app
user/pass in .csv file
## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### For Students (Users)
- 🔍 **Browse Events & Clubs** - Discover campus events and student clubs
- 📅 **Event Calendar** - View events in calendar format with day/week/month views
- 💾 **Save Events** - Bookmark favorite events for later
- 📍 **RSVP to Events** - Register your attendance at events
- 🏷️ **Event Filtering** - Filter by categories, tags, venues, and more
- 👤 **User Profile** - Manage profile information and preferences
- 🔔 **Notifications** - Get updates on events and club activities
- 🌐 **Search Functionality** - Find events and clubs quickly

### For Clubs
- 📊 **Club Dashboard** - View analytics and manage club information
- 🎫 **Create & Edit Events** - Manage club events with full details
- 👥 **Track RSVPs** - See who's attending your events
- 🖼️ **Upload Media** - Add images to events and club profiles
- 📈 **Event Statistics** - Track attendance and engagement
- 👥 **Manage Followers** - See club followers and engagement metrics

## 🛠️ Tech Stack

### Frontend
- **Framework**: Vue.js 3
- **Build Tool**: Vite
- **UI Library**: Bootstrap 5 & Bootstrap Vue Next
- **Calendar**: FullCalendar Vue3
- **State Management**: Vuex
- **Routing**: Vue Router
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js (^20.19.0 || >=22.12.0)
- **Framework**: Express.js
- **Database**: PostgreSQL
- **File Storage**: Supabase Storage
- **Email Service**: Nodemailer
- **ORM/Query Builder**: pg
- **Environment**: dotenv for configuration

### Deployment
- **Frontend**: Vercel
- **Backend**: Vercel

## 📁 Project Structure

```
we-love-wad2/
├── backend/                    # Express.js backend
│   ├── controllers/           # Route handlers
│   ├── routes/                # API route definitions
│   ├── middleware/            # Express middleware
│   ├── notification/          # Notification service
│   ├── uploads/               # File storage (club, event)
│   ├── utils/                 # Utility functions
│   ├── db.js                  # Database connection
│   ├── index.js               # Server entry point
│   └── package.json
│
├── frontend/                   # Vue.js frontend
│   ├── src/
│   │   ├── components/        # Vue components
│   │   ├── router/            # Route definitions
│   │   ├── store/             # Vuex store
│   │   ├── services/          # API service layer
│   │   ├── assets/            # Images, styles, icons
│   │   ├── views/             # Page components
│   │   ├── App.vue            # Root component
│   │   └── main.js            # Entry point
│   ├── vite.config.js         # Vite configuration
│   └── package.json
│
└── README.md
```

## 📋 Prerequisites

Before you begin, ensure you have installed:
- **Node.js**: v20.19.0 or >=22.12.0 ([Download](https://nodejs.org/))
- **npm** or **yarn**: Package manager
- **PostgreSQL**: Database ([Download](https://www.postgresql.org/))
- **Git**: Version control

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/zhiwaits/we-love-wad2.git
cd we-love-wad2
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file with required variables (see Environment Variables section)
# Copy .env.example to .env and fill in values
copy .env.example .env  # Windows
# or
cp .env.example .env    # macOS/Linux
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Create .env file (if needed)
copy .env.example .env  # Windows
# or
cp .env.example .env    # macOS/Linux
```

## 🏃 Running the Application

### Development Mode

#### Backend
```bash
# From backend directory
npm start
# Server runs on http://localhost:3000 (or configured PORT)
```

#### Frontend
```bash
# From frontend directory (in a new terminal)
npm run dev
# Frontend runs on http://localhost:5173
```

### Production Build

#### Backend
```bash
# Already running as Node.js server
npm start
```

#### Frontend
```bash
# From frontend directory
npm run build
# Builds to dist/ folder

# Preview production build
npm run preview
```

## 🔐 Environment Variables
# -----------------------------------------
# in zipped file 
#### ----------------------------------------------------------
## 🤝 Contributing

1. Create a new branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Commit your changes:
   ```bash
   git commit -m "Add your feature description"
   ```

3. Push to the branch:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Open a Pull Request and describe your changes

## 📝 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 👥 Team

- **Project**: SMU Web Application Development 2 (WAD2)
- **University**: Singapore Management University

---

**Need Help?**
- Check the [Issues](https://github.com/zhiwaits/we-love-wad2/issues) page
- Review component files in `frontend/src/components/`
- Check service implementations in `frontend/src/services/`
- Review API controllers in `backend/controllers/`

Happy coding! 🎓✨

