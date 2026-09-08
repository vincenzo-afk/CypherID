package com.cypherid.identity.service.demo;

import com.cypherid.identity.service.domain.User;
import com.cypherid.identity.service.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

/**
 * Seeds demo users into the H2 database at startup.
 * Only active when the "demo" profile is enabled.
 *
 * Demo accounts:
 *   Admin:  did:cypherid:admin:root   / CypherID@2026!
 *   Arjun:  did:cypherid:arjun        / CypherID@2026!  (DRDO, SECRET clearance)
 *   Priya:  did:cypherid:priya        / CypherID@2026!  (BEL, no clearance)
 */
@Configuration
@Profile("demo")
public class DemoDataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);
    private static final String DEFAULT_PASSWORD = "CypherID@2026!";

    @Bean
    CommandLineRunner seedDemoData(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            seedUser(userRepository, passwordEncoder,
                    "did:cypherid:admin:root", "CypherID", "System",
                    "SUPER_ADMIN,ORG_ADMIN", "ACTIVE");

            seedUser(userRepository, passwordEncoder,
                    "did:cypherid:arjun", "DRDO", "Cybersecurity",
                    "ORG_MEMBER,CLEARANCE_LEVEL_3,SECRET", "ACTIVE");

            seedUser(userRepository, passwordEncoder,
                    "did:cypherid:priya", "BEL", "Engineering",
                    "ORG_MEMBER,UNCLASSIFIED,CLEARANCE_LEVEL_1", "ACTIVE");

            log.info("Demo data seeded: {} users created", userRepository.count());
        };
    }

    private void seedUser(UserRepository repo, PasswordEncoder encoder,
                          String did, String org, String dept,
                          String clearance, String status) {
        Optional<User> existing = repo.findByDid(did);
        if (existing.isPresent()) {
            log.info("User {} already exists, skipping", did);
            return;
        }
        User user = new User();
        user.setDid(did);
        user.setPasswordHash(encoder.encode(DEFAULT_PASSWORD));
        user.setOrganization(org);
        user.setDepartment(dept);
        user.setClearanceLevel(clearance);
        user.setStatus(status);
        repo.save(user);
        log.info("Seeded user: {} (org={}, clearance={})", did, org, clearance);
    }
}
