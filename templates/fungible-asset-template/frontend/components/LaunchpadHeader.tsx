import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";

export function LaunchpadHeader() {
  const location = useLocation();
  console.log(location.pathname);

  return (
    <div className="flex items-center justify-between px-6 py-2">
      <h1 className="font-bold leading-none tracking-tight md:text-2xl dark:text-white">
        Fungible Asset Launchpad{" "}
      </h1>
      <div>
        {location.pathname === "/create-asset" ? (
          <Link
            className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
            to={"/my-assets"}
          >
            My Assets
          </Link>
        ) : (
          <Link
            className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
            to={"/create-asset"}
          >
            Create Asset
          </Link>
        )}
        {location.pathname !== "/my-assets" && <WalletSelector />}
      </div>
    </div>
  );
}
