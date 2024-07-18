import { validateProjectName } from "./utils/index.js";

/** workflow object containing all the text for the different prompt options */
export const workflowOptions = {
  projectName: {
    type: "text",
    name: "projectName",
    message: "Enter a new project name",
    validate: (value: string) => validateProjectName(value),
  },
  template: {
    type: "select",
    name: "template",
    message: "Choose how to start",
    choices: [
      {
        title: "Boilerplate Template",
        value: {
          path: "boilerplate-template",
          name: "Boilerplate Template",
          doc: "https://aptos.dev/en/build/create-aptos-dapp/templates/boilerplate",
        },
        description: "A Boilerplate template to start an Aptos dapp with",
      },
      {
        title: "NFT minting dapp",
        value: {
          path: "nft-minting-dapp-template",
          name: "NFT minting dapp",
          doc: "https://aptos.dev/en/build/create-aptos-dapp/templates/nft-minting-dapp",
        },
        description:
          "A production ready template to create an NFT collection minting dapp",
      },
      {
        title: "Token minting dapp",
        value: {
          path: "token-minting-dapp-template",
          name: "Token minting dapp",
          doc: "https://aptos.dev/en/build/create-aptos-dapp/templates/token-minting-dapp",
        },
        description:
          "A production ready template to create your own token minting dapp",
      },
    ],
    initial: 0,
  },
  network: {
    type: "select",
    name: "network",
    message: "Choose your network",
    choices(prev) {
      if (prev.path === "boilerplate-template") {
        return [
          { title: "Mainnet", value: "mainnet" },
          { title: "Testnet", value: "testnet" },
          { title: "Devnet", value: "devnet" },
        ];
      }
      return [
        { title: "Mainnet", value: "mainnet" },
        { title: "Testnet", value: "testnet" },
      ];
    },
    initial: 0,
    hint: "- You can change this later",
  },
  analytics: {
    type: "confirm",
    name: "telemetry",
    message: "Help us improve create-aptos-dapp by collection anonymous data",
    initial: true,
  },
};
