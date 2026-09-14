import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createUsersWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Creates (or brings back in line) the two admin logins and their roles.
 *
 * Run with:
 *   npx medusa exec ./src/scripts/setup-admin-users.ts \
 *     <super-admin-email> <super-admin-password> <manager-email> <manager-password>
 *
 * Passwords are arguments rather than constants so they never land in git.
 *
 * Idempotent: an existing user keeps its id, has its password reset to the one
 * given, and is left holding exactly the role named here. The Manager role's
 * permissions are reset to MANAGER_POLICIES on every run, so this file is the
 * record of what a manager can do — edit here, not only in the admin.
 *
 * Needs RBAC enabled (medusa-config.ts) and migrated.
 */

const SUPER_ADMIN_ROLE_ID = "role_super_admin";
const MANAGER_ROLE_NAME = "Manager";

const crud = (...resources: string[]) =>
  resources.flatMap((r) => ["create", "read", "update", "delete"].map((op) => `${r}:${op}`));
const read = (...resources: string[]) => resources.map((r) => `${r}:read`);

/**
 * Full control of products and stock; read-only on categories and orders.
 * Everything else — customers, promotions, price lists, settings, users,
 * reviews — is absent, so those pages and APIs refuse the manager.
 */
const MANAGER_POLICIES = [
  ...crud(
    "product",
    "product_variant",
    "product_option",
    "product_option_value",
    "price",
    "inventory_item",
    "inventory_level",
    "reservation_item",
    // Product image uploads.
    "file"
  ),
  ...read("product_category", "order"),
  // An order's detail page loads these alongside the order itself.
  ...read(
    "order_item",
    "order_change",
    "payment_collection",
    "payment",
    "fulfillment",
    "return",
    "order_claim",
    "order_exchange"
  ),
  // Reference data the product and inventory forms need in order to render.
  ...read(
    "product_tag",
    "product_type",
    "product_collection",
    "sales_channel",
    "stock_location",
    "shipping_profile",
    "region",
    "currency",
    "store",
    "price_preference"
  ),
];

export default async function setupAdminUsers({ container, args }: ExecArgs) {
  const [superEmail, superPassword, managerEmail, managerPassword] = args;

  if (!superEmail || !superPassword || !managerEmail || !managerPassword) {
    throw new Error(
      "Usage: setup-admin-users.ts <super-admin-email> <super-admin-password> " +
        "<manager-email> <manager-password>"
    );
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const rbac = container.resolve(Modules.RBAC);
  const userModule = container.resolve(Modules.USER);
  const authModule = container.resolve(Modules.AUTH);

  // ---- Manager role ----
  const policies = await rbac.listRbacPolicies({ key: MANAGER_POLICIES });
  const found = new Set(policies.map((p) => p.key));
  const missing = MANAGER_POLICIES.filter((key) => !found.has(key));

  if (missing.length) {
    throw new Error(
      `Unknown permissions: ${missing.join(", ")}. Start the backend once so ` +
        `policies are synced, or fix the key.`
    );
  }

  let [managerRole] = await rbac.listRbacRoles({ name: MANAGER_ROLE_NAME });

  if (!managerRole) {
    managerRole = await rbac.createRbacRoles({
      name: MANAGER_ROLE_NAME,
      description: "Products and inventory; read-only categories and orders.",
    });
  }

  const wantedPolicyIds = new Set(policies.map((p) => p.id));
  const current = await rbac.listRbacRolePolicies({ role_id: managerRole.id });
  const currentPolicyIds = new Set(current.map((rp) => rp.policy_id));

  const stale = current.filter((rp) => !wantedPolicyIds.has(rp.policy_id));
  if (stale.length) {
    await rbac.deleteRbacRolePolicies(stale.map((rp) => rp.id));
  }

  const toAdd = policies.filter((p) => !currentPolicyIds.has(p.id));
  if (toAdd.length) {
    await rbac.createRbacRolePolicies(
      toAdd.map((p) => ({ role_id: managerRole.id, policy_id: p.id }))
    );
  }

  logger.info(
    `Role "${MANAGER_ROLE_NAME}": ${policies.length} permissions ` +
      `(+${toAdd.length}, -${stale.length}).`
  );

  // ---- users ----
  const ensureUser = async (email: string, password: string, roleId: string) => {
    let [user] = await userModule.listUsers({ email });

    if (!user) {
      const { result } = await createUsersWorkflow(container).run({
        input: { users: [{ email, roles: [roleId] }] },
      });
      user = result[0];
    }

    const [identity] = await authModule.listProviderIdentities({
      entity_id: email,
      provider: "emailpass",
    });

    if (identity) {
      const { error } = await authModule.updateProvider("emailpass", {
        entity_id: email,
        password,
      });
      if (error) {
        throw new Error(`Could not set password for ${email}: ${error}`);
      }
      await authModule.updateAuthIdentities({
        id: identity.auth_identity_id!,
        app_metadata: { user_id: user.id },
      });
    } else {
      const { authIdentity, error } = await authModule.register("emailpass", {
        body: { email, password },
      });
      if (error || !authIdentity) {
        throw new Error(`Could not register ${email}: ${error}`);
      }
      await authModule.updateAuthIdentities({
        id: authIdentity.id,
        app_metadata: { user_id: user.id },
      });
    }

    const { data } = await query.graph({
      entity: "user",
      fields: ["rbac_roles.id"],
      filters: { id: user.id },
    });
    // `rbac_roles` comes from a feature-flagged link the generated types omit.
    const heldRoleIds: string[] = ((data[0] as any)?.rbac_roles ?? []).map(
      (r: { id: string }) => r.id
    );

    for (const heldRoleId of heldRoleIds.filter((id) => id !== roleId)) {
      await link.dismiss({
        [Modules.USER]: { user_id: user.id },
        [Modules.RBAC]: { rbac_role_id: heldRoleId },
      });
    }

    if (!heldRoleIds.includes(roleId)) {
      await link.create({
        [Modules.USER]: { user_id: user.id },
        [Modules.RBAC]: { rbac_role_id: roleId },
      });
    }

    logger.info(`${email} → ${roleId === SUPER_ADMIN_ROLE_ID ? "Super Admin" : MANAGER_ROLE_NAME}`);
  };

  await ensureUser(superEmail, superPassword, SUPER_ADMIN_ROLE_ID);
  await ensureUser(managerEmail, managerPassword, managerRole.id);

  logger.info("Admin users ready. Users with no role can no longer use the admin.");
}
