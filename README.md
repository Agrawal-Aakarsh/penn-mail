# PennMail

Redefining email for Penn Students.

PennMail is a powerful email assistant that helps Penn students stay organized and never miss important information. The app intelligently sorts your inbox into actionable categories: "Read" for emails that need your attention but aren't urgent, "Do" for emails requiring immediate response or action, and "Archive" for emails that can be filed away. Beyond basic organization, PennMail categorizes your emails into three key buckets: Classes (course-related communications, assignments, and announcements), Clubs (student organization updates and events), and Career (internship opportunities, job postings, and professional development events). The app leverages AI to generate concise bullet-point summaries of your emails, highlighting key takeaways and deadlines. Most importantly, PennMail automatically syncs important dates and deadlines to your Google Calendar, ensuring you never miss an info session, assignment deadline, or club meeting. This smart integration of email management, content categorization, AI-powered summaries, and calendar synchronization makes PennMail an essential tool for busy Penn students to stay on top of their academic and extracurricular commitments.

## Features

- 📧 Modern email interface with intuitive design
- 🌓 Dark mode support
- ✍️ Rich text email composition
- 🔒 Google OAuth integration
- 📱 Responsive design
- ⚡ Fast and efficient performance

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Google OAuth credentials

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd penn-mail
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   VITE_API_URL=http://localhost:3001
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Project Structure

- `/app` - Main application components and layouts
- `/server` - Backend server code
- `/src` - Source files and utilities
- `/public` - Static assets

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Tech Stack

- React 19
- TypeScript
- Vite
- TailwindCSS
- Tiptap for rich text editing
- Google OAuth for authentication
- Radix UI components

## Development Guidelines

1. Follow the existing code style and formatting
2. Write clean, maintainable code
3. Use TypeScript types appropriately
4. Test changes in both light and dark modes
5. Ensure responsive design works across different screen sizes

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request
4. Ensure all tests pass and code meets quality standards

## Environment Setup Notes

- Ensure you have the correct Google OAuth credentials
- The application expects a backend server running on port 3001
- Configure your IDE to use the project's ESLint and TypeScript settings

## Troubleshooting

If you encounter any issues:

1. Ensure all dependencies are installed
2. Verify environment variables are set correctly
3. Clear your browser cache
4. Check console for error messages


## Contact

aakarsh@wharton.upenn.edu
