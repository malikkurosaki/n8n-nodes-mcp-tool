import fs from 'fs/promises';
import { execSync } from 'child_process'

async function init() {
    console.log("[INIT] Initializing...")

    try {
        await fs.access(".env")
    } catch (error) {
        let envText = ""
        envText += "NAMESPACE=\n"
        envText += "OPENAPI_URL=\n"
        // generate .env
        await fs.writeFile(".env", envText)
        console.log('[GEN] Generated .env');
    }

    const NAMESPACE = process.env.NAMESPACE
    const OPENAPI_URL = process.env.OPENAPI_URL

    if (!NAMESPACE || !OPENAPI_URL) {
        throw new Error('NAMESPACE and OPENAPI_URL are required')
    }

    await fs.rmdir("src", { recursive: true }).catch(() => { })

    try {
        await fs.access(".git")

        console.log("[INIT] Git already initialized")
        execSync("rm -rf .git")
        execSync("git init")
    } catch (error) {
        execSync("git init")
    }

    try {
        console.log("[INIT] Gitignored...")
        await fs.access(".gitignore")
    } catch (e) {

        execSync("npx -y gitignore node")
        console.log('[INIT] gitignored');
    }

    try {
        console.log("[INIT] Npmignored...")
        await fs.access(".npmignore")
    } catch (e) {

        execSync("npx -y npmignore node")
        console.log('[INIT] npmignored');
    }

    console.log('[INIT] Installing dependencies...');
    execSync("bun install", { stdio: 'inherit' })


}

init()
