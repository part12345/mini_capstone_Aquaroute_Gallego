# AquaRoute — Original Working Project Source

This repository combines the original AquaRoute Laravel API and React/Vite frontend supplied by the project owner. Application source files were copied from the supplied ZIP archives; the application code was not rewritten. Dependency folders and generated build output are omitted because they can be recreated locally. Real `.env` files are excluded to avoid publishing local credentials.

## Folder structure

- `backend/` — Laravel API source
- `frontend/` — React/Vite frontend source

## Requirements

- PHP and Composer compatible with the backend's `composer.json`
- MySQL/MariaDB
- Node.js and npm

## Run the backend

1. Create a MySQL database for AquaRoute (for example, `aquaroute`).
2. Open a terminal in `backend/`.
3. Install PHP dependencies:

   ```bash
   composer install
   ```

4. Copy `.env.example` to `.env` and update the database settings for your computer. Do not commit `.env`.
5. Generate the Laravel application key:

   ```bash
   php artisan key:generate
   ```

6. Run migrations and seeders if the project includes them:

   ```bash
   php artisan migrate --seed
   ```

7. Start the API:

   ```bash
   php artisan serve
   ```

## Run the frontend

1. Open another terminal in `frontend/`.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the Vite development server:

   ```bash
   npm run dev
   ```

4. If the project uses a frontend environment variable for the API URL, configure it using the project's existing conventions and point it to the local API URL.

## Before submission

- Test setup on your own computer after installing dependencies.
- Confirm the API URL and database settings match your environment.
- Test the customer, manager, and rider workflows.
- Add any separate course deliverables required by your instructor (such as ERD, API documentation, screenshots, presentation PDF, or demo video). These are not guaranteed to be included in this code package.

**Note:** This package preserves the original project source, but it has not been independently verified here with a fresh dependency install and full end-to-end test.
