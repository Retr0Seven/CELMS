# CELMS - Campus Equipment Loan Management System

![CELMS Logo](https://img.shields.io/badge/CELMS-Equipment%20Loan%20Management-blue?style=for-the-badge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Issues](https://img.shields.io/github/issues/yourusername/CELMS)](https://github.com/yourusername/CELMS/issues)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/yourusername/CELMS/blob/main/CONTRIBUTING.md)

CELMS is a full-stack web application designed to manage equipment loans and reservations in educational environments. It streamlines the process of borrowing technical equipment, managing inventory, and handling maintenance tickets.## Prerequisites

## 📋 Features- [Node.js](https://nodejs.org/) (v14 or newer)

- [PostgreSQL](https://www.postgresql.org/) database (or use the included Docker setup)

- **Equipment Inventory Management**: Track and manage all available equipment- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) (optional, for containerized setup)

- **Loan Processing**: Handle equipment checkout and return workflows

- **Reservation System**: Allow users to reserve equipment in advance## Project Structure

- **Maintenance Ticketing**: Report and track equipment issues

- **User Management**: Different access levels for students, staff, and administrators- `celms-api`: Backend API server built with Express.js

- **Dashboard Analytics**: Overview of equipment usage and availability statistics- `celms-client`: Frontend React application

- `CELMS.sql`: Database schema

## 🚀 Tech Stack- `functions_and_seed.sql`: Database functions and seed data

### Frontend## Quick Start

- **React**: Frontend UI library

- **Bootstrap**: Responsive design framework### Using the Start Script

- **Context API**: State management

- **React Router**: Navigation and routingThe easiest way to run the project is to use the provided start script:

### Backend```

- **Node.js**: JavaScript runtime environment./start-celms.ps1

- **Express**: Web application framework```

- **PostgreSQL**: Relational database

- **JWT**: Authentication mechanismThis will start both the API server and client application in development mode.

### DevOps### Database Setup

- **Docker**: Containerization

- **Docker Compose**: Multi-container orchestrationBefore running the application for the first time, you should set up the database:

## 📸 Screenshots```

./setup-database.ps1

<table>```

  <tr>

    <td><img src="screenshots/dashboard.png" alt="Dashboard" width="100%"/></td>This script will:

    <td><img src="screenshots/inventory.png" alt="Inventory" width="100%"/></td>

  </tr>1. Start the PostgreSQL container if it's not running

  <tr>2. Create the database schema

    <td><img src="screenshots/loan-form.png" alt="Loan Form" width="100%"/></td>3. Add functions and seed data

    <td><img src="screenshots/maintenance.png" alt="Maintenance" width="100%"/></td>

  </tr>### Manual Setup

</table>

If you prefer to set up the components manually:

## 🛠️ Installation & Setup

1. **Set up the database**:

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or newer) ```

- [PostgreSQL](https://www.postgresql.org/) (or use the included Docker setup) docker-compose up -d

- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/) (optional) ```

### Database Setup This starts a PostgreSQL database using Docker.

````bash2. **Install backend dependencies**:

# Start the PostgreSQL database with Docker

docker-compose up -d   ```

   cd celms-api

# Initialize the database schema and seed data   npm install

# On Windows PowerShell:   ```

Get-Content -Path "CELMS.sql" | docker exec -i $(docker-compose ps -q postgres) psql -U postgres -d celms

Get-Content -Path "functions_and_seed.sql" | docker exec -i $(docker-compose ps -q postgres) psql -U postgres -d celms3. **Install frontend dependencies**:

````

````

### Backend Setup   cd celms-client

npm install

```bash   ```

# Navigate to the API directory

cd celms-api4. **Start the backend API**:



# Install dependencies   ```

npm install   cd celms-api

npm start

# Start the server   ```

npm start

```   The API will be available at http://localhost:3001



### Frontend Setup5. **Start the frontend application**:

````

````bash cd celms-client

# Navigate to the client directory   npm start

cd celms-client   ```

   The client will be available at http://localhost:3000

# Install dependencies

npm install## Stopping the Application



# Start the development serverTo stop all application components, you can use the provided stop script:

npm start

````

./stop-celms.ps1

## 🔑 Usage```

1. Access the application at: http://localhost:3000This will stop the running Node.js processes and Docker containers.

2. Login with the following demo credentials:

   - **Admin**: admin@celms.edu / admin123## Environment Variables

   - **Staff**: staff@celms.edu / staff123

   - **Student**: student@celms.edu / student123The API uses the following environment variables that can be set in a `.env` file in the `celms-api` directory:

## 🔍 Project Structure- `PORT`: API server port (default: 3001)

- `DB_HOST`: PostgreSQL host

```- `DB_PORT`: PostgreSQL port

CELMS/- `DB_NAME`: PostgreSQL database name

├── celms-api/ # Backend API server- `DB_USER`: PostgreSQL username

│ ├── db/ # Database connection and queries- `DB_PASSWORD`: PostgreSQL password

│ ├── middleware/ # Authentication and request handling middleware- `JWT_SECRET`: Secret key for JWT authentication

│ └── routes/ # API endpoints

├── celms-client/ # Frontend React application## License

│ ├── public/ # Static assets

│ └── src/[MIT License](LICENSE)

│ ├── components/ # React components
│ ├── contexts/ # React context providers
│ ├── hooks/ # Custom React hooks
│ ├── pages/ # Page components
│ └── services/ # API services
├── CELMS.sql # Database schema
└── functions_and_seed.sql # Database functions and seed data

```

## ⚙️ Environment Variables

### Backend (.env)

```

# Database connection

PGUSER=postgres
PGPASSWORD=your_password
PGHOST=localhost
PGPORT=5432
PGDATABASE=celms

# JWT configuration

JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=24h

# Server configuration

PORT=3001
NODE_ENV=development

```

### Frontend (.env)

```

PORT=3000
REACT_APP_API_URL=http://localhost:3001

````

## 🧪 Testing

```bash
# Run backend tests
cd celms-api
npm test

# Run frontend tests
cd celms-client
npm test
````

## 🔧 Future Improvements

- Implement barcode scanning for equipment checkout
- Add email notifications for due dates and reservation approvals
- Integrate with calendar systems for scheduling
- Add reporting features for usage analytics
- Implement real-time updates with WebSockets

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

- Your Name - [GitHub Profile](https://github.com/YourUsername)

## 🙏 Acknowledgements

- [React](https://reactjs.org/)
- [Express](https://expressjs.com/)
- [PostgreSQL](https://www.postgresql.org/)
- [Bootstrap](https://getbootstrap.com/)
- [Docker](https://www.docker.com/)
