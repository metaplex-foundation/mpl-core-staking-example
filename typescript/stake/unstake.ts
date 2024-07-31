import { createSignerFromKeypair, signerIdentity, publicKey, transactionBuilder, Transaction} from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { updatePlugin, fetchAsset, removePlugin } from '@metaplex-foundation/mpl-core'
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

    let tx: Transaction;

    // Fetch the Asset Attributes
    const fetchedAsset = await fetchAsset(umi, asset);
    console.log("This is the current state of your Asset Attribute Plugin", fetchedAsset.attributes);

    // If there is no attribute plugin attached to the asset, throw an error
    if (!fetchedAsset.attributes) {
      throw new Error(
        "Asset has no Attribute Plugin attached to it. Please go through the stake instruction before."
      );
    }
    
    const assetAttribute = fetchedAsset.attributes.attributeList;
    // Check if the asset has a stakedTime attribute attached to it, if not throw an error
    const stakedTimeAttribute = assetAttribute.find((attr) => attr.key === "stakedTime");
    if (!stakedTimeAttribute) {
      throw new Error(
        "Asset has no stakedTime attribute attached to it. Please go through the stake instruction before."
      );
    }

    // Check if the asset has a staked attribute attached to it, if not throw an error
    const stakedAttribute = assetAttribute.find((attr) => attr.key === "staked");
    if (!stakedAttribute) {
      throw new Error(
        "Asset has no staked attribute attached to it. Please go through the stake instruction before."
      );
    }

    // Check if the asset is already staked (!0), if not throw an error.
    if (stakedAttribute.value === "0") {
      throw new Error("Asset is not staked");
    } else {
      const stakedTimeValue = parseInt(stakedTimeAttribute.value);
      const stakedValue = parseInt(stakedAttribute.value);
      const elapsedTime = new Date().getTime() - stakedValue;

      // Update the stakedTime attribute to the new value and the staked attribute to 0
      assetAttribute.forEach((attr) => {
        if (attr.key === "stakedTime") {
          attr.value = (stakedTimeValue + elapsedTime).toString();
        }
        if (attr.key === "staked") {
          attr.value = "0";
        }
      });
    }

    // Update the Asset Attribute Plugin with the new attributeList
    // then Update the Asset FreezeDelegate Plugin to unfreeze the asset
    // and then Remove the FreezeDelegate Plugin from the asset
    tx = await transactionBuilder().add(updatePlugin(umi, {
      asset,
      collection,
      plugin: {
        type: "Attributes",
        attributeList: assetAttribute,
      },
    })).add(updatePlugin(umi, {
      asset,
      collection,
      plugin: {
        type: "FreezeDelegate",
        frozen: false,
      },
    })).add(removePlugin(umi, {
      asset,
      collection,
      plugin: {
        type: "FreezeDelegate",
      },
    })).buildAndSign(umi);

     // Deserialize the Signature from the Transaction
     console.log(`Asset Unstaked: https://solana.fm/tx/${base58.deserialize(await umi.rpc.sendTransaction(tx))[0]}?cluster=devnet-alpha`);
})();