package com.cypherid.asset.service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * CypherID Asset Service (port 8083)
 * Handles asset upload/mint/transfer/burn, AES-256-GCM encryption,
 * IPFS storage, and (later) protected content delivery.
 */
@SpringBootApplication
public class AssetServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AssetServiceApplication.class, args);
    }
}