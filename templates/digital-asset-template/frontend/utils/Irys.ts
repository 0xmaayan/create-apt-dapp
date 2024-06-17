import { WebIrys } from "@irys/sdk";
import { aptosClient } from "./aptosClient";
import { WalletContextState } from "@aptos-labs/wallet-adapter-react";

const getWebIrys = async (aptosWallet: WalletContextState) => {
  const network =
    import.meta.env.VITE_APP_NETWORK === "testnet" ? "devnet" : "mainnet"; // Irys network
  const token = "aptos";
  const rpcUrl = import.meta.env.VITE_APP_NETWORK; // Aptos network "mainnet" || "testnet"
  const wallet = { rpcUrl: rpcUrl, name: "aptos", provider: aptosWallet };
  const webIrys = new WebIrys({ network, token, wallet });
  await webIrys.ready();
  return webIrys;
};

export const checkIfFund = async (
  aptosWallet: WalletContextState,
  files: File[]
) => {
  // 1. estimate the gas cost based on the data size https://docs.irys.xyz/developer-docs/irys-sdk/api/getPrice
  const webIrys = await getWebIrys(aptosWallet);
  const costToUpload = await webIrys.utils.estimateFolderPrice(
    files.map((f) => f.size)
  );
  // 2. check the wallet balance on the irys node: irys.getLoadedBalance()
  const irysBalance = await webIrys.getLoadedBalance();

  // 3. if balance is enough, then upload without funding
  if (irysBalance.toNumber() > costToUpload.toNumber()) {
    return true;
  }
  // 4. if balance is not enough,  check the payer balance
  const currentAccountAddress = await aptosWallet.account!.address;

  const currentAccountBalance = await aptosClient().view<[number]>({
    payload: {
      function: "0x1::coin::balance",
      typeArguments: ["0x1::aptos_coin::AptosCoin"],
      functionArguments: [currentAccountAddress],
    },
  });

  // 5. if payer balance > the amount based on the estimation, fund the irys node irys.fund, then upload
  if (currentAccountBalance[0] > costToUpload.toNumber()) {
    try {
      await fundNode(aptosWallet, costToUpload.toNumber());
      return true;
    } catch (error: any) {
      alert(`Error funding node ${error}`);
      return;
    }
  }
  // 6. if payer balance < the amount, replenish the payer balance*/
  return false;
};

export const fundNode = async (
  aptosWallet: WalletContextState,
  amount?: number
) => {
  const webIrys = await getWebIrys(aptosWallet);

  try {
    const fundTx = await webIrys.fund(amount ?? 1000000);
    console.log(
      `Successfully funded ${webIrys.utils.fromAtomic(fundTx.quantity)} ${
        webIrys.token
      }`
    );
    return true;
  } catch (e) {
    console.log("Error uploading data ", e);
    return false;
  }
};

export const uploadFile = async (
  aptosWallet: any,
  fileToUpload: File
): Promise<string> => {
  const webIrys = await getWebIrys(aptosWallet);
  try {
    const receipt = await webIrys.uploadFile(fileToUpload, { tags: [] });
    return `https://gateway.irys.xyz/${receipt.id}`;
  } catch (e: any) {
    console.log("Error uploading file ", e);
    throw new Error(e);
  }
};

export const uploadFolder = async (
  aptosWallet: WalletContextState,
  files: File[]
) => {
  const webIrys = await getWebIrys(aptosWallet);

  try {
    const receipt = await webIrys.uploadFolder(files); //returns the manifest ID

    console.log(
      `Files uploaded. Manifest Id=${receipt.manifestId} Receipt Id=${receipt.id} 
      access with: https://gateway.irys.xyz/${receipt.manifestId}/<image-name>`
    );
    return `https://gateway.irys.xyz/${receipt.manifestId}`;
  } catch (e: any) {
    console.log("Error uploading folder ", e);
    throw new Error(e);
  }
};
