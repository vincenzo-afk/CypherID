package com.cypherid.asset;

import org.hyperledger.fabric.contract.ContractRouter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * AssetChaincode — entry point for Fabric Java chaincode.
 */
public final class AssetChaincode {

    private static final Logger logger = LoggerFactory.getLogger(AssetChaincode.class);

    private AssetChaincode() {
    }

    public static void main(String[] args) {
        logger.info("Starting CypherID Asset Registry Chaincode...");
        new ContractRouter(new String[]{ AssetContract.class.getName() }).start(args);
    }
}
