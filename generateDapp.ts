import { execSync } from "child_process";
import chalk from "chalk";

const runCommand = (command) => {
  try {
    execSync(`${command}`, { stdio: "inherit" });
  } catch (e) {
    console.error("Failed to execute ${command}, e");
    return false;
  }
  return true;
};

export const generateDapp = async (opts) => {
  const repoName = opts.projectPath || "my-aptos-dapp";
  const repoAddr = "https://github.com/0xmaayan/aptos-todolist.git";
  const gitCheckoutCommand = `git clone ${repoAddr} ${repoName}`;
  const installDepsCommand = `cd ${repoName}/frontend && npm install`;
  const installRootDepsCommand = `cd ${repoName} && npm install`;

  // Clone the repo
  console.log("Cloning the the create-apt-dapp repo...");
  const checkedOut = runCommand(gitCheckoutCommand);
  if (!checkedOut) {
    console.error("Failed to clone the repo");
    process.exit(-1);
  } else {
    console.log("Cloned successfully");
  }

  // create .env file
  console.log("Creating .env file...");
  runCommand(`cd ${repoName} && touch .env`);
  const network = opts.network || "testnet";
  runCommand(`echo "REACT_APP_NETWORK=${network}" > ${repoName}/.env`);

  // Install dependencies
  console.log("Installing dependencies...");
  const installedDeps = runCommand(installDepsCommand);
  const installedRootDeps = runCommand(installRootDepsCommand);
  if (!installedDeps || !installedRootDeps) {
    console.error("Failed to install dependencies");
    process.exit(-1);
  }

  // Log next steps
  console.log("Success! You're ready to start building your dapp on Aptos.");

  console.log(chalk.bold("\nNext steps:") + "\n");
  console.log(
    chalk.green(`1. run [cd ${repoName}] to your dapp directory.`) + "\n"
  );
  console.log(
    chalk.green(`2. run [npm run move:init] to initialize a new CLI Profile.`) +
      "\n"
  );
  console.log(
    chalk.green(
      `3. run [npm run move:compile] to compile your move contract.`
    ) + "\n"
  );
  console.log(
    chalk.green(`4. run [npm run move:publish] to publish your contract.`) +
      "\n"
  );
  console.log(chalk.green(`run [npm start] to run your dapp.`) + "\n");
};
