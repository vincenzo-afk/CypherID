package com.cypherid.access;

import org.hyperledger.fabric.contract.ContractRouter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * AccessControlChaincode — entry point for Fabric Java chaincode.
 */
public final class AccessControlChaincode {

    private static final Logger logger = LoggerFactory.getLogger(AccessControlChaincode.class);

    private AccessControlChaincode() {
    }

    public static void main(String[] args) {
        logger.info("Starting CypherID Access Control Chaincode...");
        new ContractRouter(new String[]{ AccessControlContract.class.getName() }).start(args);
    }
}
