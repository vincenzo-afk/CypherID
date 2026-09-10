package com.cypherid.identity.service.bootstrap;

import com.cypherid.identity.service.domain.User;
import com.cypherid.identity.service.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * AdminBootstrapRunner — seeds a single default SUPER_ADMIN account on first
 * boot so the platform has *some* way in.
 * <p>
 * Nothing else in this codebase creates one: {@code POST /api/v1/identity/did}
 * (the only registration path) always sets clearance_level = UNCLASSIFIED
 * (see IdentityManagementService#createDID), and there is no seed row in the
 * Flyway migrations. Without this, no DID could ever satisfy the
 * {@code roles.contains("ADMIN")}/{@code "SUPER_ADMIN"} checks used by every
 * *AdminController — the admin surface of the app was unreachable by anyone.
 * <p>
 * Runs once: if a SUPER_ADMIN already exists (e.g. promoted via direct DB
 * access, or this ran on a previous boot against the same Postgres volume),
 * this is a no-op. Change the seeded password after first login — there is
 * no forced-rotation flow yet, so this is on the honor system for a demo/dev
 * deployment only. Do not rely on this in anything resembling production.
 */
@Component
public class AdminBootstrapRunner implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(AdminBootstrapRunner.class);

    /** Matches the (previously unused) ADMIN_DID constant in IdentityManagementService. */
    public static final String DEFAULT_ADMIN_DID = "did:cypherid:admin:root";
    private static final String DEFAULT_ADMIN_PASSWORD = "CypherID@Admin2026!";
    private static final String DEFAULT_ADMIN_ORG = "BEL";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminBootstrapRunner(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        boolean superAdminExists = userRepository.findAll().stream()
                .anyMatch(u -> "SUPER_ADMIN".equals(u.getClearanceLevel()));
        if (superAdminExists) {
            logger.info("SUPER_ADMIN account already present — skipping admin bootstrap.");
            return;
        }
        if (userRepository.existsByDid(DEFAULT_ADMIN_DID)) {
            // A row exists at this DID but without SUPER_ADMIN clearance (e.g. it
            // was edited by hand). Don't silently overwrite someone's changes.
            logger.warn("A user already exists at {} without SUPER_ADMIN clearance — " +
                    "not overwriting it. Promote a user manually via SQL if you need admin access.",
                    DEFAULT_ADMIN_DID);
            return;
        }

        User admin = new User();
        admin.setDid(DEFAULT_ADMIN_DID);
        admin.setPasswordHash(passwordEncoder.encode(DEFAULT_ADMIN_PASSWORD));
        admin.setOrganization(DEFAULT_ADMIN_ORG);
        admin.setDepartment("Platform Administration");
        admin.setClearanceLevel("SUPER_ADMIN");
        admin.setStatus("ACTIVE");
        userRepository.save(admin);

        logger.warn("============================================================");
        logger.warn(" CypherID: seeded a default SUPER_ADMIN account (first boot)");
        logger.warn("   DID:      {}", DEFAULT_ADMIN_DID);
        logger.warn("   Password: {}", DEFAULT_ADMIN_PASSWORD);
        logger.warn(" Log in with these at the /login page, then use the Admin");
        logger.warn(" Panel to register orgs / assign roles to other accounts.");
        logger.warn(" This is a DEV-ONLY convenience — there is no forced password");
        logger.warn(" rotation, so treat this account as compromised in anything");
        logger.warn(" beyond a local demo.");
        logger.warn("============================================================");
    }
}
