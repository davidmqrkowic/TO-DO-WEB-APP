# TO-DO-WEB-APP (Mini Trello)

Full-stack web application for a seminar project.

## Tech stack
- Frontend: React (Vite)
- Backend: Node.js (Express)
- Database: PostgreSQL

## Repository structure
- /client - frontend
- /server - backend

## Configuration
Environment variables are stored in `.env` files (not committed).

### Example `.env` (server)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=todo_db
DB_USER=postgres
DB_PASS=YOUR_PASSWORD

PORT=4001
CORS_ORIGIN=http://localhost:5173

JWT_SECRET=someVeryLongRandomSecretKey123!@
NODE_ENV=development
```

## Run (dev)
Backend:
```bash
cd server
npm install
npm install express cors dotenv sequelize pg pg-hstore bcrypt jsonwebtoken zod
npm install --save-dev nodemon
npm run dev
```

Frontend:
```bash
cd client
npm install
npm run dev
```
