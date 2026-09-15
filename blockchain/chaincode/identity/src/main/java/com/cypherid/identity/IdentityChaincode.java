package com.cypherid.identity;

import org.hyperledger.fabric.contract.ContractRouter;
import org.hyperledger.fabric.shim.ChaincodeServerProperties;
import org.hyperledger.fabric.shim.NettyChaincodeServer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.InetSocketAddress;
import java.util.Arrays;

/**
 * IdentityChaincode — entry point for Hyperledger Fabric Java chaincode.
 *
 * Two modes (the 2.5 peer image only ships the ccaas external builder, so
 * production runs here are chaincode-as-a-service):
 * <ul>
 *   <li>classic: {@code java -jar ...} with CORE_CHAINCODE_* env (peer-managed)</li>
 *   <li>ccaas server: {@code --ccaas} arg or CHAINCODE_SERVER_ADDRESS env set —
 *       serves on CHAINCODE_SERVER_HOST/PORT for peers to dial (connection.json)</li>
 * </ul>
 */
public final class IdentityChaincode {

    private static final Logger logger = LoggerFactory.getLogger(IdentityChaincode.class);

    private IdentityChaincode() {
    }

    public static void main(String[] args) throws Exception {
        logger.info("Starting CypherID Identity Chaincode...");
        ContractRouter router = new ContractRouter(new String[]{ IdentityContract.class.getName() });
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
