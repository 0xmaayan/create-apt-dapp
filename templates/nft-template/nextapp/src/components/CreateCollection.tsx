"use client";

import { WebIrys } from "@irys/sdk";
import { ABI } from "@/utils/abi_nft_launchpad";
import { humanReadableToOnChain } from "@/utils/math";
import { aptosClient } from "@/utils/aptos";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { useWalletClient } from "@thalalabs/surf/hooks";
import { useRef } from "react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import getReceipt from "@/utils/irys/getReceipt";
import { fundAndUpload } from "@/utils/irys/fundAndUpload";
import { AssetUploader } from "./AssetUploader";

type FileWrapper = {
  file: File;
  isUploaded: boolean;
  id: string;
  previewURL: string;
  loadingReceipt: boolean;
};

type Tag = {
  name: string;
  value: string;
};

export const CreateCollection = () => {
  const [maxSupply, setMaxSupply] = useState("1000");
  const [collectionName, setCollectionName] = useState("Test Collection Name");
  const [collectionDescription, setDescription] = useState(
    "Test Collection Description"
  );
  const [projectUri, setProjectUri] = useState(
    "https://github.com/aptos-labs/solana-to-aptos/tree/main/aptos/launchpad"
  );
  const [royaltyPercentage, setRoyaltyPercentage] = useState(10);
  const [preMintAmount, setPreMintAmount] = useState(5);

  const currentUnixTimestamp = Math.floor(Date.now() / 1000);

  const [allowlist, setAllowlist] = useState<`0x${string}`[]>([]);
  const [allowlistStartTime, setAllowlistStartTime] =
    useState(currentUnixTimestamp);
  const [allowlistEndTime, setAllowlistEndTime] = useState(
    currentUnixTimestamp + 150
  );
  const [allowlistMintLimitPerAddr, setAllowlistMintLimitPerAddr] = useState(2);
  const [allowlistMintFeePerNft, setAllowlistMintFeePerNft] = useState(10);
  const [publicMintStartTime, setPublicMintStartTime] = useState(
    currentUnixTimestamp + 210
  );
  const [publicMintEndTime, setPublicMintEndTime] = useState(
    currentUnixTimestamp + 600
  );
  const [publicMintLimitPerAddr, setPublicMintLimitPerAddr] = useState(1);
  const [publicMintFeePerNft, setPublicMintFeePerNft] = useState(100);

  const { client: walletClient } = useWalletClient();
  const aptosWallet = useWallet();

  // const [files, setFiles] = useState<FileWrapper[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  const [previewURL, setPreviewURL] = useState<string>();
  const [receipt, setReceipt] = useState<string>();
  const [txProcessing, setTxProcessing] = useState(false);

  const [uploadStatus, setUploadStatus] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);

  const onFilesAdded = async (files: File[]) => {
    setUploadStatus("Uploading...");
    try {
      const collectionFile = files.find(
        (file) => file.name === "collection.json"
      );
      const imageFiles = files.filter((file) =>
        file.webkitRelativePath.startsWith("images/")
      );
      const metadataFiles = files.filter((file) =>
        file.webkitRelativePath.startsWith("metadatas/")
      );

      //   // 1. Upload the collection image to Irys
      //   const collectionImageFile = files.find(
      //     (file) => file.webkitRelativePath === "collection-image.png"
      //   );
      //   const collectionImageUrl = await uploadToIrys(collectionImageFile);

      //   // 2. Update the collection.json file
      //   const collectionData = JSON.parse(await collectionFile.text());
      //   collectionData.image = collectionImageUrl;
      //   const updatedCollectionFile = new File(
      //     [JSON.stringify(collectionData)],
      //     "collection.json",
      //     { type: "application/json" }
      //   );
      //   const collectionJsonUrl = await uploadToIrys(updatedCollectionFile);

      //   // 3. Upload all NFT images to Irys
      //   const nftImageUrls = await Promise.all(imageFiles.map(uploadToIrys));

      //   // 4. Update all NFT metadata files
      //   const updatedMetadataFiles = await Promise.all(
      //     metadataFiles.map(async (file) => {
      //       const metadata = JSON.parse(await file.text());
      //       const imageFileName = file.name.replace("metadata.json", "image.png");
      //       const imageUrl = nftImageUrls.find((url) =>
      //         url.includes(imageFileName)
      //       );
      //       metadata.image = imageUrl;
      //       return new File([JSON.stringify(metadata)], file.name, {
      //         type: "application/json",
      //       });
      //     })
      //   );

      //   const metadataUrls = await Promise.all(
      //     updatedMetadataFiles.map(uploadToIrys)
      //   );

      setUploadStatus("Upload complete!");
    } catch (error) {
      console.error(error);
      setUploadStatus("Error uploading files");
    }
  };

  // const onFilesAdded = async (files) => {
  //   setStatus("Uploading...");
  //   try {
  //     const collectionFile = files.find(
  //       (file) => file.name === "collection.json"
  //     );
  //     const imageFiles = files.filter((file) =>
  //       file.path.startsWith("images/")
  //     );
  //     const metadataFiles = files.filter((file) =>
  //       file.path.startsWith("metadatas/")
  //     );

  //     // 1. Upload the collection image to Irys
  //     const collectionImageFile = files.find(
  //       (file) => file.path === "collection-image.png"
  //     );
  //     const collectionImageUrl = await uploadToIrys(collectionImageFile);

  //     // 2. Update the collection.json file
  //     const collectionData = JSON.parse(await collectionFile.text());
  //     collectionData.image = collectionImageUrl;
  //     const updatedCollectionFile = new File(
  //       [JSON.stringify(collectionData)],
  //       "collection.json",
  //       { type: "application/json" }
  //     );
  //     const collectionJsonUrl = await uploadToIrys(updatedCollectionFile);

  //     // 3. Upload all NFT images to Irys
  //     const nftImageUrls = await Promise.all(imageFiles.map(uploadToIrys));

  //     // 4. Update all NFT metadata files
  //     const updatedMetadataFiles = await Promise.all(
  //       metadataFiles.map(async (file) => {
  //         const metadata = JSON.parse(await file.text());
  //         const imageFileName = file.name.replace("metadata.json", "image.png");
  //         const imageUrl = nftImageUrls.find((url) =>
  //           url.includes(imageFileName)
  //         );
  //         metadata.image = imageUrl;
  //         return new File([JSON.stringify(metadata)], file.name, {
  //           type: "application/json",
  //         });
  //       })
  //     );

  //     const metadataUrls = await Promise.all(
  //       updatedMetadataFiles.map(uploadToIrys)
  //     );

  //     setStatus("Upload complete!");
  //   } catch (error) {
  //     console.error(error);
  //     setStatus("Error uploading files");
  //   }
  // };

  // const onDrop = useCallback(
  //   (acceptedFiles) => {
  //     onFilesAdded(acceptedFiles);
  //   },
  //   [onFilesAdded]
  // );

  // const { getRootProps, getInputProps, isDragActive } = useDropzone({
  //   onDrop,
  //   noClick: true,
  //   noKeyboard: true,
  //   // webkitdirectory: "true", // To allow folder selection
  // });

  const onFundIrys = async () => {
    const webIrys = new WebIrys({
      network: "devnet",
      token: "aptos",
      wallet: { rpcUrl: "testnet", name: "aptos", provider: aptosWallet },
    });
    await webIrys.ready();

    const irysAddr = webIrys.address;
    console.log(`Irys address: ${irysAddr}`);

    await webIrys.getBalance(irysAddr).then((balance) => {
      console.log(`Balance: ${balance}`);
    });

    try {
      const fundTx = await webIrys.fund(1000);
      console.log(
        `Successfully funded ${webIrys.utils.fromAtomic(fundTx.quantity)} ${
          webIrys.token
        }, tx: ${JSON.stringify(fundTx)}`
      );
    } catch (e) {
      console.log("Error uploading data ", e);
    }
  };

  const handleMultipleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = [];
    if (e.target.files) {
      for (let i = 0; i < e.target.files.length; i++) {
        files.push(e.target.files[i]);
      }
    }
    setFiles(files);
  };
  const onUploadToIrys = async (files: File[]) => {
    const webIrys = new WebIrys({
      network: "devnet",
      token: "aptos",
      wallet: { rpcUrl: "testnet", name: "aptos", provider: aptosWallet },
    });
    await webIrys.ready();

    try {
      const receipt = await webIrys.uploadFolder(files); //returns the manifest ID

      console.log(
        `Files uploaded. Manifest Id=${receipt.manifestId} Receipt Id=${
          receipt.id
        }
      access with: https://gateway.irys.xyz/${
        receipt.manifestId
      }/<image-name>, receipt: ${JSON.stringify(receipt)}`
      );
    } catch (e) {
      console.log("Error uploading file ", e);
    }
  };

  // const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   if (event.target.files) {
  //     const files = Array.from(event.target.files);
  //     const newUploadedFiles: FileWrapper[] = files.map((file) => ({
  //       file,
  //       isUploaded: false,
  //       id: "",
  //       previewURL: "",
  //       loadingReceipt: false,
  //     }));
  //     setFiles(newUploadedFiles);
  //   }
  // };

  // const resetFilesAndOpenFileDialog = useCallback(() => {
  //   setFiles([]);
  //   setReceipt("");
  //   setPreviewURL("");
  //   const input = document.querySelector(
  //     'input[type="file"]'
  //   ) as HTMLInputElement;
  //   if (input) {
  //     input.click();
  //   }
  // }, []);

  // const handleUpload = async () => {
  //   if (!files || files.length === 0) {
  //     console.log("Please select a file first");
  //     return;
  //   }
  //   setTxProcessing(true);

  //   const webIrys = new WebIrys({
  //     network: "devnet",
  //     token: "aptos",
  //     wallet: { rpcUrl: "testnet", name: "aptos", provider: aptosWallet },
  //   });
  //   await webIrys.ready();

  //   // If more than one file is selected, then all files are wrapped together and uploaded in a single tx
  //   if (files.length > 1) {
  //     try {
  //       // Remove the File objects from the FileWrapper objects
  //       const filesToUpload: File[] = files.map((file) => file.file);
  //       console.log("Multi-file upload");
  //       let manifestId = "";
  //       let receiptId = "";

  //       console.log("Standard upload");
  //       [manifestId, receiptId] = await fundAndUpload(
  //         webIrys,
  //         filesToUpload,
  //         []
  //       );

  //       console.log(
  //         `Upload success manifestId=${manifestId} receiptId=${receiptId}`
  //       );
  //       // Now that the upload is done, update the FileWrapper objects with the preview URL
  //       const updatedFiles = files.map((file) => ({
  //         ...file,
  //         id: receiptId,
  //         isUploaded: true,
  //         previewURL: manifestId + "/" + file.file.name,
  //       }));
  //       setFiles(updatedFiles);
  //     } catch (e) {
  //       console.log("Error on upload: ", e);
  //     }
  //   } else {
  //     console.log("Single file upload");
  //     // This occurs when exactly one file is selected
  //     try {
  //       for (const file of files) {
  //         const tags: Tag[] = [{ name: "Content-Type", value: file.file.type }];
  //         let uploadedTx = "";
  //         uploadedTx = await fundAndUpload(webIrys, file.file, tags);
  //         file.id = uploadedTx;
  //         file.isUploaded = true;
  //         file.previewURL = uploadedTx;
  //       }
  //     } catch (e) {
  //       console.log("Error on upload: ", e);
  //     }
  //   }
  //   setTxProcessing(false);
  // };

  // const showReceipt = async (fileIndex: number, receiptId: string) => {
  //   let updatedFiles = [...files];
  //   updatedFiles[fileIndex].loadingReceipt = true;
  //   setFiles(updatedFiles);
  //   try {
  //     const receipt = await getReceipt(receiptId);
  //     setReceipt(JSON.stringify(receipt));
  //     setPreviewURL(""); // Only show one or the other
  //   } catch (e) {
  //     console.log("Error fetching receipt: " + e);
  //   }
  //   // For some reason we need to reset updatedFiles, probably a React state timing thing.
  //   updatedFiles = [...files];
  //   updatedFiles[fileIndex].loadingReceipt = false;
  //   setFiles(updatedFiles);
  // };

  // // Display only the last selected file's preview.
  // const memoizedPreviewURL = useMemo(() => {
  //   if (previewURL) {
  //     return <UploadViewer previewURL={previewURL} checkEncrypted={false} />;
  //   }
  //   return null;
  // }, [previewURL]);

  // // Display only the receipt JSON when available.
  // const memoizedReceiptView = useMemo(() => {
  //   if (receipt && !previewURL) {
  //     return (
  //       <div className="w-full">
  //         <ReceiptJSONView data={receipt} />
  //       </div>
  //     );
  //   }
  //   return null;
  // }, [receipt, previewURL]);

  const onUpdateName = (name: string) => {
    setCollectionName(name);
  };

  const onUpdateDescription = (description: string) => {
    setDescription(description);
  };

  const onUpdateProjectUri = (uri: string) => {
    setProjectUri(uri);
  };

  const onCreate = async () => {
    if (!walletClient) {
      throw new Error("Wallet not connected");
    }
    if (!collectionName || !projectUri) {
      throw new Error("Invalid input");
    }
    const response = await walletClient.useABI(ABI).create_collection({
      type_arguments: [],
      arguments: [
        collectionDescription,
        collectionName,
        projectUri,
        maxSupply,
        royaltyPercentage,
        preMintAmount,
        allowlist,
        allowlistStartTime,
        allowlistEndTime,
        allowlistMintLimitPerAddr,
        allowlistMintFeePerNft,
        publicMintStartTime,
        publicMintEndTime,
        publicMintLimitPerAddr,
        publicMintFeePerNft,
      ],
    });
    await aptosClient.waitForTransaction({
      transactionHash: response.hash,
    });
  };

  return (
    walletClient && (
      <Box>
        <FormControl>
          <FormLabel>Max Supply</FormLabel>
          <Input
            type="number"
            onChange={(e) => setMaxSupply(e.target.value)}
            value={maxSupply}
          />
          <FormLabel>Royalty Percentage</FormLabel>
          <Input
            type="number"
            onChange={(e) => setRoyaltyPercentage(parseInt(e.target.value))}
            value={royaltyPercentage}
          />
          <FormLabel>Pre Mint Amount</FormLabel>
          <Input
            type="number"
            onChange={(e) => setPreMintAmount(parseInt(e.target.value))}
            value={preMintAmount}
          />
          <FormLabel>Public Mint Start Time</FormLabel>
          <Input
            type="number"
            onChange={(e) => setPublicMintStartTime(parseInt(e.target.value))}
            value={publicMintStartTime}
          />
          <FormLabel>Public Mint End Time</FormLabel>
          <Input
            type="number"
            onChange={(e) => setPublicMintEndTime(parseInt(e.target.value))}
            value={publicMintEndTime}
          />
          <FormLabel>Public Mint Limit Per Addr</FormLabel>
          <Input
            type="number"
            onChange={(e) =>
              setPublicMintLimitPerAddr(parseInt(e.target.value))
            }
            value={publicMintLimitPerAddr}
          />
          <FormLabel>Public Mint Fee Per NFT</FormLabel>
          <Input
            type="number"
            onChange={(e) => setPublicMintFeePerNft(parseInt(e.target.value))}
            value={publicMintFeePerNft}
          />
        </FormControl>
        <AssetUploader
          onUpdateName={onUpdateName}
          onUpdateDescription={onUpdateDescription}
          onUpdateProjectUri={onUpdateProjectUri}
        />
        <Button onClick={onCreate}>Create Collection</Button>
      </Box>
    )
  );
};
