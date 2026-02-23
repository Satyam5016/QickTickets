# QuickTickets - Movie Ticket Booking System

A full-stack web application for booking movie tickets online, built with React, Node.js, Express, and MongoDB.

## 🚀 Features

- **User Authentication**: Secure login/signup using Clerk
- **Movie Browsing**: Browse featured movies and trailers
- **Seat Selection**: Interactive seat layout for show bookings
- **Payment Processing**: Secure payments via Stripe integration
- **Admin Dashboard**: Complete admin panel for managing shows and bookings
- **Email Notifications**: Automated booking confirmations via Nodemailer
- **Responsive Design**: Mobile-friendly UI built with Tailwind CSS
- **Real-time Updates**: Background job processing with Inngest

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Clerk** - Authentication and user management
- **Axios** - HTTP client
- **React Hot Toast** - Toast notifications
- **React Player** - Video player for trailers

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **Clerk** - Server-side authentication
- **Stripe** - Payment processing
- **Inngest** - Background job processing
- **Cloudinary** - Image hosting and management
- **Nodemailer** - Email service
- **CORS** - Cross-origin resource sharing

## 📁 Project Structure

```
QuickTickets/
├── client/                 # React frontend
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context
│   │   ├── lib/           # Utility functions
│   │   └── assets/        # Asset imports
│   ├── package.json
│   └── vite.config.js
├── server/                 # Node.js backend
│   ├── configs/           # Database and service configs
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Custom middleware
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── inngest/          # Background jobs
│   ├── package.json
│   └── server.js
└── package.json           # Root package file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Stripe account for payments
- Clerk account for authentication
- Cloudinary account for image hosting
- Email service for notifications

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd QuickTickets
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install client dependencies
   cd client
   npm install

   # Install server dependencies
   cd ../server
   npm install
   ```

3. **Environment Setup**

   Create `.env` files in the `server` directory:

   ```env
   # Database
   MONGODB_URI=your_mongodb_connection_string

   # Clerk Authentication
   CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key

   # Stripe
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret

   # Email Service
   EMAIL_USER=your_email@example.com
   EMAIL_PASS=your_email_password

   # Inngest
   INNGEST_SIGNING_KEY=your_inngest_signing_key
   INNGEST_EVENT_KEY=your_inngest_event_key
   ```

4. **Start the development servers**

   ```bash
   # Start the backend server
   cd server
   npm run server

   # In a new terminal, start the frontend
   cd client
   npm run dev
   ```

5. **Access the application**

   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

## 📱 Usage

### For Users
1. **Browse Movies**: View featured movies and trailers on the homepage
2. **Select Movie**: Click on a movie to view details and available shows
3. **Choose Seats**: Select your preferred seats from the interactive layout
4. **Make Payment**: Complete booking with secure Stripe payment
5. **View Bookings**: Check your booking history in "My Bookings"

### For Admins
1. **Login**: Access admin panel at `/admin`
2. **Add Shows**: Create new movie shows with details
3. **Manage Shows**: View and update existing shows
4. **View Bookings**: Monitor all user bookings

## 🔧 Available Scripts

### Client
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Server
- `npm run server` - Start development server with nodemon
- `npm start` - Start production server

## 🚀 Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
3. Add environment variables in Vercel dashboard

### Backend (Vercel/Railway/Render)
1. Deploy the `server` directory
2. Set environment variables
3. Configure the build/start commands

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 📧 Contact

For questions or support, please contact the development team.

---

Built with ❤️ using React, Node.js, and modern web technologies.