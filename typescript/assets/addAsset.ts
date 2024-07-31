import { generateSigner, createSignerFromKeypair, signerIdentity, publicKey } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { create, fetchCollection } from '@metaplex-foundation/mpl-core'
import { base58 } from '@metaplex-foundation/umi/serializers';

import wallet from "../wallet.json";

const umi = createUmi("https://api.devnet.solana.com", "finalized")

let keyair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const myKeypairSigner = createSignerFromKeypair(umi, keyair);
umi.use(signerIdentity(myKeypairSigner));

// This instruction is used to create an Asset and add it to a Collection
(async () => {
    // Generate the Asset KeyPair
    const asset = generateSigner(umi)
    console.log("\nAsset Address: ", asset.publicKey.toString())

    // Pass and Fetch the Collection
    const collection = publicKey("CYKbtF2Y56QwQLYHUmpAPeiMJTz1DbBZGvXGgbB6VdNQ")
    const fetchedCollection = await fetchCollection(umi, collection);

    // Generate the Asset
    const tx = await create(umi, {
        name: 'My NFT',
        uri: 'https://example.com/my-nft.json',
        asset,
        collection: fetchedCollection,
    }).sendAndConfirm(umi)

    // Deserialize the Signature from the Transaction
    const signature = base58.deserialize(tx.signature)[0];
    console.log(`Asset added to the Collection: https://solana.fm/tx/${signature}?cluster=devnet-alpha`);
})();