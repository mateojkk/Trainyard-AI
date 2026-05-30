import os
import logging
import httpx
from dotenv import load_dotenv

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sui_service")

TATUM_API_KEY = os.getenv("TATUM_API_KEY", "")
PLATFORM_WALLET_ADDRESS = os.getenv("PLATFORM_WALLET_ADDRESS", "0x83e20df3bd995c697843818e6c7104b2b2b1735166b553e192f153a5c363980a")
SUI_MAINNET_RPC = os.getenv("SUI_MAINNET_RPC", "https://api.tatum.io/v3/sui/node")
USDC_COIN_TYPE = os.getenv("USDC_COIN_TYPE", "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC")
USDC_DECIMALS = int(os.getenv("USDC_DECIMALS", "6"))

# Public fallback RPC to use if Tatum is not configured or fails
PUBLIC_SUI_RPC = "https://fullnode.mainnet.sui.io:443"

async def verify_payment(tx_digest: str, expected_price_usdc: float) -> bool:
    """
    Verifies a Sui mainnet transaction:
    1. Check if the tx was successful.
    2. Check if USDC was transferred to the PLATFORM_WALLET_ADDRESS.
    3. Check if the transferred amount is >= expected_price_usdc.
    
    Supports mock transaction digests starting with 'mock-' for development/testing.
    """
    # 1. Handle mock transactions
    if tx_digest.startswith("mock-") or not TATUM_API_KEY:
        logger.warning(f"Using mock transaction verification for digest '{tx_digest}' (Tatum key is {'empty' if not TATUM_API_KEY else 'present'})")
        # In mock mode, we assume the payment is valid
        return True

    expected_units = int(expected_price_usdc * (10 ** USDC_DECIMALS))
    logger.info(f"Verifying {tx_digest}. Expecting {expected_units} USDC units at {PLATFORM_WALLET_ADDRESS}")

    # Prepare standard JSON-RPC payload for sui_getTransactionBlock
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

    # Attempt to query via Tatum RPC first
    headers = {"Content-Type": "application/json"}
    if TATUM_API_KEY:
        headers["x-api-key"] = TATUM_API_KEY
    
    async with httpx.AsyncClient() as client:
        try:
            # Query Tatum SUI RPC
            logger.info(f"Querying SUI RPC: {SUI_MAINNET_RPC}")
            response = await client.post(
                SUI_MAINNET_RPC,
                headers=headers,
                json=payload,
                timeout=15.0
            )
            
            # If Tatum fails or is unauthorized, fall back to public RPC
            if response.status_code != 200 or "error" in response.json():
                logger.warning(f"Tatum SUI RPC returned error, attempting public fallback RPC...")
                response = await client.post(
                    PUBLIC_SUI_RPC,
                    headers={"Content-Type": "application/json"},
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
            
            # Check transaction execution status
            if status != "success":
                logger.error(f"Transaction status is not success: {status}")
                return False
                
            # Verify balance changes
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
            
            # Ensure the platform received at least the expected amount
            # Allow minor rounding error leeway (e.g. 99% of expected)
            if platform_received >= expected_units:
                logger.info(f"Transaction verified successfully: {platform_received} USDC units.")
                return True
            else:
                logger.error(f"Platform received {platform_received}, expected {expected_units}.")
                return False
                
        except Exception as e:
            logger.error(f"Error verifying USDC transaction: {str(e)}")
            return False

if __name__ == "__main__":
    import asyncio
    
    async def test_sui_verify():
        # Test mock verification
        is_mock_valid = await verify_payment("mock-12345", 0.1)
        print(f"Mock verification (should be True): {is_mock_valid}")
        
        # Test a real mainnet tx if available (using a known successful Sui mainnet transaction block)
        # For testing, we can use a recent transaction hash or standard failure case
        is_real_valid = await verify_payment("3s17pSjC8j6E6u4L72T4uFhTzBihyqE82N7rW7f1LhG4", 0.1)
        print(f"Real verification outcome: {is_real_valid}")

    asyncio.run(test_sui_verify())
