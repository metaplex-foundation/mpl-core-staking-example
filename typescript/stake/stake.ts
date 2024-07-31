import { createSignerFromKeypair, signerIdentity, publicKey, transactionBuilder, Transaction } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { addPlugin, updatePlugin, fetchAsset } from '@metaplex-foundation/mpl-core'
import { base58 } from '@metaplex-foundation/umi/serializers';

import wallet from "../wallet.json";

const umi = createUmi("https://api.devnet.solana.com", "finalized")

let keyair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const myKeypairSigner = createSignerFromKeypair(umi, keyair);
umi.use(signerIdentity(myKeypairSigner));

(async () => {
    // Pass the Asset and Collection
    const asset = publicKey("6AWm5uyhmHQXygeJV7iVotjvs2gVZbDXaGUQ8YGVtnJo");
    const collection = publicKey("CYKbtF2Y56QwQLYHUmpAPeiMJTz1DbBZGvXGgbB6VdNQ")

    // Fetch the Asset Attributes
    const fetchedAsset = await fetchAsset(umi, asset);
    console.log("\nThis is the current state of your Asset Attribute Plugin: ", fetchedAsset.attributes);

    const currentTime = new Date().getTime().toString();

    let tx: Transaction;

    // Check if the Asset has an Attribute Plugin attached to it, if not, add it
    if (!fetchedAsset.attributes) {
        tx = await transactionBuilder().add(addPlugin(umi, {
            asset,
            collection,
            plugin: {
            type: "Attributes",
            attributeList: [
                { key: "staked", value: currentTime },
                { key: "stakedTime", value: "0" },
            ],
            },
        })).add(addPlugin(umi, {
            asset,
            collection,
            plugin: {
                type: "FreezeDelegate",
                frozen: true,
                authority: { type: "UpdateAuthority" }
            }
        })).buildAndSign(umi);
    } else {
        // If it is, fetch the Asset Attribute Plugin attributeList
        const assetAttribute = fetchedAsset.attributes.attributeList;
        // Check if the Asset is already been staked
        const isInitialized = assetAttribute.some(
            (attribute) => attribute.key === "staked" || attribute.key === "stakedTime"
        );

        // If it is, check if it is already staked and if not update the staked attribute
        if (isInitialized) {
            const stakedAttribute = assetAttribute.find(
                (attr) => attr.key === "staked"
            );

            if (stakedAttribute && stakedAttribute.value !== "0") {
                throw new Error("Asset is already staked");
            } else {
                assetAttribute.forEach((attr) => {
                    if (attr.key === "staked") {
                        attr.value = currentTime;
                    }
                });
            }
        } else {
            // If it is not, add the staked & stakedTime attribute
            assetAttribute.push({ key: "staked", value: currentTime });
            assetAttribute.push({ key: "stakedTime", value: "0" });
        }

        // Update the Asset Attribute Plugin and Add the FreezeDelegate Plugin
        tx = await transactionBuilder().add(updatePlugin(umi, {
            asset,
            collection,
            plugin: {
            type: "Attributes",
                attributeList: assetAttribute,
            },
        })).add(addPlugin(umi, {
            asset,
            collection,
            plugin: {
                type: "FreezeDelegate",
                frozen: true,
                authority: { type: "UpdateAuthority" }
            }
        })).buildAndSign(umi);
    }

    // Deserialize the Signature from the Transaction
    console.log(`Asset Staked: https://solana.fm/tx/${base58.deserialize(await umi.rpc.sendTransaction(tx))[0]}?cluster=devnet-alpha`);
})();