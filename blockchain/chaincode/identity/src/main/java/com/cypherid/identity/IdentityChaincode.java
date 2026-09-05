package com.cypherid.identity;

import org.hyperledger.fabric.shim.ChaincodeBase;
import org.hyperledger.fabric.shim.ChaincodeStub;
import org.hyperledger.fabric.contract.ContractRouter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * IdentityChaincode — entry point for Hyperledger Fabric Java chaincode.
 *
 * This class bootstraps the ContractRouter which routes invocations
 * to the annotated IdentityContract methods.
 */
public class IdentityChaincode extends ContractRouter {

    private static final Logger logger = LoggerFactory.getLogger(IdentityChaincode.class);

    public IdentityChaincode() {
        super(new String[]{ IdentityContract.class.getName() });
    }

    public static void main(String[] args) {
        logger.info("Starting CypherID Identity Chaincode...");
        new IdentityChaincode().start(args);
    }
}
