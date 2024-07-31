import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";

import wallet from "../wallet.json";

const umi = createUmi("https://api.devnet.solana.com", "finalized")

let keyair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const myKeypairSigner = createSignerFromKeypair(umi, keyair);
umi.use(signerIdentity(myKeypairSigner)).use(irysUploader());

(async () => {

    const metadata = {
        name: "Core - Workshop NFT",
        symbol: "CORE",
        description: "This is an NFT we created during the workshop Core - NFTs on Solana.",
        image: "https://arweave.net/uarIGR800rO9r4z5vfdDePCYg0Z79qiholsGDJlwdbQ",
        attributes: [
            {
                trait_type: "Workshop",
                value: "1st ever Core NFT Workshop"
            },
        ],
        proprieties: {
            files: [
                {
                    type: "image/jpeg",
                    uri: "https://arweave.net/uarIGR800rO9r4z5vfdDePCYg0Z79qiholsGDJlwdbQ"
                }
            ]
        }
    }

    const nftUri = await umi.uploader.uploadJson(metadata);
    console.log("Your Uri:", nftUri);
})();