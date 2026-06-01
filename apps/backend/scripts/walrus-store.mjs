import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { walrus, MAINNET_WALRUS_PACKAGE_CONFIG } from '@mysten/walrus';

async function main() {
  const privateKey = process.env.SUI_PRIVATE_KEY;
  if (!privateKey) {
    console.error(JSON.stringify({ error: 'SUI_PRIVATE_KEY not set' }));
    process.exit(1);
  }

  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const blob = Buffer.concat(chunks);

  const keypair = Ed25519Keypair.fromSecretKey(privateKey);
  const address = keypair.toSuiAddress();

  const client = new SuiJsonRpcClient({
    url: 'https://rpc.mainnet.sui.io:443',
    network: 'mainnet',
  });

  const walrusClient = client.$extend(
    walrus({
      packageConfig: MAINNET_WALRUS_PACKAGE_CONFIG,
      uploadRelay: {
        host: 'https://upload-relay.mainnet.walrus.space',
        sendTip: {
          address: '0x765a6ff2c13b47e2603416d0b5a156df498a5c51bc8085be3838e43e06086256',
        },
      },
    }),
  );

  const epochs = parseInt(process.env.WALRUS_EPOCHS || '5', 10);
  const { blobId } = await walrusClient.walrus.writeBlob({
    blob,
    epochs,
    signer: keypair,
    owner: address,
    deletable: false,
  });

  console.log(JSON.stringify({ blobId }));
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
});
