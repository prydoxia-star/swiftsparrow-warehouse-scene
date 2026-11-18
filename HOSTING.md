# Hosting SwiftSparrow as a website

SwiftSparrow is a Vite + React client-side application. The warehouse scene and current Zustand simulation run in the browser, so the current demo can be hosted as a static website. It does not currently require a server or database.

## Option 1: Vercel (recommended)

1. Create a GitHub repository and upload this project folder.
2. Sign in to [Vercel](https://vercel.com/) and choose **Add New → Project**.
3. Import the GitHub repository.
4. Use these build settings:
   - Framework preset: **Vite**
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output directory: `dist`
5. Choose **Deploy**. Vercel will provide a public URL, for example `your-project.vercel.app`.
6. Future pushes to the connected GitHub branch will trigger a new deployment automatically.

## Option 2: Netlify

1. Push the project to GitHub.
2. Sign in to [Netlify](https://www.netlify.com/) and choose **Add new site → Import an existing project**.
3. Connect the GitHub repository.
4. Set the build command to `npm run build` and publish directory to `dist`.
5. Deploy the site. Netlify will provide a public URL and can redeploy when you push changes.

## Option 3: Publish a build manually

1. Open the project folder in VS Code.
2. Install packages and create the production build:

   ```powershell
   npm.cmd install
   npm.cmd run build
   ```

3. Vite creates a `dist/` folder. Upload the contents of `dist/` to any static web host that serves HTML, CSS, JavaScript and asset files.

## Important notes

- Do not upload `node_modules/`; the host installs dependencies from `package.json` during deployment.
- The current warehouse records, traffic and two-second status simulation are demo data running in the browser. They reset when the page is refreshed and are not shared between visitors.
- For real multi-user warehouse operations, connect the app to a backend API and database, then replace the demo data/store actions with server-backed data and authentication.
- Keep `src/data/` as the domain model; physical 3D placement remains in `src/scene/warehouse-scene-data.ts`.
