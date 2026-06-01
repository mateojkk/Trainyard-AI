import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { walrus, MAINNET_WALRUS_PACKAGE_CONFIG } from '@mysten/walrus';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const privateKey = process.env.SUI_PRIVATE_KEY;
    if (!privateKey) {
      return res.status(500).json({ error: 'SUI_PRIVATE_KEY environment variable is not set' });
    }

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const blob = Buffer.concat(chunks);

    if (blob.length === 0) {
      return res.status(400).json({ error: 'Empty payload' });
    }

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

    return res.status(200).json({ blobId });
  } catch (error) {
    console.error('Vercel Walrus Upload Function Error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
