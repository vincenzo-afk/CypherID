package com.cypherid.identity;

import org.hyperledger.fabric.contract.ContractRouter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * IdentityChaincode — entry point for Hyperledger Fabric Java chaincode.
 *
 * This class bootstraps the ContractRouter which routes invocations
 * to the annotated IdentityContract methods.
 */
public final class IdentityChaincode {

    private static final Logger logger = LoggerFactory.getLogger(IdentityChaincode.class);

    private IdentityChaincode() {
    }

    public static void main(String[] args) {
        logger.info("Starting CypherID Identity Chaincode...");
        new ContractRouter(new String[]{ IdentityContract.class.getName() }).start(args);
    }
}
