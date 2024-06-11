import { FC, FormEvent, useState } from "react";
import { truncateAddress } from "@/utils/truncateAddress";
import { Image } from "@/components/ui/image";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { clampNumber } from "@/utils/clampNumber";
import { Progress } from "@radix-ui/react-progress";
import { useMintData } from "../hooks/useMintData";
import Copy from "@/assets/icons/copy.svg";
import ExternalLink from "@/assets/icons/external-link.svg";
import { Socials } from "./Socials";
import { MODULE_ADDRESS, NETWORK } from "@/constants";
import {
  InputTransactionData,
  useWallet,
} from "@aptos-labs/wallet-adapter-react";
import { aptosClient } from "@/utils/aptosClient";
import { useQueryClient } from "@tanstack/react-query";

interface HeroSectionProps {}

export const HeroSection: React.FC<HeroSectionProps> = () => {
  const { data } = useMintData();
  const queryClient = useQueryClient();
  const { account, signAndSubmitTransaction } = useWallet();
  const [nftCount, setNftCount] = useState(1);

  if (!data) return null;
  const { collection, totalMinted, maxSupply } = data;

  const mintNft = async (e: FormEvent) => {
    e.preventDefault();
    if (!account) return;

    const transaction: InputTransactionData = {
      data: {
        function: `${MODULE_ADDRESS}::launchpad::batch_mint_nft`,
        functionArguments: [collection.collection_id, nftCount],
      },
    };
    const response = await signAndSubmitTransaction(transaction);
    await aptosClient().waitForTransaction({ transactionHash: response.hash });
    queryClient.invalidateQueries();
    setNftCount(1);
  };

  return (
    <section className="hero-container flex flex-col md:flex-row gap-6 px-6 max-w-screen-xl mx-auto w-full">
      <Image
        src={
          collection.cdn_asset_uris.cdn_image_uri ??
          collection.cdn_asset_uris.cdn_animation_uri
        }
        rounded
        className="basis-2/5"
      />
      <div className="basis-3/5 flex flex-col gap-4">
        <h1 className="title-md">{collection.collection_name}</h1>
        <Socials />
        <p className="body-sm">{collection.description}</p>
        <Card>
          <CardContent
            fullPadding
            className="flex flex-col md:flex-row gap-4 md:justify-between items-start md:items-center flex-wrap">
            <form onSubmit={mintNft} className="flex gap-4">
              <Input
                type="number"
                value={nftCount}
                onChange={(e) =>
                  setNftCount(parseInt(e.currentTarget.value, 10))
                }
              />
              <Button type="submit">Mint</Button>
            </form>

            <div className="flex flex-col gap-2">
              <p className="body-sm">
                {clampNumber(totalMinted)} / {clampNumber(maxSupply)} Minted
              </p>
              <Progress
                value={(totalMinted / maxSupply) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-x-2 items-center flex-wrap justify-between">
          <p className="whitespace-nowrap body-sm-semibold">
            Collection Address
          </p>

          <div className="flex gap-x-2">
            <AddressButton address={collection.collection_id} />
            <a
              className={buttonVariants({ variant: "link" })}
              target="_blank"
              href={`https://explorer.aptoslabs.com/account/${collection.collection_id}?network=${NETWORK}`}>
              View on Explorer <Image src={ExternalLink} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

const AddressButton: FC<{ address: string }> = ({ address }) => {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    if (copied) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <Button
      onClick={onCopy}
      className="whitespace-nowrap flex gap-1 px-0 py-0"
      variant="link">
      {copied ? (
        "Copied!"
      ) : (
        <>
          {truncateAddress(address)}
          <Image src={Copy} />
        </>
      )}
    </Button>
  );
};
