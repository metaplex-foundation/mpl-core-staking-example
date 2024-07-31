import { createSignerFromKeypair, signerIdentity, publicKey } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { fetchAsset } from '@metaplex-foundation/mpl-core'

import wallet from "../wallet.json";

const umi = createUmi("https://api.devnet.solana.com", "finalized")

let keyair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const myKeypairSigner = createSignerFromKeypair(umi, keyair);
umi.use(signerIdentity(myKeypairSigner));

(async () => {
    // Pass and Fetch the Asset
    const asset = publicKey("Eg6rPUNMS3GvtMqiNRv6bf7GurUGKxqevmdZSQ2ErTvn");
    const fetchedAsset = await fetchAsset(umi, asset);
    console.log("\nThis is the current state of your Asset Attribute Plugin: ", fetchedAsset.attributes);
})();