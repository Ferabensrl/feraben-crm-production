# Feraben CRM

This project is a React application using Supabase as the backend. Below are instructions for setting up the project for development and deploying it.

## Installation

1. Install Node.js (version 16 or later).
2. Clone this repository.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file based on `.env.example` and add your Supabase credentials.

## Development

To start the project locally with hot reloading:

```bash
npm start
```

This will start the app on `http://localhost:3000`.

To run tests, run:

```bash
npm test
```

This executes the Jest test suite.

## Build

To create an optimized production build:

```bash
npm run build
```

The build output will be in the `build` directory.

## Deployment

The project can be deployed to any static hosting service. For Vercel, deployment configuration is provided in `vercel.json`.

1. Ensure you have set the environment variables on your hosting platform using the keys from `.env`.
2. Upload or connect the `build` directory to your hosting provider.

