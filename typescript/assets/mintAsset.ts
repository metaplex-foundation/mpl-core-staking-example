import { generateSigner, percentAmount, createSignerFromKeypair, signerIdentity, publicKey } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createPlugin, createV1, pluginAuthority, ruleSet, fetchAssetV1 } from '@metaplex-foundation/mpl-core'
import { base58 } from '@metaplex-foundation/umi/serializers';

import wallet from "/Users/leo/.config/solana/id.json";

const umi = createUmi("http://127.0.0.1:8899", "finalized")

let keyair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const myKeypairSigner = createSignerFromKeypair(umi, keyair);
umi.use(signerIdentity(myKeypairSigner));

(async () => {

    // Generate the Asset KeyPair
    const asset = generateSigner(umi);
    console.log("\nAsset Address: ", asset.publicKey.toString());

    // Generate the Asset
    const tx = await createV1(umi, {
        name: 'My NFT',
        uri: 'https://example.com/my-nft.json',
        asset: asset,
    }).sendAndConfirm(umi, { send: { skipPreflight: true } });

    // Deserialize the Signature from the Transaction
    const signature = base58.deserialize(tx.signature)[0];
    console.log(`\nAsset Created: https://solana.fm/tx/${signature}?cluster=devnet-alpha`);
})();

/*

    CreateV1 Instruction:
    -----------------------------------
    Accounts:
    - asset: Signer;                                    // The Asset KeyPair to initialize the Asset
    - collection?: PublicKey | Pda;                     // [?] The Collection to which the Asset belongs.
    - authority?: Signer;                               // [?] The Authority signing for creation. Defaults to the Umi Authority if not present.
    - payer?: Signer;                                   // [?] The Account paying for the storage fees. Defaults to the Umi Payer if not present.
    - owner?: PublicKey | Pda;                          // [?] The Owner of the new Asset. Defaults to the Authority if not present. Can be used to mint something directly to a user.
    - updateAuthority?: PublicKey | Pda;                // [?] The Authority on the new Asset. Defaults to the Authority if not present.

    Data:
    - name: string;
    - uri: string;
    - plugins?: OptionOrNullable<Array<PluginAuthorityPairArgs>>;

*/

/*

    Additional Example:
    -----------------------------------
    - Create Asset With the Royalty Plugin:

        await createV1(umi, {
            asset: assetSigner,
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
                ),å
                authority: pluginAuthority("None"),
                },
            ],
        }).sendAndConfirm(umi)

*/

