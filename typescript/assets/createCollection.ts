import { generateSigner, createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { base58 } from '@metaplex-foundation/umi/serializers';
import { createCollection } from '@metaplex-foundation/mpl-core'

import wallet from "../wallet.json";

const umi = createUmi("https://api.devnet.solana.com", "finalized")

let keyair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const myKeypairSigner = createSignerFromKeypair(umi, keyair);
umi.use(signerIdentity(myKeypairSigner));

(async () => {
    // Generate the Collection KeyPair
    const collection = generateSigner(umi)
    console.log("\nCollection Address: ", collection.publicKey.toString())

    // Generate the collection
    const tx = await createCollection(umi, {
        collection: collection,
        name: 'My Collection',
        uri: 'https://example.com/my-collection.json',
    }).sendAndConfirm(umi)

    // Deserialize the Signature from the Transaction
    const signature = base58.deserialize(tx.signature)[0];
    console.log(`\nCollection Created: https://solana.fm/tx/${signature}?cluster=devnet-alpha`);
})();


/*

    CreateCollectionV1 Instruction:
    -----------------------------------
    Accounts:
    - collection: Signer;                           // The Asset KeyPair to initialize the Asset
    - authority?: Signer;                           // [?] The Authority signing for creation. Defaults to the Umi Authority if not present.
    - payer?: Signer;                               // [?] The Account paying for the storage fees. Defaults to the Umi Payer if not present.

    Data:
    - name: string;
    - uri: string;
    - plugins?: OptionOrNullable<Array<PluginAuthorityPairArgs>>;

*/

/*

     Additional Example:
    -----------------------------------
    - Create Collection With the Royalty Plugin:

        await createCollectionV1(umi, {
            collection: collectionSigner,
            name: 'My NFT',
            uri: 'https://example.com/my-nft.json',
            plugins: [
                {
                plugin: createPlugin(
                    {
                        type: 'Royalties',
                        data: {
                            basisPoints: 500,
                            creators: [
                                {
                                    address: generateSigner(umi).publicKey,
                                    percentage: 20,
                                },
                                {
                                    address: generateSigner(umi).publicKey,
                                    percentage: 80,
                                },
                            ],
                            ruleSet: ruleSet('None'), // Compatibility rule set
                        },
                    }
                ),
                authority: pluginAuthority("None"),
                },
            ],
        }).sendAndConfirm(umi)


*/
