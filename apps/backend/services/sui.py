import os
import logging
import httpx
from decimal import Decimal, ROUND_HALF_UP
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sui_service")

TATUM_API_KEY = os.getenv("TATUM_API_KEY", "")
PLATFORM_WALLET_ADDRESS = os.getenv("PLATFORM_WALLET_ADDRESS", "0x83e20df3bd995c697843818e6c7104b2b2b1735166b553e192f153a5c363980a")
SUI_MAINNET_RPC = os.getenv("SUI_MAINNET_RPC", "")
USDC_COIN_TYPE = os.getenv("USDC_COIN_TYPE", "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC")
USDC_DECIMALS = int(os.getenv("USDC_DECIMALS", "6"))

def _to_base_units(amount: float) -> int:
    scale = Decimal(10) ** USDC_DECIMALS
    return int((Decimal(str(amount)) * scale).quantize(Decimal("1"), rounding=ROUND_HALF_UP))

def _owner_address(owner: dict) -> str:
    if not isinstance(owner, dict):
        return ""
    return (
        owner.get("AddressOwner")
        or owner.get("ObjectOwner")
        or owner.get("address")
        or ""
    ).lower().strip()

async def verify_payment(
    tx_digest: str,
    expected_price_usdc: float,
    buyer_address: str,
    seller_address: str,
) -> bool:
    if not SUI_MAINNET_RPC:
        logger.error("SUI_MAINNET_RPC is not set in environment")
        return False
    expected_units = _to_base_units(expected_price_usdc)
    expected_commission = expected_units * 5 // 100
    expected_seller = expected_units - expected_commission
    normalized_buyer_address = buyer_address.lower().strip()
    normalized_seller_address = seller_address.lower().strip()
    normalized_platform_address = PLATFORM_WALLET_ADDRESS.lower().strip()
    logger.info(
        "Verifying %s. Expecting %s USDC units: buyer=%s seller=%s platform=%s.",
        tx_digest,
        expected_units,
        normalized_buyer_address,
        normalized_seller_address,
        normalized_platform_address,
    )

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
            sender = result.get("transaction", {}).get("data", {}).get("sender", "").lower().strip()

            if status != "success":
                logger.error(f"Transaction status is not success: {status}")
                return False

            if sender and sender != normalized_buyer_address:
                logger.error("Transaction sender mismatch: sender=%s expected=%s", sender, normalized_buyer_address)
                return False

            balance_changes = result.get("balanceChanges", [])
            total_positive = 0
            platform_received = 0
            seller_received = 0
            buyer_spent = 0

            for change in balance_changes:
                coin_type = change.get("coinType", "")
                if coin_type != USDC_COIN_TYPE:
                    continue
                amount_units = int(change.get("amount", "0"))
                owner_address = _owner_address(change.get("owner", {}))
                if amount_units > 0:
                    total_positive += amount_units
                    if owner_address == normalized_platform_address:
                        platform_received += amount_units
                    if owner_address == normalized_seller_address:
                        seller_received += amount_units
                elif owner_address == normalized_buyer_address:
                    buyer_spent += abs(amount_units)

            logger.info(
                "USDC changes: total_positive=%s buyer_spent=%s seller_received=%s platform_received=%s",
                total_positive,
                buyer_spent,
                seller_received,
                platform_received,
            )

            if (
                total_positive >= expected_units
                and buyer_spent >= expected_units
                and seller_received >= expected_seller
                and platform_received >= expected_commission
            ):
                logger.info(f"Transaction verified successfully.")
                return True
            else:
                logger.error(
                    "Verification failed: total=%s buyer=%s seller=%s platform=%s expected_total=%s expected_seller=%s expected_commission=%s.",
                    total_positive,
                    buyer_spent,
                    seller_received,
                    platform_received,
                    expected_units,
                    expected_seller,
                    expected_commission,
                )
                return False

        except Exception as e:
            logger.error(f"Error verifying USDC transaction: {str(e)}")
            return False
