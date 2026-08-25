import dotenv from "dotenv";
dotenv.config();

import { pgPool } from "./pgClient";
import { PgUserRepository } from "../../../modules/users/infra/db/PgUserRepository";
import { PgRoleRepository } from "../../../modules/roles/infra/db/PgRoleRepository";
import { UserEmail } from "../../../modules/users/domain/valueObjects/UserEmail";

// One-time genesis script for AUTH-002. Every users/roles HTTP route now
// requires an already-authenticated, already-permissioned caller (see
// authorizationMiddleware.ts) — which means there is no way to create the
// very first Organisation Admin through the API. This script breaks that
// chicken-and-egg loop by talking to the repositories directly, never over
// HTTP, so RULE AUTH-05 ("every API request is authorised") stays true:
// this isn't an API request, it's an operator running a script with direct
// DB access (e.g. `fly ssh console` in production, or locally in dev).
//
// Usage:
//   npm run bootstrap:admin -- --email=you@company.com --firstName=Ada --lastName=Lovelace
// (or set BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_FIRST_NAME / BOOTSTRAP_ADMIN_LAST_NAME)
//
// Creates the user with status INVITED and the Organisation Admin role
// (org-wide, so — unlike every other role — no location/department scope is
// needed). Sign up through Clerk with the exact same email afterwards: the
// first authenticated request auto-links the Clerk identity and flips the
// user to ACTIVE (see authMiddleware.ts).

function parseArgs(argv: string[]): Record<string, string> {
    const args: Record<string, string> = {};
    for (const arg of argv) {
        const match = /^--([^=]+)=(.*)$/.exec(arg);
        if (match) args[match[1]] = match[2];
    }
    return args;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const email = args.email ?? process.env.BOOTSTRAP_ADMIN_EMAIL;
    const firstName = args.firstName ?? process.env.BOOTSTRAP_ADMIN_FIRST_NAME;
    const lastName = args.lastName ?? process.env.BOOTSTRAP_ADMIN_LAST_NAME;

    if (!email || !firstName || !lastName) {
        console.error(
            "Usage: npm run bootstrap:admin -- --email=you@company.com --firstName=Ada --lastName=Lovelace\n" +
                "(or set BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_FIRST_NAME / BOOTSTRAP_ADMIN_LAST_NAME)"
        );
        process.exitCode = 1;
        return;
    }

    const emailOrError = UserEmail.create(email);
    if (emailOrError.isFailure) {
        console.error(`❌ ${emailOrError.errorValue()}`);
        process.exitCode = 1;
        return;
    }

    const userRepo = new PgUserRepository();
    const roleRepo = new PgRoleRepository();

    const existing = await userRepo.findByEmail(emailOrError.getValue().value);
    if (existing) {
        console.error(
            `❌ A user with this email already exists (id ${existing.id}, status ${existing.status}). ` +
                "Use the API (once you have an admin session) to change their role instead of re-running this script."
        );
        process.exitCode = 1;
        return;
    }

    const adminRole = await roleRepo.findByCode("ADMINISTRATOR");
    if (!adminRole?.id) {
        console.error("❌ No ADMINISTRATOR role found — run `npm run db:migrate` first.");
        process.exitCode = 1;
        return;
    }

    const user = await userRepo.create({
        email: emailOrError.getValue().value,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        departmentId: null,
        locationId: null,
        roleIds: [adminRole.id],
    });

    console.log(`✅ Created Organisation Admin user ${user.id} (${user.email}), status ${user.status}.`);
    console.log("   Sign up via Clerk with this exact email — your first authenticated request will link the identity and activate the account.");
}

main()
    .catch((err) => {
        console.error("❌ Bootstrap failed:", err);
        process.exitCode = 1;
    })
    .finally(() => pgPool.end());
