package com.cypherid.asset;

import org.hyperledger.fabric.contract.ContractRouter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * AssetChaincode — entry point for Fabric Java chaincode.
 */
public class AssetChaincode extends ContractRouter {

    private static final Logger logger = LoggerFactory.getLogger(AssetChaincode.class);

    public AssetChaincode() {
        super(new String[]{ AssetContract.class.getName() });
    }

    public static void main(String[] args) {
        logger.info("Starting CypherID Asset Registry Chaincode...");
        new AssetChaincode().start(args);
    }
}
