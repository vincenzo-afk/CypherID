package com.cypherid.access;

import org.hyperledger.fabric.contract.ContractRouter;
import org.hyperledger.fabric.shim.ChaincodeServerProperties;
import org.hyperledger.fabric.shim.NettyChaincodeServer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.InetSocketAddress;
import java.util.Arrays;

/**
 * AccessControlChaincode — entry point for Fabric Java chaincode.
 * Classic and chaincode-as-a-service modes (see IdentityChaincode).
 */
public final class AccessControlChaincode {

    private static final Logger logger = LoggerFactory.getLogger(AccessControlChaincode.class);

    private AccessControlChaincode() {
    }

    public static void main(String[] args) throws Exception {
        logger.info("Starting CypherID Access Control Chaincode...");
        ContractRouter router = new ContractRouter(new String[]{ AccessControlContract.class.getName() });
        if (isCcaas(args)) {
            String host = getenv("CHAINCODE_SERVER_HOST", "0.0.0.0");
            int port = Integer.parseInt(getenv("CHAINCODE_SERVER_PORT", "7052"));
            ChaincodeServerProperties props = new ChaincodeServerProperties();
            props.setServerAddress(new InetSocketAddress(host, port));
            logger.info("Starting chaincode-as-a-service server on {}:{}", host, port);
            router.startRouterWithChaincodeServer(new NettyChaincodeServer(router, props));
        } else {
            router.start(args);
        }
    }

    private static boolean isCcaas(String[] args) {
        return Arrays.asList(args).contains("--ccaas")
                || !getenv("CHAINCODE_SERVER_ADDRESS", "").isBlank();
    }

    private static String getenv(String name, String def) {
        String v = System.getenv(name);
        return v != null ? v : def;
    }
}
