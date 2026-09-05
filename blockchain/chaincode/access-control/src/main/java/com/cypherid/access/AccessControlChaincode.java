package com.cypherid.access;

import org.hyperledger.fabric.contract.ContractRouter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * AccessControlChaincode — entry point for Fabric Java chaincode.
 */
public class AccessControlChaincode extends ContractRouter {

    private static final Logger logger = LoggerFactory.getLogger(AccessControlChaincode.class);

    public AccessControlChaincode() {
        super(new String[]{ AccessControlContract.class.getName() });
    }

    public static void main(String[] args) {
        logger.info("Starting CypherID Access Control Chaincode...");
        new AccessControlChaincode().start(args);
    }
}
