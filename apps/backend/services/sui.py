import os
import logging
import httpx
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sui_service")

TATUM_API_KEY = os.getenv("TATUM_API_KEY", "")
PLATFORM_WALLET_ADDRESS = os.getenv("PLATFORM_WALLET_ADDRESS", "0x83e20df3bd995c697843818e6c7104b2b2b1735166b553e192f153a5c363980a")
SUI_MAINNET_RPC = os.getenv("SUI_MAINNET_RPC", "")
USDC_COIN_TYPE = os.getenv("USDC_COIN_TYPE", "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC")
USDC_DECIMALS = int(os.getenv("USDC_DECIMALS", "6"))

async def verify_payment(tx_digest: str, expected_price_usdc: float) -> bool:
    if not SUI_MAINNET_RPC:
        logger.error("SUI_MAINNET_RPC is not set in environment")
        return False
    expected_units = int(expected_price_usdc * (10 ** USDC_DECIMALS))
    logger.info(f"Verifying {tx_digest}. Expecting {expected_units} USDC units at {PLATFORM_WALLET_ADDRESS}")

    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "sui_getTransactionBlock",
        "params": [
            tx_digest,
            {
                "showEffects": True,
                "showInput": True,
                "showBalanceChanges": True
            }
        ]
    }

    headers = {"Content-Type": "application/json"}
    if TATUM_API_KEY:
        headers["x-api-key"] = TATUM_API_KEY

    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Querying Tatum SUI RPC: {SUI_MAINNET_RPC}")
            response = await client.post(
                SUI_MAINNET_RPC,
                headers=headers,
                json=payload,
                timeout=15.0
            )

            response.raise_for_status()
            res_json = response.json()

            if "error" in res_json:
                logger.error(f"Sui RPC error: {res_json['error']}")
                return False

            result = res_json.get("result", {})
            effects = result.get("effects", {})
            status = effects.get("status", {}).get("status")

            if status != "success":
                logger.error(f"Transaction status is not success: {status}")
                return False

            balance_changes = result.get("balanceChanges", [])
            platform_received = 0

            normalized_platform_address = PLATFORM_WALLET_ADDRESS.lower().strip()

            for change in balance_changes:
                owner = change.get("owner", {})
                address_owner = owner.get("AddressOwner", "")
                coin_type = change.get("coinType", "")

                is_platform_owner = address_owner.lower().strip() == normalized_platform_address
                if is_platform_owner and coin_type == USDC_COIN_TYPE:
                    amount_units = int(change.get("amount", "0"))
                    if amount_units > 0:
                        platform_received += amount_units

            logger.info(f"Platform received total USDC units: {platform_received}")

            if platform_received >= expected_units:
                logger.info(f"Transaction verified successfully: {platform_received} USDC units.")
                return True
            else:
                logger.error(f"Platform received {platform_received}, expected {expected_units}.")
                return False

        except Exception as e:
            logger.error(f"Error verifying USDC transaction: {str(e)}")
            return False
